import type { Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";

export function getShapeById(doc: VectorDoc, id: string): Shape | undefined {
  return doc.shapes.find((s) => s.id === id);
}

export function getSelectedShapes(state: EditorState): Shape[] {
  const selected = new Set(state.selection.ids);
  return state.doc.shapes.filter((s) => selected.has(s.id));
}

export function canUndo(state: EditorState): boolean {
  return state.history.past.length > 0;
}

export function canRedo(state: EditorState): boolean {
  return state.history.future.length > 0;
}

export function isShapeSelected(state: EditorState, id: string): boolean {
  return state.selection.ids.includes(id);
}
