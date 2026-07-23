import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ResolveCartError,
  cartLineInputSchema,
  resolveCartLines,
} from "@/features/pay-flow/lib/catalog";
import { createCheckoutSession } from "@/features/pay-flow/lib/create-checkout-session";
import {
  PAY_FLOW_RATE_LIMIT_MAX,
  PAY_FLOW_RATE_LIMIT_WINDOW_MS,
} from "@/features/pay-flow/lib/pay-flow-config";
import { getStripeSecretKey } from "@/features/pay-flow/lib/stripe-client";
import {
  checkRateLimit,
  getClientIp,
} from "@/features/pixel-ai/lib/rate-limit-ip";

export const runtime = "nodejs";

const postBodySchema = z.object({
  lines: z.array(cartLineInputSchema).min(1, "Le panier est vide."),
});

function parseRateLimitMax(): number {
  const raw = process.env.PAY_FLOW_RATE_LIMIT_MAX?.trim();
  if (!raw) return PAY_FLOW_RATE_LIMIT_MAX;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : PAY_FLOW_RATE_LIMIT_MAX;
}

function parseRateLimitWindowMs(): number {
  const raw = process.env.PAY_FLOW_RATE_LIMIT_WINDOW_MS?.trim();
  if (!raw) return PAY_FLOW_RATE_LIMIT_WINDOW_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : PAY_FLOW_RATE_LIMIT_WINDOW_MS;
}

const methodNotAllowed = () =>
  NextResponse.json({ error: "Méthode non autorisée." }, { status: 405 });

export const GET = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(
    ip,
    parseRateLimitMax(),
    parseRateLimitWindowMs(),
  );
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `Trop de requêtes. Réessayez dans ${rate.retryAfterSec} s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  if (!getStripeSecretKey()) {
    return NextResponse.json(
      { error: "Paiement indisponible." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "La requête n'a pu être envoyée." },
      { status: 400 },
    );
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La requête n'a pu être envoyée." },
      { status: 400 },
    );
  }

  let cart;
  try {
    cart = resolveCartLines(parsed.data.lines);
  } catch (err) {
    if (err instanceof ResolveCartError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Panier invalide." },
      { status: 400 },
    );
  }

  try {
    const session = await createCheckoutSession(cart);
    return NextResponse.json({
      url: session.url,
      sessionId: session.sessionId,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "La session de paiement n'a pas pu être créée.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
