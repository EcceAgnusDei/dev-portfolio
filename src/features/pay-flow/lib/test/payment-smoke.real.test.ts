import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { resolveCartLines } from "@/features/pay-flow/lib/catalog";
import { createCheckoutSession } from "@/features/pay-flow/lib/create-checkout-session";
import { getOrderStatus } from "@/features/pay-flow/lib/get-order-status";
import { handleStripeWebhook } from "@/features/pay-flow/lib/handle-stripe-webhook";
import {
  clearOrderStore,
  getOrder,
} from "@/features/pay-flow/lib/order-store";
import { PAY_FLOW_CURRENCY } from "@/features/pay-flow/lib/pay-flow-config";
import { getStripe } from "@/features/pay-flow/lib/stripe-client";
import {
  buildCheckoutSessionEvent,
  canRunPayFlowRealSmoke,
  cleanupSmokeSessions,
  signStripeWebhookPayload,
} from "@/features/pay-flow/lib/test/real-smoke-helpers";

const runReal = canRunPayFlowRealSmoke();
const createdSessionIds: string[] = [];

describe.skipIf(!runReal)("smoke réel: Pay Flow × Stripe test", () => {
  beforeAll(() => {
    if (!runReal) return;
  });

  beforeEach(() => {
    clearOrderStore();
  });

  afterAll(async () => {
    await cleanupSmokeSessions(createdSessionIds);
  });

  it("panier → session Stripe → webhook paid → status paid", async () => {
    const cart = resolveCartLines([
      { productId: "buste-socrate", qty: 1 },
      { productId: "buste-seneque", qty: 2 },
    ]);

    const session = await createCheckoutSession(cart);
    createdSessionIds.push(session.sessionId);

    expect(session.url).toMatch(/^https:\/\//);
    expect(getOrder(session.sessionId)?.status).toBe("pending");

    const remote = await getStripe().checkout.sessions.retrieve(
      session.sessionId,
    );
    expect(remote.status).toBe("open");
    expect(remote.amount_total).toBe(cart.totalCents);
    expect(remote.currency).toBe(PAY_FLOW_CURRENCY);
    expect(remote.metadata?.source).toBe("pay-flow");
    expect(remote.metadata?.totalCents).toBe(String(cart.totalCents));

    const payload = buildCheckoutSessionEvent(
      "checkout.session.completed",
      session.sessionId,
    );
    const signature = signStripeWebhookPayload(payload);
    const webhook = handleStripeWebhook(payload, signature);

    expect(webhook).toEqual({
      ok: true,
      type: "checkout.session.completed",
    });

    const status = getOrderStatus(session.sessionId);
    expect(status).toMatchObject({
      status: "paid",
      sessionId: session.sessionId,
      totalCents: cart.totalCents,
      lines: cart.lines,
    });
    if (status.status === "paid") {
      expect(status.paidAt).toEqual(expect.any(Number));
    }
  });

  it("panier → session Stripe → expire API → webhook expired → status expired", async () => {
    const cart = resolveCartLines([
      { productId: "buste-aristote", qty: 1 },
    ]);

    const session = await createCheckoutSession(cart);
    createdSessionIds.push(session.sessionId);

    expect(getOrder(session.sessionId)?.status).toBe("pending");

    await getStripe().checkout.sessions.expire(session.sessionId);
    const remote = await getStripe().checkout.sessions.retrieve(
      session.sessionId,
    );
    expect(remote.status).toBe("expired");

    const payload = buildCheckoutSessionEvent(
      "checkout.session.expired",
      session.sessionId,
    );
    const signature = signStripeWebhookPayload(payload);
    const webhook = handleStripeWebhook(payload, signature);

    expect(webhook).toEqual({
      ok: true,
      type: "checkout.session.expired",
    });
    expect(getOrderStatus(session.sessionId)).toMatchObject({
      status: "expired",
      sessionId: session.sessionId,
      totalCents: cart.totalCents,
    });
  });

  it("rejette un webhook avec signature invalide", async () => {
    const cart = resolveCartLines([
      { productId: "buste-seneque", qty: 1 },
    ]);
    const session = await createCheckoutSession(cart);
    createdSessionIds.push(session.sessionId);

    const payload = buildCheckoutSessionEvent(
      "checkout.session.completed",
      session.sessionId,
    );
    const webhook = handleStripeWebhook(payload, "t=1,v1=invalid");

    expect(webhook).toEqual({
      ok: false,
      error: "Signature Stripe invalide.",
      status: 400,
    });
    expect(getOrder(session.sessionId)?.status).toBe("pending");
  });
});
