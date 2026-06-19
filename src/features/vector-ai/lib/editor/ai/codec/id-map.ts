import type { Shape } from "@/features/vector-ai/lib/document/types";
import type { IdMap } from "@/features/vector-ai/lib/editor/ai/codec/types";

export function createIdMapFromShapes(shapes: Shape[]): IdMap {
  const shortToReal = new Map<string, string>();
  const realToShort = new Map<string, string>();
  let counter = 0;

  for (const shape of shapes) {
    counter += 1;
    const shortId = `s${counter}`;
    shortToReal.set(shortId, shape.id);
    realToShort.set(shape.id, shortId);
  }

  return { shortToReal, realToShort };
}

export function resolveShortId(idMap: IdMap, shortId: string): string {
  const realId = idMap.shortToReal.get(shortId);
  if (!realId) {
    throw new Error("Identifiant de forme inconnu.");
  }
  return realId;
}
