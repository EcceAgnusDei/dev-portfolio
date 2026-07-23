import type { ResolvedCart } from "@/features/pay-flow/lib/catalog";
import {
  getPayFlowSiteUrl,
  PAY_FLOW_CURRENCY,
} from "@/features/pay-flow/lib/pay-flow-config";
import { createPendingOrder } from "@/features/pay-flow/lib/order-store";
import { getStripe } from "@/features/pay-flow/lib/stripe-client";

export type CreateCheckoutSessionResult = {
  sessionId: string;
  url: string;
};

export async function createCheckoutSession(
  cart: ResolvedCart,
): Promise<CreateCheckoutSessionResult> {
  const siteUrl = getPayFlowSiteUrl();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: cart.lines.map((line) => ({
      quantity: line.qty,
      price_data: {
        currency: PAY_FLOW_CURRENCY,
        unit_amount: line.unitAmountCents,
        product_data: {
          name: line.name,
        },
      },
    })),
    success_url: `${siteUrl}/demos/pay-flow?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/demos/pay-flow?status=cancel`,
    metadata: {
      source: "pay-flow",
      totalCents: String(cart.totalCents),
    },
  });

  if (!session.url) {
    throw new Error("Stripe n'a pas renvoyé d'URL de checkout.");
  }

  createPendingOrder({
    sessionId: session.id,
    lines: cart.lines,
    totalCents: cart.totalCents,
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}
