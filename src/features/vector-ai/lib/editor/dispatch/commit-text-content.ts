import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import { VECTOR_AI_MAX_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";

export type TextEditCommit = {
  content: string;
  fontSize?: number;
};

export function hasSignificantTextContent(content: string): boolean {
  return /\S/.test(content);
}

export function parseTextFontSizeInput(
  value: string,
  fallback: number,
): number {
  const trimmed = value.trim();
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(VECTOR_AI_MAX_FONT_SIZE, n);
}

export function isValidTextFontSizeInput(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 && n <= VECTOR_AI_MAX_FONT_SIZE;
}

export function commitTextEditActions(
  shapeId: string,
  input: TextEditCommit,
): EditorAction[] {
  if (!hasSignificantTextContent(input.content)) {
    return [{ type: "SHAPE_DELETE", id: shapeId }];
  }
  const patch: TextEditCommit = { content: input.content };
  if (input.fontSize !== undefined) {
    patch.fontSize = input.fontSize;
  }
  return [{ type: "SHAPE_UPDATE", id: shapeId, patch }];
}
