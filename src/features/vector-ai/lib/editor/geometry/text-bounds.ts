import type { TextShape } from "@/features/vector-ai/lib/document/types";
import {
  measureTextBlockHeight,
  measureTextBlockWidth,
} from "@/features/vector-ai/lib/editor/geometry/measure-text";
import {
  VECTOR_AI_DEFAULT_FONT_FAMILY,
  VECTOR_AI_HIT_TEXT_MIN_HEIGHT,
  VECTOR_AI_HIT_TEXT_MIN_WIDTH,
} from "@/features/vector-ai/lib/vector-ai-config";
import { splitTextLines } from "@/features/vector-ai/lib/editor/geometry/text-lines";

export type TextBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TextBoundsInput = Pick<
  TextShape,
  "transform" | "content" | "fontSize" | "fontFamily"
>;

export function estimateTextBounds(shape: TextBoundsInput): TextBounds {
  const lines = splitTextLines(shape.content);
  const fontFamily = shape.fontFamily || VECTOR_AI_DEFAULT_FONT_FAMILY;

  const w = Math.max(
    VECTOR_AI_HIT_TEXT_MIN_WIDTH,
    measureTextBlockWidth(lines, shape.fontSize, fontFamily),
  );
  const h = Math.max(
    VECTOR_AI_HIT_TEXT_MIN_HEIGHT,
    measureTextBlockHeight(lines, shape.fontSize, fontFamily),
  );

  return {
    x: shape.transform.x - w / 2,
    y: shape.transform.y - h / 2,
    w,
    h,
  };
}

export function textRenderPosition(
  shape: TextBoundsInput,
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
