import type { Shape, ShapeType, VectorDoc } from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/editor-queries";

export function selectedShapeOfType<T extends ShapeType>(
  doc: VectorDoc,
  selectedId: string | null | undefined,
  type: T,
): Extract<Shape, { type: T }> | null {
  if (!selectedId) return null;
  const shape = getShapeById(doc, selectedId);
  if (!shape || shape.type !== type) return null;
  return shape as Extract<Shape, { type: T }>;
}
