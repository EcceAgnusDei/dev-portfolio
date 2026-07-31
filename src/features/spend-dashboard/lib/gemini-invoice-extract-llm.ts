import { FinishReason, GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";

import {
  SPEND_DASHBOARD_DEFAULT_LLM_MODEL,
  SPEND_DASHBOARD_INVOICE_CATEGORIES,
  SPEND_DASHBOARD_MAX_OUTPUT_TOKENS,
  type SpendDashboardAcceptedMime,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";

const CATEGORIES = SPEND_DASHBOARD_INVOICE_CATEGORIES.join(", ");

const SYSTEM_INSTRUCTION = `Tu extrais les informations d'une facture ou d'un reçu (souvent français) pour un outil de suivi de dépenses.

Tu reçois un document (image ou PDF). Tu réponds par UN SEUL objet JSON, sans markdown, sans texte avant ou après.

Format obligatoire :
{
  "vendor": string,
  "invoiceDate": "YYYY-MM-DD" | null,
  "invoiceNumber": string | null,
  "currency": "EUR" | autre code ISO 4217 en majuscules,
  "amountHtCents": number | null,
  "amountTvaCents": number | null,
  "amountTtcCents": number | null,
  "category": one of [${CATEGORIES}],
  "confidence": "high" | "medium" | "low"
}

Règles :
- Les montants sont en centimes entiers (ex. 50,00 € → 5000).
- amountTtcCents : extrais uniquement le total TTC / net à payer / grand total indiqué sur la facture (souvent en bas).
- amountHtCents / amountTvaCents : prends les totaux HT et TVA du document s'ils sont affichés clairement ; sinon null.
- amountTtcCents, amountHtCents, amountTvaCents et invoiceDate sont à null s'ils sont absents ou illisibles.
- invoiceNumber à null s'il est absent ou illisible.
- si la devise détèctée n'est pas €, mets confidence à "low".
- category : choisis la plus proche parmi la liste pour l'ensemble de la facture ; "other" si aucune ne convient.
- confidence : "high" si les champs clés sont clairs, "medium" si partiels, "low" si le document est flou, ambigu ou hors sujet.
- N'invente jamais de date, de montant, de n° de facture ni de fournisseur.
`;

function resolveModelName(): string {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  return fromEnv && fromEnv.length > 0
    ? fromEnv
    : SPEND_DASHBOARD_DEFAULT_LLM_MODEL;
}

function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
}

type GeminiResponseMeta = {
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
};

function geminiErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) {
      return o.message.trim();
    }
    const nested = o.error;
    if (nested && typeof nested === "object") {
      const msg = (nested as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
  }
  return "Erreur inconnue.";
}

function geminiErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const o = err as Record<string, unknown>;
  if (typeof o.status === "number") return o.status;
  if (typeof o.statusCode === "number") return o.statusCode;
  return undefined;
}

function parseRetryDelaySeconds(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const o = err as Record<string, unknown>;
  const details = o.errorDetails;
  if (!Array.isArray(details)) return undefined;

  for (const item of details) {
    if (!item || typeof item !== "object") continue;
    const d = item as Record<string, unknown>;
    const t = d["@type"];
    if (typeof t !== "string" || !t.includes("RetryInfo")) continue;
    const raw = d.retryDelay;
    if (typeof raw !== "string") continue;
    const m = raw.trim().match(/^(\d+(?:\.\d+)?)s$/i);
    if (!m) continue;
    const n = Number.parseFloat(m[1]!);
    if (Number.isFinite(n) && n > 0) return Math.ceil(n);
  }

  return undefined;
}

