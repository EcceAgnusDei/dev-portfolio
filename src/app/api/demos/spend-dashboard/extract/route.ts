import { NextResponse } from "next/server";

import {
  checkRateLimit,
  getClientIp,
} from "@/features/pixel-ai/lib/rate-limit-ip";
import { formatFileSize } from "@/features/spend-dashboard/lib/format-invoice";
import { geminiInvoiceExtractJson } from "@/features/spend-dashboard/lib/gemini-invoice-extract-llm";
import { parseInvoiceExtractionJson } from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import {
  SPEND_DASHBOARD_ACCEPTED_MIME_TYPES,
  SPEND_DASHBOARD_MAX_FILE_BYTES,
  SPEND_DASHBOARD_RATE_LIMIT_MAX,
  SPEND_DASHBOARD_RATE_LIMIT_WINDOW_MS,
  type SpendDashboardAcceptedMime,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";

export const runtime = "nodejs";

const ACCEPTED_MIME = new Set<string>(SPEND_DASHBOARD_ACCEPTED_MIME_TYPES);

function parseRateLimitMax(): number {
  const raw = process.env.SPEND_DASHBOARD_RATE_LIMIT_MAX?.trim();
  if (!raw) return SPEND_DASHBOARD_RATE_LIMIT_MAX;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : SPEND_DASHBOARD_RATE_LIMIT_MAX;
}

function parseRateLimitWindowMs(): number {
  const raw = process.env.SPEND_DASHBOARD_RATE_LIMIT_WINDOW_MS?.trim();
  if (!raw) return SPEND_DASHBOARD_RATE_LIMIT_WINDOW_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : SPEND_DASHBOARD_RATE_LIMIT_WINDOW_MS;
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "La requête n'a pu être envoyée." },
      { status: 400 },
    );
  }

  const entry = formData.get("file");
  if (!(entry instanceof File) || entry.size === 0) {
    return NextResponse.json(
      { error: "Aucun fichier fourni." },
      { status: 400 },
    );
  }

  if (!ACCEPTED_MIME.has(entry.type)) {
    return NextResponse.json(
      {
        error:
          "Format non pris en charge. Utilisez une image (JPEG, PNG, WebP) ou un PDF.",
      },
      { status: 400 },
    );
  }

  if (entry.size > SPEND_DASHBOARD_MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `Fichier trop volumineux (max. ${formatFileSize(SPEND_DASHBOARD_MAX_FILE_BYTES)}).`,
      },
      { status: 400 },
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return NextResponse.json({ error: "IA indisponible." }, { status: 503 });
  }

  const mimeType = entry.type as SpendDashboardAcceptedMime;
  const bytes = new Uint8Array(await entry.arrayBuffer());

  let extractionJson: string;
  try {
    extractionJson = await geminiInvoiceExtractJson(geminiKey, {
      bytes,
      mimeType,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "Le service IA a échoué. Réessayez plus tard.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const parsed = parseInvoiceExtractionJson(extractionJson);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "L'IA a répondu de manière inattendue." },
      { status: 502 },
    );
  }

  return NextResponse.json({ invoice: parsed.invoice });
}
