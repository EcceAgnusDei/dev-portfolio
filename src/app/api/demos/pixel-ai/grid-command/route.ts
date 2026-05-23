import { NextResponse } from "next/server";
import { z } from "zod";

import { geminiPixelGridStateJson } from "@/features/pixel-ai/lib/gemini-pixel-grid-llm";
import { parseAndValidateGridAiPixelsJson } from "@/features/pixel-ai/lib/grid-state-schema";
import {
  PIXEL_AI_PROMPT_MAX_LENGTH,
  PIXEL_AI_RATE_LIMIT_MAX,
  PIXEL_AI_RATE_LIMIT_WINDOW_MS,
} from "@/features/pixel-ai/lib/pixel-ai-config";
import {
  checkRateLimit,
  getClientIp,
} from "@/features/pixel-ai/lib/rate-limit-ip";

export const runtime = "nodejs";

const gridCoordSchema = z.object({
  x: z.number().int().min(1),
  y: z.number().int().min(1),
});

const postBodySchema = z.object({
  prompt: z
    .string()
    .min(1, "Le prompt est vide.")
    .max(
      PIXEL_AI_PROMPT_MAX_LENGTH,
      `Le prompt ne peut pas dépasser ${PIXEL_AI_PROMPT_MAX_LENGTH.toLocaleString("fr-FR")} caractères.`,
    ),
  gridSize: z.object({
    x: z.number().int(),
    y: z.number().int(),
  }),
  pixels: z.array(gridCoordSchema),
});

function parseRateLimitMax(): number {
  const raw = process.env.PIXEL_AI_RATE_LIMIT_MAX?.trim();
  if (!raw) return PIXEL_AI_RATE_LIMIT_MAX;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : PIXEL_AI_RATE_LIMIT_MAX;
}

function parseRateLimitWindowMs(): number {
  const raw = process.env.PIXEL_AI_RATE_LIMIT_WINDOW_MS?.trim();
  if (!raw) return PIXEL_AI_RATE_LIMIT_WINDOW_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : PIXEL_AI_RATE_LIMIT_WINDOW_MS;
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
      { error: "La requête n'a pu être envoyée." }, // Corps JSON invalide.
      { status: 400 },
    );
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La requête n'a pu être envoyée." }, // Corps de requête non conforme.
      { status: 400 },
    );
  }

  const { prompt, gridSize, pixels } = parsed.data;

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return NextResponse.json(
      {
        error: "Commande IA indisponible", // La clé Gemini (GEMINI_API_KEY) n’est pas configurée sur le serveur.
      },
      { status: 503 },
    );
  }

  let stateJson: string;
  try {
    stateJson = await geminiPixelGridStateJson(
      geminiKey,
      prompt,
      gridSize,
      pixels,
    );
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "Le service IA a échoué. Réessayez plus tard.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const state = parseAndValidateGridAiPixelsJson(stateJson);
  if (!state.ok) {
    return NextResponse.json(
      { error: "L'IA a répondu de manière inattendue." }, // Réponse IA non conforme.
      { status: 500 },
    );
  }

  return NextResponse.json({ pixels: state.pixels });
}
