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
  lastSnapshot,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeEditorWithRect,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: création rectangle", () => {
  it("crée un rectangle au drag et repasse en outil sélection", () => {
    const initial = makeEditorWithRect();
    initial.tool = "rect";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 60 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].previews.rect).toEqual({
      x: 10,
      y: 20,
      w: 40,
      h: 40,
    });

    expectAfterCreate(
      result,
      "new-shape-id",
      {
        type: "rect",
        transform: { x: 10, y: 20 },
        w: 40,
        h: 40,
      },
      "select",
    );
    expectShapeCount(result.state, initial.doc.shapes.length + 1);
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("borne le rectPreview au viewBox quand le curseur déborde", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.tool = "rect";
    initial.doc.viewBox = viewBox;

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 80, y: 80 } },
      { type: "move", world: { x: 150, y: 150 } },
    ]);

    const preview = result.snapshots[1].previews.rect;
    expect(preview).toEqual({ x: 80, y: 80, w: 20, h: 20 });
  });

  it("n'ajoute pas un rectangle trop petit", () => {
    const initial = makeEditorWithRect();
    initial.tool = "rect";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 11, y: 21 } },
      { type: "up" },
    ]);

    expect(actionsOfType(result.allActions, "SHAPE_ADD")).toHaveLength(0);
    expectDocUnchanged(initial, result.state);
    expect(result.state.tool).toBe("rect");
  });

  it("applique fill, stroke et strokeWidth du draftStyle à la création", () => {
    const initial = withStyleDraft(makeEditorWithRect());
    initial.tool = "rect";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 60 } },
      { type: "up" },
    ]);

    expectAfterCreate(
      result,
      "new-shape-id",
      {
        type: "rect",
        style: {
          fill: STYLE_TEST_DRAFT.fill,
          stroke: STYLE_TEST_DRAFT.stroke,
          strokeWidth: STYLE_TEST_DRAFT.strokeWidth,
        },
      },
      "select",
    );
  });
});

describe("workflow: style rectangle", () => {
  it("modifie fill, stroke et strokeWidth en sélection", () => {
    const initial = withShapeSelected(makeEditorWithRect("rect-1"), "rect-1");
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
    ];

    let state = applyStyleControlPatch(initial, { fill: "#112233" });
    expectShapeInDoc(state, "rect-1", {
      style: { fill: "#112233", stroke: "none" },
    });

    state = applyStyleControlPatch(state, { stroke: "#445566" });
    expectShapeInDoc(state, "rect-1", {
      style: { fill: "#112233", stroke: "#445566", strokeWidth: 1 },
    });

    state = applyStyleControlPatch(state, { strokeWidth: 6 });
    expectShapeInDoc(state, "rect-1", {
      style: {
        fill: "#112233",
        stroke: "#445566",
        strokeWidth: 6,
      },
    });
  });
});
