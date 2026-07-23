import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrderStatus } from "@/features/pay-flow/lib/get-order-status";

export const runtime = "nodejs";

const sessionIdSchema = z
  .string()
  .min(1, "session_id manquant.")
  .max(200, "session_id invalide.");

const methodNotAllowed = () =>
  NextResponse.json({ error: "Méthode non autorisée." }, { status: 405 });

export const POST = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const parsed = sessionIdSchema.safeParse(sessionId);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètre session_id manquant ou invalide." },
      { status: 400 },
    );
  }

  return NextResponse.json(getOrderStatus(parsed.data));
}
