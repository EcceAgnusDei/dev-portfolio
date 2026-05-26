import { FinishReason, GoogleGenerativeAI } from "@google/generative-ai";

import type { GridCoord } from "@/features/pixel-ai/lib/grid-coords";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const SYSTEM_INSTRUCTION = `Tu es un éditeur de dessin sur grille de pixels (style pixel art).

Contexte :
- Une grille de cellules ; chaque cellule peut être vide ou remplie en noir.
- "gridSize" (fourni en entrée) donne les dimensions actuelles de la grille: largeur × hauteur (colonnes × lignes).
- "pixels" liste les cellules noires actuelles, coordonnées 1-based (x ≥ 1, y ≥ 1).
- Tu modifies le dessin selon la demande. Tu ne choisis pas la taille de la grille : le client l'ajustera si tes coordonnées le nécessitent.

Règles strictes :
- Tu réponds par UN SEUL objet JSON, sans markdown, sans texte avant ou après.
- Format obligatoire : { "pixels": [ { "x", "y" }, ... ] }
- "pixels" est la liste complète et définitive des pixels noirs (elle remplace entièrement le dessin précédent).
- Ne renvoie aucun autre champ que "pixels".
- Essaie de dessiner dans les limites de la grille (gridSize) si possible, si ce n'est pas possible, tu peux envoyer des coordonnées en dehors des limites de la grille.
- Dessine centrée dans la grille, en t'appuyant sur gridSize.
- Ne conserve le dessin envoyé par l'utilisateur que si sa demande le suggère.

Si tu ne comprends pas la demande (trop vague, hors sujet, incohérente, impossible à interpréter comme une modification de dessin) :
- Ne devine pas un autre dessin.
- Dessine un point d'interrogation "?" lisible.

Pour « effacer » ou « vider » : "pixels": [].

Interprète la demande (souvent en français) à partir du contexte (gridSize, pixels, userRequest).`;

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

export async function geminiPixelGridStateJson(
  apiKey: string,
  userPrompt: string,
  gridSize: GridCoord,
  pixels: GridCoord[],
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: resolveModelName(),
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const context = JSON.stringify(
    {
      gridSize,
      pixels,
      userRequest: userPrompt,
    },
    null,
    0,
  );

  let result;
  try {
    result = await model.generateContent(
      `Produis uniquement l'objet JSON { "pixels": [ { "x", "y" }, ... ] } pour ce contexte :\n${context}`,
    );
  } catch (err) {
    devLog("[gemini-pixel-grid] generateContent error:", err);
    throw new Error(userFacingGeminiError(err));
  }

  const response = result.response;
  const first = response.candidates?.[0];
  if (first?.finishReason && first.finishReason !== FinishReason.STOP) {
    devLog("[gemini-pixel-grid] finishReason:", first.finishReason, {
      promptFeedback: response.promptFeedback,
      candidate: first,
    });
    throw new Error(userFacingFinishReason(first.finishReason));
  }

  let text: string | undefined;
  try {
    text = response.text()?.trim();
  } catch (err) {
    devLog("[gemini-pixel-grid] response.text() error:", err, {
      promptFeedback: response.promptFeedback,
      candidates: response.candidates,
    });
    throw new Error(userFacingResponseTextError(err, response));
  }

  if (!text) {
    devLog("[gemini-pixel-grid] empty response:", {
      promptFeedback: response.promptFeedback,
      candidates: response.candidates,
    });
    throw new Error(
      "L'IA n'a renvoyé aucun dessin. Reformulez votre demande et réessayez.",
    );
  }

  return text;
}
