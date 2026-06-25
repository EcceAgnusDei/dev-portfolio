import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";
import {
  getVectorDrawing,
  saveVectorDrawing,
  snapshotDocAsVectorDrawing,
} from "@/features/vector-ai/lib/vector-drawing-storage";

export const DRAWING_NOT_FOUND_ERROR = "Ce dessin n'existe plus.";
export const DRAWING_NAME_REQUIRED_ERROR = "Le nom du dessin est requis.";

export type SaveDrawingInput = {
  doc: VectorDoc;
  activeDrawingId: string | null;
  drawingName: string;
  idFactory?: () => string;
};

export type SaveDrawingResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };

export function saveDrawingFromDoc(input: SaveDrawingInput): SaveDrawingResult {
  const trimmedName = input.drawingName.trim();
  if (!trimmedName) {
    return { ok: false, error: DRAWING_NAME_REQUIRED_ERROR };
  }

  const id = input.activeDrawingId ?? input.idFactory?.() ?? crypto.randomUUID();
  const drawing = snapshotDocAsVectorDrawing(input.doc, id, trimmedName);
  const saveError = saveVectorDrawing(drawing);
  if (saveError) {
    return { ok: false, error: saveError };
  }

  return { ok: true, id: drawing.id, name: drawing.name };
}

export type DrawingLoadPlan =
  | {
      ok: true;
      doc: VectorDoc;
      activeDrawingId: string | null;
      drawingName: string;
    }
  | { ok: false; error: string };

export function planDrawingLoad(id: string | null): DrawingLoadPlan {
  if (id === null) {
    return {
      ok: true,
      doc: createEmptyDoc(),
      activeDrawingId: null,
      drawingName: "",
    };
  }

  const drawing = getVectorDrawing(id);
  if (!drawing) {
    return { ok: false, error: DRAWING_NOT_FOUND_ERROR };
  }

  return {
    ok: true,
    doc: drawing.doc,
    activeDrawingId: id,
    drawingName: drawing.name,
  };
}

export type LoadDrawingResult =
  | {
      ok: true;
      state: EditorState;
      activeDrawingId: string | null;
      drawingName: string;
    }
  | { ok: false; error: string };

export function loadDrawingIntoEditor(
  state: EditorState,
  id: string | null,
): LoadDrawingResult {
  const plan = planDrawingLoad(id);
  if (!plan.ok) {
    return plan;
  }

  return {
    ok: true,
    state: editorReducer(state, { type: "EDITOR_LOAD", doc: plan.doc }),
    activeDrawingId: plan.activeDrawingId,
    drawingName: plan.drawingName,
  };
}
