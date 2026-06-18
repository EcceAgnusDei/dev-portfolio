import type { Shape } from "@/features/vector-ai/lib/document/types";
import type { IdMap } from "@/features/vector-ai/lib/editor/ai/codec/types";

function isLlmEditableShape(shape: Shape): boolean {
  return shape.type !== "path";
}

export function createIdMapFromShapes(shapes: Shape[]): IdMap {
  const shortToReal = new Map<string, string>();
  const realToShort = new Map<string, string>();
  let counter = 0;

  for (const shape of shapes) {
    if (!isLlmEditableShape(shape)) continue;
    counter += 1;
    const shortId = `s${counter}`;
    shortToReal.set(shortId, shape.id);
    realToShort.set(shape.id, shortId);
  }

  return { shortToReal, realToShort };
}
