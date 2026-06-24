import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";

export function canDeleteShape(doc: VectorDoc, id: string): boolean {
  const shape = getShapeById(doc, id);
  return shape !== undefined && !shape.locked;
}

export function deletableSelectedIds(
  doc: VectorDoc,
  ids: readonly string[],
): string[] {
  return ids.filter((id) => canDeleteShape(doc, id));
}

export function canDeleteSelectedShapes(
  doc: VectorDoc,
  ids: readonly string[],
): boolean {
  return deletableSelectedIds(doc, ids).length > 0;
}

export function deleteShapeActions(
  doc: VectorDoc,
  ids: readonly string[],
): EditorAction[] {
  const toDelete = deletableSelectedIds(doc, ids);
  if (toDelete.length === 0) return [];

  return toDelete.map((id, index) => ({
    type: "SHAPE_DELETE",
    id,
    recordHistory: index === 0 ? undefined : false,
  }));
}
