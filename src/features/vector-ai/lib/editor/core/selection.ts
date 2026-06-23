import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";

export type SelectionClickMode = "replace" | "toggle";

export function isShapeInSelection(
  currentIds: readonly string[],
  shapeId: string,
): boolean {
  return currentIds.includes(shapeId);
}

export function resolveShapeClickSelection(
  currentIds: readonly string[],
  shapeId: string,
  mode: SelectionClickMode,
): string[] {
  if (mode === "replace") {
    if (currentIds.length > 1 && isShapeInSelection(currentIds, shapeId)) {
      return [...currentIds];
    }
    return [shapeId];
  }

  if (isShapeInSelection(currentIds, shapeId)) {
    return currentIds.filter((id) => id !== shapeId);
  }

  return [...currentIds, shapeId];
}

export function movableSelectedIds(
  doc: VectorDoc,
  ids: readonly string[],
): string[] {
  return ids.filter((id) => {
    const shape = getShapeById(doc, id);
    return shape !== undefined && !shape.locked;
  });
}
