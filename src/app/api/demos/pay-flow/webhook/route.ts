import { NextResponse } from "next/server";

import { handleStripeWebhook } from "@/features/pay-flow/lib/handle-stripe-webhook";

export const runtime = "nodejs";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Méthode non autorisée." }, { status: 405 });

export const GET = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  const result = handleStripeWebhook(rawBody, signature);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ received: true, type: result.type });
}
