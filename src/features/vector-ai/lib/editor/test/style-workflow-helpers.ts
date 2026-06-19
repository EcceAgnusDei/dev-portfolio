import type { DraftStyle } from "@/features/vector-ai/lib/editor/core/draft-style";
import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";
import {
  styleControlPatchActions,
  type StylePatch,
} from "@/features/vector-ai/lib/editor/dispatch/style-patch-actions";
import { applyEditorActions } from "@/features/vector-ai/lib/editor/test/run-gesture";

export const STYLE_TEST_DRAFT: DraftStyle = {
  fill: "#ff5500",
  stroke: "#0055ff",
  strokeWidth: 4,
};

export function withStyleDraft(state: EditorState): EditorState {
  return { ...state, draftStyle: { ...STYLE_TEST_DRAFT } };
}

export function withShapeSelected(
  state: EditorState,
  shapeId: string,
): EditorState {
  return {
    ...state,
    tool: "select",
    selection: { ids: [shapeId] },
  };
}

export function applyStyleControlPatch(
  state: EditorState,
  patch: StylePatch,
): EditorState {
  return applyEditorActions(state, styleControlPatchActions(state, patch));
}
