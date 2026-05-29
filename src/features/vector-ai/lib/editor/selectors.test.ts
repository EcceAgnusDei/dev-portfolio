import { describe, expect, it } from "vitest";

import { createInitialEditorState } from "@/features/vector-ai/lib/editor/state";
import {
  canRedo,
  canUndo,
  getSelectedShapes,
  getShapeById,
  isShapeSelected,
} from "@/features/vector-ai/lib/editor/selectors";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test-fixtures";

describe("selectors", () => {
  it("getShapeById trouve une forme", () => {
    const state = makeEditorWithRect("a");
    expect(getShapeById(state.doc, "a")?.type).toBe("rect");
    expect(getShapeById(state.doc, "missing")).toBeUndefined();
  });

  it("getSelectedShapes renvoie les formes sélectionnées", () => {
    const state = {
      ...makeEditorWithRect("a"),
      selection: { ids: ["a", "ghost"] },
    };
    expect(getSelectedShapes(state)).toHaveLength(1);
    expect(getSelectedShapes(state)[0]?.id).toBe("a");
  });

  it("canUndo et canRedo reflètent l'historique", () => {
    const empty = createInitialEditorState();
    expect(canUndo(empty)).toBe(false);
    expect(canRedo(empty)).toBe(false);

    const withPast = {
      ...empty,
      history: { past: [empty.doc], future: [] },
    };
    expect(canUndo(withPast)).toBe(true);

    const withFuture = {
      ...empty,
      history: { past: [], future: [empty.doc] },
    };
    expect(canRedo(withFuture)).toBe(true);
  });

  it("isShapeSelected", () => {
    const state = {
      ...makeEditorWithRect("sel"),
      selection: { ids: ["sel"] },
    };
    expect(isShapeSelected(state, "sel")).toBe(true);
    expect(isShapeSelected(state, "other")).toBe(false);
  });
});
