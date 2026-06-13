/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { canRedo, canUndo } from "@/features/vector-ai/lib/editor/core/selectors";
import { commitTextEditActions } from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import { deleteShapeActions } from "@/features/vector-ai/lib/editor/dispatch/delete-shape";
import {
  expectDocUnchanged,
  expectShapeCount,
  expectShapeInDoc,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  makePointerEvent,
  renderInteractiveCanvas,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import {
  actionsOfType,
  applyEditorActions,
  lastSnapshot,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeEditorWithRect,
  makeEditorWithSampleDoc,
  makeTextShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

function fireKeyDown(key: "Delete" | "Backspace") {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
}

describe("workflow: suppression de forme", () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("sélectionne une forme, la supprime, puis annule et rétablit", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.selection.ids = [];

    const deleted = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "delete-selected" },
    ]);

    expectShapeCount(deleted.state, 0);
    expect(deleted.state.selection.ids).toEqual([]);
    expect(deleted.state.history.past).toHaveLength(1);
    expect(deleted.state.history.future).toEqual([]);
    expect(actionsOfType(deleted.allActions, "SHAPE_DELETE")).toEqual([
      { type: "SHAPE_DELETE", id: "rect-1" },
    ]);
    expect(lastSnapshot(deleted).session.kind).toBe("idle");
    expect(canUndo(deleted.state)).toBe(true);

    const restored = runGesture(deleted.state, [{ type: "undo" }]);
    expectShapeInDoc(restored.state, "rect-1", {
      type: "rect",
      transform: { x: 10, y: 20 },
    });
    expect(restored.state.selection.ids).toEqual([]);
    expect(canUndo(restored.state)).toBe(false);
    expect(canRedo(restored.state)).toBe(true);

    const redone = runGesture(restored.state, [{ type: "redo" }]);
    expectShapeCount(redone.state, 0);
    expect(redone.state.selection.ids).toEqual([]);
    expect(canRedo(redone.state)).toBe(false);
  });

  it("ne supprime rien quand aucune forme n'est sélectionnée", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.selection.ids = [];

    const result = runGesture(initial, [{ type: "delete-selected" }]);

    expectDocUnchanged(initial, result.state);
    expect(result.state.selection.ids).toEqual([]);
    expect(actionsOfType(result.allActions, "SHAPE_DELETE")).toHaveLength(0);
    expect(result.state.history.past).toHaveLength(0);
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("ne supprime pas une forme verrouillée", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.doc.shapes[0]!.locked = true;
    initial.selection.ids = ["rect-1"];

    const result = runGesture(initial, [{ type: "delete-selected" }]);

    expectDocUnchanged(initial, result.state);
    expect(result.state.selection.ids).toEqual(["rect-1"]);
    expect(actionsOfType(result.allActions, "SHAPE_DELETE")).toHaveLength(0);
    expect(result.state.history.past).toHaveLength(0);
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("ne supprime pas hors outil sélection", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.tool = "rect";
    initial.selection.ids = ["rect-1"];

    const result = runGesture(initial, [{ type: "delete-selected" }]);

    expectDocUnchanged(initial, result.state);
    expect(result.state.selection.ids).toEqual(["rect-1"]);
    expect(result.state.tool).toBe("rect");
    expect(actionsOfType(result.allActions, "SHAPE_DELETE")).toHaveLength(0);
    expect(result.state.history.past).toHaveLength(0);
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("supprime pendant un déplacement sans committer le déplacement", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.selection.ids = [];

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 30, y: 40 } },
      { type: "delete-selected" },
    ]);

    expectShapeCount(result.state, 0);
    expect(result.state.selection.ids).toEqual([]);
    expect(result.state.history.past).toHaveLength(1);
    expect(actionsOfType(result.allActions, "SHAPE_UPDATE")).toHaveLength(0);
    expect(actionsOfType(result.allActions, "SHAPE_DELETE")).toEqual([
      { type: "SHAPE_DELETE", id: "rect-1" },
    ]);
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("supprime uniquement la forme sélectionnée dans un document multi-formes", () => {
    const initial = makeEditorWithSampleDoc();
    initial.selection.ids = ["circle-1"];

    const result = runGesture(initial, [{ type: "delete-selected" }]);

    expectShapeCount(result.state, 3);
    expect(result.state.doc.shapes.map((shape) => shape.id)).toEqual([
      "rect-1",
      "line-1",
      "path-1",
    ]);
    expect(result.state.selection.ids).toEqual([]);
    expect(result.state.history.past).toHaveLength(1);
    expect(actionsOfType(result.allActions, "SHAPE_DELETE")).toEqual([
      { type: "SHAPE_DELETE", id: "circle-1" },
    ]);
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("supprime la forme sélectionnée avec Delete ou Backspace", () => {
    for (const key of ["Delete", "Backspace"] as const) {
      const initial = makeEditorWithRect("rect-1");
      initial.selection.ids = [];
      const { interaction, getState, unmount } = renderInteractiveCanvas(initial);

      act(() => {
        interaction.onShapePointerDown(
          "rect-1",
          makePointerEvent({ clientX: 10, clientY: 20 }),
        );
      });

      expect(getState().selection.ids).toEqual(["rect-1"]);

      fireKeyDown(key);

      expectShapeCount(getState(), 0);
      expect(getState().selection.ids).toEqual([]);
      expect(getState().history.past).toHaveLength(1);
      expect(getState().history.future).toEqual([]);
      expect(interaction.session.kind).toBe("idle");
      expect(canUndo(getState())).toBe(true);

      const restored = applyEditorActions(getState(), [{ type: "UNDO" }]);
      expectShapeInDoc(restored, "rect-1", {
        type: "rect",
        transform: { x: 10, y: 20 },
      });
      expect(restored.selection.ids).toEqual([]);
      expect(canRedo(restored)).toBe(true);

      const redone = applyEditorActions(restored, [{ type: "REDO" }]);
      expectShapeCount(redone, 0);
      expect(redone.selection.ids).toEqual([]);
      expect(canRedo(redone)).toBe(false);

      unmount();
    }
  });

  it("supprime le texte quand le contenu validé est vide", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [makeTextShape({ id: "text-1", content: "Hello" })];
    initial.selection.ids = ["text-1"];

    const next = applyEditorActions(
      initial,
      commitTextEditActions({
        shapeId: "text-1",
        input: { content: "   \n\t  " },
        doc: initial.doc,
      }),
    );

    expectShapeCount(next, 0);
    expect(next.selection.ids).toEqual([]);
    expect(next.history.past).toHaveLength(1);
    expect(commitTextEditActions({
      shapeId: "text-1",
      input: { content: "   \n\t  " },
      doc: initial.doc,
    })).toEqual(deleteShapeActions(initial.doc, "text-1"));
  });
});
