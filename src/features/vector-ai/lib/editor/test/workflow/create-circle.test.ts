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
  makeCircleShape,
  makeEditorWithRect,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: création cercle", () => {
  it("crée un cercle au drag en mode circle", () => {
    const initial = makeEditorWithRect();
    initial.tool = "circle";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 20 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].previews.circle).toEqual({
      cx: 30,
      cy: 20,
      r: 20,
      anchorX: 10,
      anchorY: 20,
    });

    expectAfterCreate(
      result,
      "new-shape-id",
      {
        type: "circle",
        transform: { x: 30, y: 20 },
        r: 20,
      },
      "select",
    );
    expectShapeCount(result.state, initial.doc.shapes.length + 1);
  });

  it("garde le point d'ancrage fixe pendant la création", () => {
    const initial = makeEditorWithRect();
    initial.tool = "circle";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 30, y: 40 } },
      { type: "move", world: { x: 80, y: 60 } },
    ]);

    expect(result.snapshots[1].previews.circle?.anchorX).toBe(10);
    expect(result.snapshots[1].previews.circle?.anchorY).toBe(20);
    expect(result.snapshots[2].previews.circle?.anchorX).toBe(10);
    expect(result.snapshots[2].previews.circle?.anchorY).toBe(20);
  });

  it("borne le circlePreview au viewBox quand le curseur déborde", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.tool = "circle";
    initial.doc.viewBox = viewBox;

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 80, y: 80 } },
      { type: "move", world: { x: 150, y: 150 } },
    ]);

    const preview = result.snapshots[1].previews.circle;
    const t = 2 / (1 + Math.SQRT2);
    const expectedCx = 80 + 10 * t;
    const expectedR = 10 * t * Math.SQRT2;
    expect(preview?.anchorX).toBe(80);
    expect(preview?.anchorY).toBe(80);
    expect(preview?.cx).toBeCloseTo(expectedCx, 8);
    expect(preview?.cy).toBeCloseTo(expectedCx, 8);
    expect(preview?.r).toBeCloseTo(expectedR, 8);
    expect(preview!.cx + preview!.r).toBeLessThanOrEqual(viewBox.x + viewBox.w);
    expect(preview!.cy + preview!.r).toBeLessThanOrEqual(viewBox.y + viewBox.h);
    expect(preview!.cx - preview!.r).toBeGreaterThanOrEqual(viewBox.x);
    expect(preview!.cy - preview!.r).toBeGreaterThanOrEqual(viewBox.y);
  });

  it("n'ajoute pas un cercle trop petit", () => {
    const initial = makeEditorWithRect();
    initial.tool = "circle";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 11, y: 21 } },
      { type: "up" },
    ]);

    expect(actionsOfType(result.allActions, "SHAPE_ADD")).toHaveLength(0);
    expectDocUnchanged(initial, result.state);
    expect(result.state.tool).toBe("circle");
  });

  it("applique fill, stroke et strokeWidth du draftStyle à la création", () => {
    const initial = withStyleDraft(makeEditorWithRect());
    initial.tool = "circle";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 20 } },
      { type: "up" },
    ]);

    expectAfterCreate(
      result,
      "new-shape-id",
      {
        type: "circle",
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

describe("workflow: style cercle", () => {
  it("modifie fill, stroke et strokeWidth en sélection", () => {
    const initial = withShapeSelected(makeEditorWithRect(), "circle-1");
    initial.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 20,
      }),
    ];

    let state = applyStyleControlPatch(initial, { fill: "#aabbcc" });
    expectShapeInDoc(state, "circle-1", {
      style: { fill: "#aabbcc", stroke: "#000000", strokeWidth: 2 },
    });

    state = applyStyleControlPatch(state, { stroke: "none" });
    expectShapeInDoc(state, "circle-1", {
      style: { fill: "#aabbcc", stroke: "none", strokeWidth: 2 },
    });

    state = applyStyleControlPatch(state, {
      stroke: "#ddeeff",
      strokeWidth: 3,
    });
    expectShapeInDoc(state, "circle-1", {
      style: { fill: "#aabbcc", stroke: "#ddeeff", strokeWidth: 3 },
    });
  });
});
