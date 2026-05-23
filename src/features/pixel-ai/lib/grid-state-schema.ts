import { z } from "zod";

import type { GridCoord } from "@/features/pixel-ai/lib/grid-coords";

const gridCoordSchema = z.object({
  x: z.number().int().min(1),
  y: z.number().int().min(1),
});

const gridAiPixelsSchema = z.object({
  pixels: z.array(gridCoordSchema),
});

type ParseGridAiPixelsResult =
  | { ok: true; pixels: GridCoord[] }
  | { ok: false; error: string };

function dedupeCoords(cells: GridCoord[]): GridCoord[] {
  const seen = new Set<string>();
  const out: GridCoord[] = [];
  for (const c of cells) {
    const k = `${c.x},${c.y}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

function validateGridAiPixels(data: unknown): ParseGridAiPixelsResult {
  const result = gridAiPixelsSchema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const msg =
      first && typeof first.message === "string"
        ? first.message
        : "Réponse IA invalide.";
    return { ok: false, error: msg };
  }

  return {
    ok: true,
    pixels: dedupeCoords(result.data.pixels),
  };
}

export function parseAndValidateGridAiPixelsJson(
  raw: string,
): ParseGridAiPixelsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: "JSON invalide." };
  }
  return validateGridAiPixels(parsed);
}
