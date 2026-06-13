import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import { buildTextShape } from "@/features/vector-ai/lib/editor/dispatch/create-text";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import { VECTOR_AI_DEFAULT_FONT_SIZE, VECTOR_AI_MAX_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";

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

export type CommitTextEditParams = {
  shapeId: string;
  input: TextEditCommit;
  doc: VectorDoc;
  pendingWorld?: WorldPoint;
};

export function commitTextEditActions({
  shapeId,
  input,
  doc,
  pendingWorld,
}: CommitTextEditParams): EditorAction[] {
  const existing = getShapeById(doc, shapeId);
  const shapeExists = existing?.type === "text";

  if (!hasSignificantTextContent(input.content)) {
    if (!shapeExists) return [];
    return [{ type: "SHAPE_DELETE", id: shapeId }];
  }

  const fontSize =
    input.fontSize ??
    (existing?.type === "text" ? existing.fontSize : VECTOR_AI_DEFAULT_FONT_SIZE);

  if (!shapeExists) {
    if (!pendingWorld) return [];
    return [
      {
        type: "SHAPE_ADD",
        shape: buildTextShape(shapeId, pendingWorld, input.content, fontSize),
      },
      { type: "SELECTION_SET", ids: [shapeId] },
    ];
  }

  const patch: TextEditCommit = { content: input.content };
  if (input.fontSize !== undefined) {
    patch.fontSize = input.fontSize;
  }
  return [{ type: "SHAPE_UPDATE", id: shapeId, patch }];
}