function userFacingGeminiError(err: unknown): string {
  const raw = geminiErrorMessage(err).toLowerCase();
  const status = geminiErrorStatus(err);

  if (
    raw.includes("high demand") ||
    raw.includes("experiencing high demand") ||
    raw.includes("spikes in demand")
  ) {
    return "Le modèle IA est très sollicité en ce moment. Attendez une minute ou deux, puis réessayez.";
  }

  if (
    status === 503 ||
    raw.includes("503") ||
    raw.includes("service unavailable")
  ) {
    return "Le service IA est temporairement indisponible. Réessayez dans quelques instants.";
  }

  if (
    raw.includes("api key") ||
    raw.includes("api_key") ||
    raw.includes("invalid api") ||
    status === 403 ||
    raw.includes("403")
  ) {
    return "Le service IA n'est pas correctement configuré. Le développeur s'en excuse.";
  }

  if (
    status === 429 ||
    raw.includes("429") ||
    raw.includes("quota") ||
    raw.includes("rate limit") ||
    raw.includes("resource exhausted")
  ) {
    const retrySec = parseRetryDelaySeconds(err);
    if (retrySec) {
      return `Limite d'utilisation IA atteinte. Réessayez dans ${retrySec} s.`;
    }
    return "Limite d'utilisation IA atteinte. Réessayez plus tard.";
  }

  if (status === 500 || raw.includes("internal") || raw.includes("500")) {
    return "Erreur interne côté IA. Réessayez dans quelques instants.";
  }

  if (
    status === 404 ||
    raw.includes("not found") ||
    (raw.includes("model") && raw.includes("404"))
  ) {
    return "Le modèle IA configuré est introuvable. Le développeur s'en excuse.";
  }

  if (
    raw.includes("fetch failed") ||
    raw.includes("network") ||
    raw.includes("econnreset") ||
    raw.includes("timeout")
  ) {
    return "Connexion au service IA impossible. Vérifiez votre réseau et réessayez.";
  }

  return "Impossible de contacter l'IA. Réessayez.";
}

function userFacingFinishReason(reason: FinishReason | string): string {
  switch (reason) {
    case FinishReason.SAFETY:
      return "La réponse a été bloquée (contenu sensible). Essayez un autre document.";
    case FinishReason.MAX_TOKENS:
      return "La réponse était trop longue. Réessayez avec un document plus simple.";
    case FinishReason.RECITATION:
      return "La réponse n'a pas pu être utilisée. Réessayez avec un autre document.";
    default:
      return "L'IA a rencontré une difficulté. Réessayez.";
  }
}

function userFacingResponseTextError(
  err: unknown,
  response: GeminiResponseMeta,
): string {
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason === "SAFETY") {
    return "L'IA n'a pas pu analyser ce document (contenu bloqué). Essayez un autre fichier.";
  }
  if (blockReason) {
    return "L'IA n'a pas pu analyser ce document. Réessayez avec un autre fichier.";
  }

  const raw = geminiErrorMessage(err).toLowerCase();
  if (
    raw.includes("safety") ||
    raw.includes("blocked") ||
    raw.includes("block") ||
    raw.includes("candidate")
  ) {
    return "L'IA n'a pas pu extraire cette facture. Essayez une image plus nette.";
  }

  return userFacingGeminiError(err);
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export type GeminiInvoiceFileInput = {
  bytes: Uint8Array;
  mimeType: SpendDashboardAcceptedMime;
};

export async function geminiInvoiceExtractJson(
  apiKey: string,
  file: GeminiInvoiceFileInput,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: resolveModelName(),
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: SPEND_DASHBOARD_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
    },
  });

  const parts: Part[] = [
    {
      inlineData: {
        mimeType: file.mimeType,
        data: bytesToBase64(file.bytes),
      },
    },
    {
      text: "Extrais les champs de cette facture au format JSON requis.",
    },
  ];

  let result;
  try {
    result = await model.generateContent(parts);
  } catch (err) {
    devLog("[gemini-invoice-extract] generateContent error:", err);
    throw new Error(userFacingGeminiError(err));
  }

  const response = result.response;
  const first = response.candidates?.[0];
  if (first?.finishReason && first.finishReason !== FinishReason.STOP) {
    devLog("[gemini-invoice-extract] finishReason:", first.finishReason, {
      promptFeedback: response.promptFeedback,
      candidate: first,
    });
    throw new Error(userFacingFinishReason(first.finishReason));
  }

  let text: string | undefined;
  try {
    text = response.text()?.trim();
  } catch (err) {
    devLog("[gemini-invoice-extract] response.text() error:", err, {
      promptFeedback: response.promptFeedback,
      candidates: response.candidates,
    });
    throw new Error(userFacingResponseTextError(err, response));
  }

  if (!text) {
    devLog("[gemini-invoice-extract] empty response:", {
      promptFeedback: response.promptFeedback,
      candidates: response.candidates,
    });
    throw new Error(
      "L'IA n'a renvoyé aucune extraction. Réessayez avec un autre document.",
    );
  }

  devLog("[gemini-invoice-extract] response:", text);
  return text;
}
