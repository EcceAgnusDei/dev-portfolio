import type Stripe from "stripe";

import {
  markOrderExpired,
  markOrderPaid,
} from "@/features/pay-flow/lib/order-store";
import {
  getStripe,
  getStripeWebhookSecret,
} from "@/features/pay-flow/lib/stripe-client";

export type HandleStripeWebhookResult =
  | { ok: true; type: string }
  | { ok: false; error: string; status: 400 | 503 };

export function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
): HandleStripeWebhookResult {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return {
      ok: false,
      error: "Webhook indisponible.",
      status: 503,
    };
  }

  if (!signature) {
    return {
      ok: false,
      error: "Signature Stripe manquante.",
      status: 400,
    };
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch {
    return {
      ok: false,
      error: "Signature Stripe invalide.",
      status: 400,
    };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.id) {
      markOrderPaid(session.id);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.id) {
      markOrderExpired(session.id);
    }
  }

  return { ok: true, type: event.type };
}
