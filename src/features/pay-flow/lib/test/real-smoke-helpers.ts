import fs from "node:fs";
import path from "node:path";

import type Stripe from "stripe";

import {
  getStripe,
  getStripeWebhookSecret,
} from "@/features/pay-flow/lib/stripe-client";

export function loadPayFlowEnv(): void {
  for (const name of [".env", ".env.local"] as const) {
    const file = path.join(process.cwd(), name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

export function canRunPayFlowRealSmoke(): boolean {
  loadPayFlowEnv();
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  return secret.startsWith("sk_test_") && webhook.length > 0;
}

export function signStripeWebhookPayload(payload: string): string {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET manquant.");
  }
  return getStripe().webhooks.generateTestHeaderString({
    payload,
    secret,
  });
}

export function buildCheckoutSessionEvent(
  type: "checkout.session.completed" | "checkout.session.expired",
  sessionId: string,
): string {
  const event = {
    id: `evt_test_pay_flow_${Date.now()}`,
    object: "event",
    api_version: null,
    created: Math.floor(Date.now() / 1000),
    type,
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
      },
    },
  };
  return JSON.stringify(event);
}

export async function expireOpenCheckoutSession(
  sessionId: string,
): Promise<void> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === "open") {
    await stripe.checkout.sessions.expire(sessionId);
  }
}

export type CreatedSmokeSession = {
  sessionId: string;
  url: string;
};

export async function cleanupSmokeSessions(
  sessionIds: string[],
): Promise<void> {
  await Promise.allSettled(
    sessionIds.map((id) => expireOpenCheckoutSession(id)),
  );
}

export type StripeCheckoutSession = Stripe.Checkout.Session;
