import { NextResponse } from "next/server";
import { z } from "zod";

import { applyVectorAiOps } from "@/features/vector-ai/lib/ai/apply-ops";
import { parseVectorAiOpsJson } from "@/features/vector-ai/lib/ai/codec/parse-response";
import { geminiVectorAiOps } from "@/features/vector-ai/lib/ai/gemini-vector-ai-llm";
import {
  VECTOR_AI_PREVIEW_PNG_MAX_BASE64_LENGTH,
  VECTOR_AI_PROMPT_MAX_LENGTH,
  VECTOR_AI_RATE_LIMIT_MAX,
  VECTOR_AI_RATE_LIMIT_WINDOW_MS,
} from "@/features/vector-ai/lib/ai/config";
import { vectorDocSchema } from "@/features/vector-ai/lib/document/schema";
import {
  checkRateLimit,
  getClientIp,
} from "@/features/pixel-ai/lib/rate-limit-ip";

export const runtime = "nodejs";

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

function isValidBase64(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) return false;
  if (!BASE64_RE.test(value)) return false;
  try {
    Buffer.from(value, "base64");
    return true;
  } catch {
    return false;
  }
}

const previewPngSchema = z.object({
  base64: z
    .string()
    .max(VECTOR_AI_PREVIEW_PNG_MAX_BASE64_LENGTH)
    .refine(isValidBase64, "Aperçu PNG invalide."),
  mimeType: z.literal("image/png"),
});

const postBodySchema = z.object({
  prompt: z
    .string()
    .min(1, "Le prompt est vide.")
    .max(
      VECTOR_AI_PROMPT_MAX_LENGTH,
      `Le prompt ne peut pas dépasser ${VECTOR_AI_PROMPT_MAX_LENGTH.toLocaleString("fr-FR")} caractères.`,
    ),
  doc: vectorDocSchema,
  previewPng: previewPngSchema.optional(),
});

function parseRateLimitMax(): number {
  const raw = process.env.VECTOR_AI_RATE_LIMIT_MAX?.trim();
  if (!raw) return VECTOR_AI_RATE_LIMIT_MAX;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : VECTOR_AI_RATE_LIMIT_MAX;
}

function parseRateLimitWindowMs(): number {
  const raw = process.env.VECTOR_AI_RATE_LIMIT_WINDOW_MS?.trim();
  if (!raw) return VECTOR_AI_RATE_LIMIT_WINDOW_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : VECTOR_AI_RATE_LIMIT_WINDOW_MS;
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

  const { prompt, doc, previewPng } = parsed.data;

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return NextResponse.json(
      {
        error: "Commande IA indisponible",
      },
      { status: 503 },
    );
  }

  let opsJson: string;
  try {
    opsJson = await geminiVectorAiOps(geminiKey, prompt, doc, previewPng);
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "Le service IA a échoué. Réessayez plus tard.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const parsedOps = parseVectorAiOpsJson(opsJson);
  if (!parsedOps.ok) {
    return NextResponse.json({ error: parsedOps.error }, { status: 500 });
  }

  const applied = applyVectorAiOps(doc, parsedOps.ops);
  if (!applied.ok) {
    return NextResponse.json({ error: applied.error }, { status: 500 });
  }

  return NextResponse.json({ doc: applied.doc });
}
