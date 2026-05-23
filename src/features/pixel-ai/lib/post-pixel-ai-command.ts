import type { GridCoord } from "@/features/pixel-ai/lib/grid-coords";
import { PIXEL_AI_PROMPT_MAX_LENGTH } from "@/features/pixel-ai/lib/pixel-ai-config";

export type PostPixelAiCommandBody = {
  prompt: string;
  gridSize: GridCoord;
  pixels: GridCoord[];
};

export type PostPixelAiCommandResult =
  | { ok: true; pixels: GridCoord[] }
  | { ok: false; error: string };

export async function postPixelAiCommand(
  body: PostPixelAiCommandBody,
): Promise<PostPixelAiCommandResult> {
  const trimmed = body.prompt.trim();
  if (!trimmed) {
    return { ok: false, error: "Le prompt est vide." };
  }

  if (trimmed.length > PIXEL_AI_PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Le prompt est trop long (max. ${PIXEL_AI_PROMPT_MAX_LENGTH.toLocaleString("fr-FR")} caractères).`,
    };
  }

  let res: Response;
  try {
    res = await fetch("/api/demos/pixel-ai/grid-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: trimmed,
        gridSize: body.gridSize,
        pixels: body.pixels,
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

  const obj = data as {
    error?: unknown;
    pixels?: GridCoord[];
  };

  if (!res.ok) {
    const msg =
      typeof obj.error === "string" && obj.error.length > 0
        ? obj.error
        : `Erreur ${res.status}`;
    return { ok: false, error: msg };
  }

  if (!Array.isArray(obj.pixels)) {
    return { ok: false, error: "Réponse serveur invalide." };
  }

  return {
    ok: true,
    pixels: obj.pixels,
  };
}
