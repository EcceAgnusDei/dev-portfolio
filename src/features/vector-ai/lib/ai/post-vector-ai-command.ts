import {
  VECTOR_AI_PROMPT_MAX_LENGTH,
  type VectorAiPreviewPng,
} from "@/features/vector-ai/lib/ai/config";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";

export type PostVectorAiCommandBody = {
  prompt: string;
  doc: VectorDoc;
  previewPng?: VectorAiPreviewPng;
};

export type PostVectorAiCommandResult =
  | { ok: true; doc: VectorDoc }
  | { ok: false; error: string };

export async function postVectorAiCommand(
  body: PostVectorAiCommandBody,
): Promise<PostVectorAiCommandResult> {
  const trimmed = body.prompt.trim();
  if (!trimmed) {
    return { ok: false, error: "Le prompt est vide." };
  }

  if (trimmed.length > VECTOR_AI_PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Le prompt est trop long (max. ${VECTOR_AI_PROMPT_MAX_LENGTH.toLocaleString("fr-FR")} caractères).`,
    };
  }

  let res: Response;
  try {
    res = await fetch("/api/demos/vector-ai/ai-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: trimmed,
        doc: body.doc,
        ...(body.previewPng ? { previewPng: body.previewPng } : {}),
      }),
    });
  } catch {
    return { ok: false, error: "Réseau indisponible." };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Réponse serveur illisible." };
  }

  const obj = data as { error?: unknown; doc?: VectorDoc };

  if (!res.ok) {
    const msg =
      typeof obj.error === "string" && obj.error.length > 0
        ? obj.error
        : `Erreur ${res.status}`;
    return { ok: false, error: msg };
  }

  if (!obj.doc || typeof obj.doc !== "object") {
    return { ok: false, error: "Réponse serveur invalide." };
  }

  return { ok: true, doc: obj.doc };
}
