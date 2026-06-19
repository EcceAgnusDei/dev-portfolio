import "@/features/vector-ai/lib/editor/test/mock-create-shape-id";

import { describe, expect, it } from "vitest";

import {
  expectAfterCreate,
  expectDocUnchanged,
  expectShapeCount,
  expectShapeInDoc,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  applyStyleControlPatch,
  STYLE_TEST_DRAFT,
  withShapeSelected,
  withStyleDraft,
} from "@/features/vector-ai/lib/editor/test/style-workflow-helpers";
import {
  actionsOfType,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeEditorWithRect,
  makeLineShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: création ligne", () => {
  it("crée une ligne au drag en mode line", () => {
    const initial = makeEditorWithRect();
    initial.tool = "line";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 60 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].previews.line).toEqual({
      x1: 10,
      y1: 20,
      x2: 50,
      y2: 60,
    });

    expectAfterCreate(result, "new-shape-id", {
      type: "line",
      transform: { x: 10, y: 20 },
      x2: 50,
      y2: 60,
    });
    expectShapeCount(result.state, initial.doc.shapes.length + 1);
  });

  it("borne le linePreview au viewBox quand le curseur déborde", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.tool = "line";
    initial.doc.viewBox = viewBox;

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 80, y: 80 } },
      { type: "move", world: { x: 150, y: 150 } },
    ]);

    const preview = result.snapshots[1].previews.line;
    expect(preview).toEqual({ x1: 80, y1: 80, x2: 100, y2: 100 });
  });

  it("n'ajoute pas une ligne trop petite", () => {
    const initial = makeEditorWithRect();
    initial.tool = "line";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 11, y: 21 } },
      { type: "up" },
    ]);

    expect(actionsOfType(result.allActions, "SHAPE_ADD")).toHaveLength(0);
    expectDocUnchanged(initial, result.state);
    expect(result.state.tool).toBe("line");
  });

  it("applique stroke et strokeWidth du draftStyle à la création", () => {
    const initial = withStyleDraft(makeEditorWithRect());
    initial.tool = "line";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 60 } },
      { type: "up" },
    ]);

    expectAfterCreate(result, "new-shape-id", {
      type: "line",
      style: {
        fill: "none",
        stroke: STYLE_TEST_DRAFT.stroke,
        strokeWidth: STYLE_TEST_DRAFT.strokeWidth,
      },
    });
  });
});

describe("workflow: style ligne", () => {
  it("modifie stroke et strokeWidth en sélection", () => {
    const initial = withShapeSelected(makeEditorWithRect(), "line-1");
    initial.doc.shapes = [makeLineShape({ id: "line-1" })];

    let state = applyStyleControlPatch(initial, { stroke: "#123456" });
    expectShapeInDoc(state, "line-1", {
      style: { fill: "none", stroke: "#123456", strokeWidth: 2 },
    });

    state = applyStyleControlPatch(state, { strokeWidth: 7 });
    expectShapeInDoc(state, "line-1", {
      style: { fill: "none", stroke: "#123456", strokeWidth: 7 },
    });
  });
});
