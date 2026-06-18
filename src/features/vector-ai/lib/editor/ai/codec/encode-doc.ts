import type { Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import { createIdMapFromShapes } from "@/features/vector-ai/lib/editor/ai/codec/id-map";
import type {
  CompactShape,
  IdMap,
  LlmDocContext,
} from "@/features/vector-ai/lib/editor/ai/codec/types";
import {
  VECTOR_AI_DEFAULT_FONT_FAMILY,
} from "@/features/vector-ai/lib/vector-ai-config";

function appendStroke(
  tuple: (string | number)[],
  stroke: string | undefined,
  strokeWidth: number | undefined,
): void {
  const resolvedStroke = stroke ?? "none";
  if (resolvedStroke !== "none") {
    tuple.push(resolvedStroke);
    if (strokeWidth != null) {
      tuple.push(strokeWidth);
    }
  }
}

function encodeShape(shape: Shape, shortId: string): CompactShape | null {
  if (shape.type === "path") return null;

  const { x, y } = shape.transform;

  if (shape.type === "rect") {
    const tuple: (string | number)[] = [
      "r",
      shortId,
      x,
      y,
      shape.w,
      shape.h,
      shape.style.fill ?? "#000000",
    ];
    appendStroke(tuple, shape.style.stroke, shape.style.strokeWidth);
    return tuple as CompactShape;
  }

  if (shape.type === "circle") {
    const tuple: (string | number)[] = [
      "c",
      shortId,
      x,
      y,
      shape.r,
      shape.style.fill ?? "none",
    ];
    appendStroke(tuple, shape.style.stroke, shape.style.strokeWidth);
    return tuple as CompactShape;
  }

  if (shape.type === "line") {
    const tuple: (string | number)[] = [
      "l",
      shortId,
      x,
      y,
      shape.x2,
      shape.y2,
      shape.style.stroke ?? "#000000",
    ];
    if (shape.style.strokeWidth != null) {
      tuple.push(shape.style.strokeWidth);
    }
    return tuple as CompactShape;
  }

  if (shape.type === "text") {
    return [
      "t",
      shortId,
      x,
      y,
      shape.content,
      shape.fontSize,
      shape.style.fill ?? "#000000",
    ];
  }

  return null;
}

export type EncodeDocForLlmResult = {
  context: LlmDocContext;
  idMap: IdMap;
};

export function encodeDocForLlm(doc: VectorDoc): EncodeDocForLlmResult {
  const idMap = createIdMapFromShapes(doc.shapes);
  const compactShapes: CompactShape[] = [];

  for (const shape of doc.shapes) {
    if (shape.type === "path") continue;
    const shortId = idMap.realToShort.get(shape.id);
    if (!shortId) continue;
    const compact = encodeShape(shape, shortId);
    if (compact) compactShapes.push(compact);
  }

  const pathCount = doc.shapes.filter((s) => s.type === "path").length;
  const { x, y, w, h } = doc.viewBox;

  return {
    context: {
      vb: [x, y, w, h],
      s: compactShapes,
      pathCount,
    },
    idMap,
  };
}

export function defaultTextFontFamily(): string {
  return VECTOR_AI_DEFAULT_FONT_FAMILY;
}
