import { describe, expect, it } from "vitest";

import { canRedo, canUndo } from "@/features/vector-ai/lib/editor/core/selectors";
import { expectShapeInDoc } from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  applyEditorActions,
  lastSnapshot,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeEditorWithRect,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: historique (reducer)", () => {
  it("UNDO puis REDO après déplacement d'une forme", () => {
    const initial = makeEditorWithRect("rect-1");

    const moved = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 15, y: 25 } },
      { type: "up" },
    ]);
    expectShapeInDoc(moved.state, "rect-1", {
      type: "rect",
      transform: { x: 15, y: 25 },
    });
    expect(moved.state.history.past).toHaveLength(1);

    const undone = runGesture(moved.state, [{ type: "undo" }]);
    expectShapeInDoc(undone.state, "rect-1", {
      type: "rect",
      transform: { x: 10, y: 20 },
    });
    expect(canUndo(undone.state)).toBe(false);
    expect(canRedo(undone.state)).toBe(true);
    expect(undone.state.history.future).toHaveLength(1);

    const redone = runGesture(undone.state, [{ type: "redo" }]);
    expectShapeInDoc(redone.state, "rect-1", {
      type: "rect",
      transform: { x: 15, y: 25 },
    });
    expect(canRedo(redone.state)).toBe(false);
    expect(lastSnapshot(redone).session.kind).toBe("idle");
  });

  it("efface le redo après un UNDO puis une nouvelle modification", () => {
    const initial = makeEditorWithRect("rect-1");

    const moved = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 15, y: 25 } },
      { type: "up" },
    ]);

    const undone = runGesture(moved.state, [{ type: "undo" }]);
    expect(canRedo(undone.state)).toBe(true);
    expect(undone.state.history.future).toHaveLength(1);

    const modified = runGesture(undone.state, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 20, y: 30 } },
      { type: "up" },
    ]);

    expectShapeInDoc(modified.state, "rect-1", {
      type: "rect",
      transform: { x: 20, y: 30 },
    });
    expect(canRedo(modified.state)).toBe(false);
    expect(modified.state.history.future).toEqual([]);

    const afterRedo = runGesture(modified.state, [{ type: "redo" }]);
    expectShapeInDoc(afterRedo.state, "rect-1", {
      type: "rect",
      transform: { x: 20, y: 30 },
    });
    expect(canRedo(afterRedo.state)).toBe(false);
  });

  it("UNDO filtre la sélection vers des ids encore présents", () => {
    const initial = {
      ...makeEditorWithRect("only"),
      selection: { ids: ["only"] },
    };

    const afterAdd = applyEditorActions(initial, [
      {
        type: "SHAPE_ADD",
        shape: makeRectShape({ id: "second", transform: { x: 0, y: 0 } }),
      },
    ]);
    expect(afterAdd.selection.ids).toEqual(["only"]);
    expect(afterAdd.doc.shapes).toHaveLength(2);

    const afterUndo = applyEditorActions(afterAdd, [{ type: "UNDO" }]);
    expect(afterUndo.doc.shapes).toHaveLength(1);
    expect(afterUndo.doc.shapes[0]?.id).toBe("only");
    expect(afterUndo.selection.ids).toEqual(["only"]);
  });
});
