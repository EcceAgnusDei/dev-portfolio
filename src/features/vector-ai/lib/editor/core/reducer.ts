import { parseVectorDoc } from "@/features/vector-ai/lib/document/schema";
import type { Shape, VectorDoc, ViewBox } from "@/features/vector-ai/lib/document/types";
import { clampShapeToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import { VECTOR_AI_MAX_SHAPES } from "@/features/vector-ai/lib/vector-ai-config";
import { isSameVectorDoc } from "@/features/vector-ai/lib/editor/core/doc-equality";
import { applyShapePatch } from "@/features/vector-ai/lib/editor/core/shape-patch";
import type { EditorAction, EditorState } from "@/features/vector-ai/lib/editor/core/state";

function shouldRecordHistory(recordHistory: boolean | undefined): boolean {
  return recordHistory !== false;
}

function pushDocHistory(state: EditorState, nextDoc: VectorDoc): EditorState {
  return {
    ...state,
    doc: nextDoc,
    history: {
      past: [...state.history.past, state.doc],
      future: [],
    },
  };
}

function replaceDoc(
  state: EditorState,
  nextDoc: VectorDoc,
  recordHistory: boolean | undefined,
): EditorState {
  if (isSameVectorDoc(state.doc, nextDoc)) {
    return state;
  }
  if (!shouldRecordHistory(recordHistory)) {
    return { ...state, doc: nextDoc };
  }
  return pushDocHistory(state, nextDoc);
}

function filterSelectionIds(state: EditorState, ids: string[]): string[] {
  const existing = new Set(state.doc.shapes.map((s) => s.id));
  return ids.filter((id) => existing.has(id));
}

function getShapeById(doc: VectorDoc, id: string): Shape | undefined {
  return doc.shapes.find((s) => s.id === id);
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "DOC_SET": {
      const parsed = parseVectorDoc(action.doc);
      if (!parsed.ok) return state;
      const next = replaceDoc(state, parsed.doc, action.recordHistory);
      return {
        ...next,
        selection: {
          ids: filterSelectionIds(next, state.selection.ids),
        },
      };
    }

    case "SHAPE_ADD": {
      if (state.doc.shapes.length >= VECTOR_AI_MAX_SHAPES) return state;
      const exists = state.doc.shapes.some((s) => s.id === action.shape.id);
      if (exists) return state;
      const nextDoc: VectorDoc = {
        ...state.doc,
        shapes: [...state.doc.shapes, action.shape],
      };
      return replaceDoc(state, nextDoc, action.recordHistory);
    }

    case "SHAPE_UPDATE": {
      const shape = getShapeById(state.doc, action.id);
      if (!shape || shape.locked) return state;
      const nextDoc: VectorDoc = {
        ...state.doc,
        shapes: state.doc.shapes.map((s) => {
          if (s.id !== action.id) return s;
          const patched = applyShapePatch(s, action.patch);
          if (patched.type === "text") {
            return clampShapeToViewBox(patched, state.doc.viewBox);
          }
          return patched;
        }),
      };
      return replaceDoc(state, nextDoc, action.recordHistory);
    }

    case "SHAPE_DELETE": {
      const shape = getShapeById(state.doc, action.id);
      if (!shape || shape.locked) return state;
      const nextDoc: VectorDoc = {
        ...state.doc,
        shapes: state.doc.shapes.filter((s) => s.id !== action.id),
      };
      const next = replaceDoc(state, nextDoc, action.recordHistory);
      return {
        ...next,
        selection: {
          ids: state.selection.ids.filter((id) => id !== action.id),
        },
      };
    }

    case "VIEWBOX_SET": {
      const viewBox: ViewBox = action.viewBox;
      const nextDoc: VectorDoc = { ...state.doc, viewBox };
      return replaceDoc(state, nextDoc, action.recordHistory);
    }

    case "SELECTION_SET":
      return {
        ...state,
        selection: { ids: filterSelectionIds(state, action.ids) },
      };

    case "TOOL_SET":
      return { ...state, tool: action.tool };

    case "UNDO": {
      const { past, future } = state.history;
      if (past.length === 0) return state;
      const previous = past[past.length - 1]!;
      return {
        ...state,
        doc: previous,
        history: {
          past: past.slice(0, -1),
          future: [state.doc, ...future],
        },
        selection: {
          ids: filterSelectionIds({ ...state, doc: previous }, state.selection.ids),
        },
      };
    }

    case "REDO": {
      const { past, future } = state.history;
      if (future.length === 0) return state;
      const next = future[0]!;
      return {
        ...state,
        doc: next,
        history: {
          past: [...past, state.doc],
          future: future.slice(1),
        },
        selection: {
          ids: filterSelectionIds({ ...state, doc: next }, state.selection.ids),
        },
      };
    }

    default:
      return state;
  }
}
