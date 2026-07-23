import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || null;
}

export function getStripeWebhookSecret(): string | null {
  const key = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return key || null;
}

export function getStripe(): Stripe {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquante.");
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}
