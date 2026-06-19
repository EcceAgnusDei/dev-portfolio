import type { Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import {
  getStyleControlVisibility,
  shapeStyleToDraftStyle,
  type DraftStyle,
  type StyleControlContext,
  type StyleControlVisibility,
} from "@/features/vector-ai/lib/editor/core/draft-style";
import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";

export type StyleControlsMode = "draft" | "selection";

export type StyleControlState = {
  mode: StyleControlsMode;
  visibility: StyleControlVisibility;
  values: DraftStyle;
};

export function getShapeById(doc: VectorDoc, id: string): Shape | undefined {
  return doc.shapes.find((s) => s.id === id);
}

export function getSelectedShape(state: EditorState): Shape | undefined {
  if (state.selection.ids.length !== 1) return undefined;
  const id = state.selection.ids[0];
  if (!id) return undefined;
  return getShapeById(state.doc, id);
}

export function getEditableSelectedShape(state: EditorState): Shape | undefined {
  if (state.tool !== "select") return undefined;
  return getSelectedShape(state);
}

export function getSelectedShapes(state: EditorState): Shape[] {
  const selected = new Set(state.selection.ids);
  return state.doc.shapes.filter((s) => selected.has(s.id));
}

export function resolveStyleControlsMode(state: EditorState): StyleControlsMode {
  return getEditableSelectedShape(state) != null ? "selection" : "draft";
}

export function getStyleControlContext(state: EditorState): StyleControlContext {
  if (state.tool !== "select") {
    return { tool: state.tool };
  }
  const shape = getSelectedShape(state);
  if (shape) {
    return { selectedType: shape.type };
  }
  return { tool: "select" };
}

export function getSelectionStyleSnapshot(
  state: EditorState,
): DraftStyle | null {
  const shape = getEditableSelectedShape(state);
  if (!shape) return null;
  return shapeStyleToDraftStyle(shape.style);
}

export function getStyleControlState(state: EditorState): StyleControlState {
  const mode = resolveStyleControlsMode(state);
  const visibility = getStyleControlVisibility(getStyleControlContext(state));
  const snapshot = getSelectionStyleSnapshot(state);
  const values =
    mode === "selection" && snapshot != null ? snapshot : state.draftStyle;
  return { mode, visibility, values };
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
