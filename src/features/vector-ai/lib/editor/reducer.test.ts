import { describe, expect, it } from "vitest";

import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { editorReducer } from "@/features/vector-ai/lib/editor/reducer";
import { canRedo, canUndo } from "@/features/vector-ai/lib/editor/selectors";
import { createInitialEditorState } from "@/features/vector-ai/lib/editor/state";
import {
  makeDocWithRect,
  makeEditorWithRect,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test-fixtures";
import { VECTOR_AI_MAX_SHAPES } from "@/features/vector-ai/lib/vector-ai-config";

describe("editorReducer", () => {
  it("SHAPE_ADD ajoute une forme et enregistre l'historique", () => {
    const state = createInitialEditorState();
    const shape = makeRectShape({ id: "new" });
    const next = editorReducer(state, { type: "SHAPE_ADD", shape });
    expect(next.doc.shapes).toHaveLength(1);
    expect(next.doc.shapes[0]?.id).toBe("new");
    expect(next.history.past).toHaveLength(1);
    expect(next.history.future).toHaveLength(0);
  });

  it("SHAPE_ADD ignore un id déjà présent", () => {
    const state = makeEditorWithRect("dup");
    const next = editorReducer(state, {
      type: "SHAPE_ADD",
      shape: makeRectShape({ id: "dup" }),
    });
    expect(next).toBe(state);
  });

  it("SHAPE_ADD avec recordHistory false ne pousse pas l'historique", () => {
    const state = createInitialEditorState();
    const next = editorReducer(state, {
      type: "SHAPE_ADD",
      shape: makeRectShape({ id: "x" }),
      recordHistory: false,
    });
    expect(next.doc.shapes).toHaveLength(1);
    expect(next.history.past).toHaveLength(0);
  });

  it("SHAPE_UPDATE déplace une forme", () => {
    const state = makeEditorWithRect("r");
    const next = editorReducer(state, {
      type: "SHAPE_UPDATE",
      id: "r",
      patch: { transform: { x: 500 } },
    });
    expect(next.doc.shapes[0]?.transform.x).toBe(500);
    expect(next.history.past).toHaveLength(1);
  });

  it("SHAPE_UPDATE ignore une forme verrouillée", () => {
    const state = makeEditorWithRect("locked");
    state.doc.shapes[0]!.locked = true;
    const next = editorReducer(state, {
      type: "SHAPE_UPDATE",
      id: "locked",
      patch: { transform: { x: 1 } },
    });
    expect(next).toBe(state);
  });

  it("SHAPE_DELETE supprime et retire de la sélection", () => {
    const state = {
      ...makeEditorWithRect("gone"),
      selection: { ids: ["gone"] },
    };
    const next = editorReducer(state, { type: "SHAPE_DELETE", id: "gone" });
    expect(next.doc.shapes).toHaveLength(0);
    expect(next.selection.ids).toEqual([]);
  });

  it("SHAPE_DELETE ignore une forme verrouillée", () => {
    const state = makeEditorWithRect("locked");
    state.doc.shapes[0]!.locked = true;
    const next = editorReducer(state, {
      type: "SHAPE_DELETE",
      id: "locked",
    });
    expect(next).toBe(state);
  });

  it("SELECTION_SET filtre les ids inexistants", () => {
    const state = makeEditorWithRect("a");
    const next = editorReducer(state, {
      type: "SELECTION_SET",
      ids: ["a", "missing"],
    });
    expect(next.selection.ids).toEqual(["a"]);
    expect(next.history.past).toHaveLength(0);
  });

  it("TOOL_SET change l'outil sans historique", () => {
    const state = createInitialEditorState();
    const next = editorReducer(state, { type: "TOOL_SET", tool: "rect" });
    expect(next.tool).toBe("rect");
    expect(next.history).toEqual(state.history);
  });

  it("VIEWBOX_SET met à jour le viewBox", () => {
    const state = createInitialEditorState();
    const viewBox = { x: 1, y: 2, w: 400, h: 300 };
    const next = editorReducer(state, { type: "VIEWBOX_SET", viewBox });
    expect(next.doc.viewBox).toEqual(viewBox);
  });

  it("DOC_SET remplace le document valide", () => {
    const state = makeEditorWithRect("old");
    const doc = makeDocWithRect("new");
    const next = editorReducer(state, { type: "DOC_SET", doc });
    expect(next.doc.shapes[0]?.id).toBe("new");
    expect(next.history.past).toHaveLength(1);
  });

  it("DOC_SET ignore un document invalide", () => {
    const state = makeEditorWithRect();
    const invalidDoc = {
      version: 99,
      viewBox: { x: 0, y: 0, w: 1, h: 1 },
      shapes: [],
    } as unknown as VectorDoc;
    const next = editorReducer(state, { type: "DOC_SET", doc: invalidDoc });
    expect(next).toBe(state);
  });

  it("UNDO puis REDO restaurent le document", () => {
    let state = makeEditorWithRect("r");
    state = editorReducer(state, {
      type: "SHAPE_UPDATE",
      id: "r",
      patch: { transform: { x: 999 } },
    });
    expect(state.doc.shapes[0]?.transform.x).toBe(999);

    const undone = editorReducer(state, { type: "UNDO" });
    expect(undone.doc.shapes[0]?.transform.x).toBe(10);
    expect(canUndo(undone)).toBe(false);
    expect(canRedo(undone)).toBe(true);

    const redone = editorReducer(undone, { type: "REDO" });
    expect(redone.doc.shapes[0]?.transform.x).toBe(999);
    expect(canRedo(redone)).toBe(false);
  });

  it("UNDO filtre la sélection vers des ids encore présents", () => {
    let state = {
      ...makeEditorWithRect("only"),
      selection: { ids: ["only"] },
    };
    state = editorReducer(state, {
      type: "SHAPE_ADD",
      shape: makeRectShape({ id: "second", transform: { x: 0, y: 0 } }),
    });
    state = editorReducer(state, { type: "UNDO" });
    expect(state.selection.ids).toEqual(["only"]);
  });

  it("refuse SHAPE_ADD au-delà de VECTOR_AI_MAX_SHAPES", () => {
    const shapes = Array.from({ length: VECTOR_AI_MAX_SHAPES }, (_, i) =>
      makeRectShape({ id: `s-${i}`, transform: { x: i, y: 0 } }),
    );
    const state = createInitialEditorState({
      ...createEmptyDoc(),
      shapes,
    });
    const next = editorReducer(state, {
      type: "SHAPE_ADD",
      shape: makeRectShape({ id: "overflow" }),
    });
    expect(next).toBe(state);
    expect(next.doc.shapes).toHaveLength(VECTOR_AI_MAX_SHAPES);
  });
});
