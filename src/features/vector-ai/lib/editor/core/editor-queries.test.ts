import { describe, expect, it } from "vitest";

import { createInitialEditorState } from "@/features/vector-ai/lib/editor/core/state";
import {
  canRedo,
  canUndo,
  getPrimarySelectedId,
  getSelectedShapes,
  getShapeById,
  getStyleControlState,
  isMultiSelection,
  isShapeSelected,
  resolveStyleControlsMode,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test/fixtures";

describe("editor-queries", () => {
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

  it("getPrimarySelectedId renvoie le premier id ou null", () => {
    const empty = makeEditorWithRect("a");
    expect(getPrimarySelectedId(empty)).toBeNull();

    const single = {
      ...empty,
      selection: { ids: ["a"] },
    };
    expect(getPrimarySelectedId(single)).toBe("a");

    const multi = {
      ...empty,
      selection: { ids: ["a", "b"] },
    };
    expect(getPrimarySelectedId(multi)).toBe("a");
  });

  it("isMultiSelection est vrai seulement avec plusieurs ids", () => {
    const empty = makeEditorWithRect("a");
    expect(isMultiSelection(empty)).toBe(false);

    const single = {
      ...empty,
      selection: { ids: ["a"] },
    };
    expect(isMultiSelection(single)).toBe(false);

    const multi = {
      ...empty,
      selection: { ids: ["a", "b"] },
    };
    expect(isMultiSelection(multi)).toBe(true);
  });

  it("resolveStyleControlsMode est idle en sélection sans forme", () => {
    const state = makeEditorWithRect("a");
    state.tool = "select";
    state.selection = { ids: [] };

    expect(resolveStyleControlsMode(state)).toBe("idle");
    expect(getStyleControlState(state).mode).toBe("idle");
  });
});
