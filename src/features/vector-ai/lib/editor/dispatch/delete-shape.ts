import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";

export function canDeleteShape(doc: VectorDoc, id: string): boolean {
  const shape = getShapeById(doc, id);
  return shape !== undefined && !shape.locked;
}

export function deleteShapeActions(doc: VectorDoc, id: string): EditorAction[] {
  if (!canDeleteShape(doc, id)) return [];
  return [{ type: "SHAPE_DELETE", id }];
}
