import type { TextShape } from "@/features/vector-ai/lib/document/types";
import {
  VECTOR_AI_HIT_TEXT_MIN_HEIGHT,
  VECTOR_AI_HIT_TEXT_MIN_WIDTH,
} from "@/features/vector-ai/lib/vector-ai-config";
import {
  splitTextLines,
  textLineHeight,
} from "@/features/vector-ai/lib/editor/geometry/text-lines";

export type TextBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function estimateTextBounds(
  shape: Pick<TextShape, "transform" | "content" | "fontSize">,
): TextBounds {
  const lines = splitTextLines(shape.content);
  const maxLineLength = lines.reduce(
    (max, line) => Math.max(max, line.length),
    0,
  );

  const w = Math.max(
    VECTOR_AI_HIT_TEXT_MIN_WIDTH,
    maxLineLength > 0 ? maxLineLength * shape.fontSize * 0.55 : 0,
  );
  const h = Math.max(
    VECTOR_AI_HIT_TEXT_MIN_HEIGHT,
    lines.length * textLineHeight(shape.fontSize),
  );

  return {
    x: shape.transform.x - w / 2,
    y: shape.transform.y - h / 2,
    w,
    h,
  };
}

export function textRenderPosition(
  shape: Pick<TextShape, "transform" | "content" | "fontSize">,
): { x: number; y: number } {
  const bounds = estimateTextBounds(shape);
  return {
    x: shape.transform.x,
    y: bounds.y,
  };
}

export function textBoundsRight(bounds: TextBounds): number {
  return bounds.x + bounds.w;
}

export function textBoundsBottom(bounds: TextBounds): number {
  return bounds.y + bounds.h;
}
