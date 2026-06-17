import { FinishReason, GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerationConfig, Part } from "@google/generative-ai";

import { encodeDocForLlm } from "@/features/vector-ai/lib/ai/codec/encode-doc";
import {
  VECTOR_AI_LLM_ALLOWED_SHAPE_TYPES,
  VECTOR_AI_MAX_OUTPUT_TOKENS,
  VECTOR_AI_PREVIEW_MEDIA_RESOLUTION,
} from "@/features/vector-ai/lib/ai/config";
import type { VectorAiPreviewPng } from "@/features/vector-ai/lib/ai/config";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import {
  VECTOR_AI_MAX_FONT_SIZE,
  VECTOR_AI_MAX_SHAPE_DIMENSION,
  VECTOR_AI_MAX_SHAPES,
  VECTOR_AI_MAX_STROKE_WIDTH,
  VECTOR_AI_MAX_TEXT_LENGTH,
} from "@/features/vector-ai/lib/vector-ai-config";

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

const ALLOWED_SHAPE_TYPES = VECTOR_AI_LLM_ALLOWED_SHAPE_TYPES.join(", ");

const SYSTEM_INSTRUCTION = `Tu es un éditeur de dessin vectoriel SVG.

Contexte :
- "ctx" décrit le dessin actuel : vb = viewBox [x, y, w, h], s = formes existantes (tuples compacts), pathCount = courbes non modifiables.
- Une image preview peut accompagner le contexte : utilise-la pour interpréter le dessin. Les coordonnées exactes pour modifier le dessin restent dans ctx.s.
- Tu modifies le dessin selon userRequest.

Formes autorisées : ${ALLOWED_SHAPE_TYPES}. Jamais de path.

Tuples (positions fixes) :
- rect : ["r", id, x, y, w, h, fill, stroke (optionel), strokeWidth (optionel)]
- circle : ["c", id, x, y, r, fill, stroke (optionel), strokeWidth (optionel)]
- line : ["l", id, x, y, x2, y2, stroke, strokeWidth (optionel)]
- text : ["t", id, x, y, content, fontSize, fill]

Réponse : UN SEUL objet JSON { "ops": [ ... ] }, sans markdown.
Ops autorisées :
- ["add", tuple] : ajoute une forme (ids nouveaux : n1, n2, …)
- ["clear"] : supprime toutes les formes éditables (les pathCount courbes restent)

Règles :
- ViewBox (bornes incluses) : x entre vb[0] et vb[0]+vb[2], y entre vb[1] et vb[1]+vb[3].
- rect : x, y, x+w et y+h doivent rester dans ces bornes.
- circle : (x, y) est le centre ; garde le cercle entier visible (centre ± r dans le viewBox).
- line : (x,y) = départ, (x2,y2) = arrivée ; les deux extrémités dans le viewBox.
- text : (x, y) = ancrage ; place le texte entièrement dans le viewBox si possible.
- ne dépasse jamais les bornes du viewBox, même si l'utilisateur le demande
- fill et stroke : "#RRGGBB" ou "none".
- w, h, r : positifs, max ${VECTOR_AI_MAX_SHAPE_DIMENSION}.
- strokeWidth : > 0, max ${VECTOR_AI_MAX_STROKE_WIDTH}.
- fontSize : > 0, max ${VECTOR_AI_MAX_FONT_SIZE}.
- content : max ${VECTOR_AI_MAX_TEXT_LENGTH} caractères.
- Max ${VECTOR_AI_MAX_SHAPES} formes au total après les ops.
- Demande incomprise : { "ops": [] }.
- Vider le dessin : { "ops": [["clear"]] }.`;

function resolveModelName(): string {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_MODEL;
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
      return "La réponse a été bloquée (contenu sensible). Modifiez votre demande.";
    case FinishReason.MAX_TOKENS:
      return "La réponse était trop longue. Simplifiez votre demande.";
    case FinishReason.RECITATION:
      return "La réponse n'a pas pu être utilisée. Reformulez votre demande.";
    default:
      return "L'IA a rencontré une difficultée. Réessayez.";
  }
}

function userFacingResponseTextError(
  err: unknown,
  response: GeminiResponseMeta,
): string {
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason === "SAFETY") {
    return "L'IA n'a pas pu générer de dessin (contenu bloqué). Reformulez votre demande.";
  }
  if (blockReason) {
    return "L'IA n'a pas pu générer de dessin pour cette demande. Reformulez et réessayez.";
  }

  const raw = geminiErrorMessage(err).toLowerCase();
  if (
    raw.includes("safety") ||
    raw.includes("blocked") ||
    raw.includes("block") ||
    raw.includes("candidate")
  ) {
    return "L'IA n'a pas pu produire de dessin pour cette demande. Essayez une formulation plus simple.";
  }

  return userFacingGeminiError(err);
}

type GeminiGenerationConfig = GenerationConfig & {
  mediaResolution?: typeof VECTOR_AI_PREVIEW_MEDIA_RESOLUTION;
};

function buildGeminiContentParts(
  payload: string,
  previewPng?: VectorAiPreviewPng,
): Part[] {
  const parts: Part[] = [];

  if (previewPng) {
    parts.push({
      inlineData: {
        mimeType: previewPng.mimeType,
        data: previewPng.base64,
      },
    });
  }

  parts.push({
    text: `Produis uniquement { "ops": [ ... ] } pour ce contexte :\n${payload}`,
  });

  return parts;
}

export async function geminiVectorAiOps(
  apiKey: string,
  userPrompt: string,
  doc: VectorDoc,
  previewPng?: VectorAiPreviewPng,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: resolveModelName(),
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: VECTOR_AI_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      mediaResolution: VECTOR_AI_PREVIEW_MEDIA_RESOLUTION,
    } as GeminiGenerationConfig as GenerationConfig,
  });

  const { context } = encodeDocForLlm(doc);
  const payload = JSON.stringify(
    {
      ctx: context,
      userRequest: userPrompt,
    },
    null,
    0,
  );

  let result;
  try {
    result = await model.generateContent(
      buildGeminiContentParts(payload, previewPng),
    );
  } catch (err) {
    devLog("[gemini-vector-ai] generateContent error:", err);
    throw new Error(userFacingGeminiError(err));
  }

  const response = result.response;
  const first = response.candidates?.[0];
  if (first?.finishReason && first.finishReason !== FinishReason.STOP) {
    devLog("[gemini-vector-ai] finishReason:", first.finishReason, {
      promptFeedback: response.promptFeedback,
      candidate: first,
    });
    throw new Error(userFacingFinishReason(first.finishReason));
  }

  let text: string | undefined;
  try {
    text = response.text()?.trim();
  } catch (err) {
    devLog("[gemini-vector-ai] response.text() error:", err, {
      promptFeedback: response.promptFeedback,
      candidates: response.candidates,
    });
    throw new Error(userFacingResponseTextError(err, response));
  }

  if (!text) {
    devLog("[gemini-vector-ai] empty response:", {
      promptFeedback: response.promptFeedback,
      candidates: response.candidates,
    });
    throw new Error(
      "L'IA n'a renvoyé aucun dessin. Reformulez votre demande et réessayez.",
    );
  }
  devLog("[gemini-vector-ai] response:", text);
  return text;
}
