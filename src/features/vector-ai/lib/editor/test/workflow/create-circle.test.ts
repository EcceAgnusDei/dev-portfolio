import "@/features/vector-ai/lib/editor/test/mock-create-shape-id";

import { describe, expect, it } from "vitest";

import type { CircleShape } from "@/features/vector-ai/lib/document/types";
import type { CircleResizeHandle } from "@/features/vector-ai/lib/editor/session/types";
import {
  expectAfterCreate,
  expectAfterMove,
  expectDocUnchanged,
  expectShapeCount,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  actionsOfType,
  lastSnapshot,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeCircleShape,
  makeEditorWithRect,
} from "@/features/vector-ai/lib/editor/test/fixtures";

function circleHandleWorldPoint(
  circle: Pick<CircleShape, "transform" | "r">,
  handle: CircleResizeHandle,
) {
  const { x: cx, y: cy } = circle.transform;
  const { r } = circle;
  switch (handle) {
    case "n":
      return { x: cx, y: cy - r };
    case "e":
      return { x: cx + r, y: cy };
    case "s":
      return { x: cx, y: cy + r };
    case "w":
      return { x: cx - r, y: cy };
  }
}

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

    expectAfterCreate(result, "new-shape-id", {
      type: "circle",
      transform: { x: 30, y: 20 },
      r: 20,
    });
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
});

describe("workflow: redimensionnement cercle", () => {
  it("agrandit via la poignée est en gardant le centre fixe", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 20,
      }),
    ];
    const circle = initial.doc.shapes[0]!;
    if (circle.type !== "circle") throw new Error("fixture circle attendue");

    const result = runGesture(initial, [
      {
        type: "circle-handle-down",
        shapeId: "circle-1",
        handle: "e",
        world: circleHandleWorldPoint(circle, "e"),
      },
      { type: "move", world: { x: 80, y: 50 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].session.kind).toBe("resize-circle");
    expect(result.snapshots[1].displayDoc.shapes[0]).toEqual(
      expect.objectContaining({
        type: "circle",
        transform: { x: 50, y: 50 },
        r: 30,
      }),
    );
    expectAfterMove(result, "circle-1", {
      type: "circle",
      transform: { x: 50, y: 50 },
      r: 30,
    });
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("agrandit via la poignée nord", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 20,
      }),
    ];
    const circle = initial.doc.shapes[0]!;
    if (circle.type !== "circle") throw new Error("fixture circle attendue");

    const result = runGesture(initial, [
      {
        type: "circle-handle-down",
        shapeId: "circle-1",
        handle: "n",
        world: circleHandleWorldPoint(circle, "n"),
      },
      { type: "move", world: { x: 50, y: 10 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "circle-1", {
      type: "circle",
      transform: { x: 50, y: 50 },
      r: 40,
    });
  });

  it("réduit via la poignée sud", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 40,
      }),
    ];
    const circle = initial.doc.shapes[0]!;
    if (circle.type !== "circle") throw new Error("fixture circle attendue");

    const result = runGesture(initial, [
      {
        type: "circle-handle-down",
        shapeId: "circle-1",
        handle: "s",
        world: circleHandleWorldPoint(circle, "s"),
      },
      { type: "move", world: { x: 50, y: 70 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "circle-1", {
      type: "circle",
      transform: { x: 50, y: 50 },
      r: 20,
    });
  });

  it("borne le rayon au viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 20,
      }),
    ];
    const circle = initial.doc.shapes[0]!;
    if (circle.type !== "circle") throw new Error("fixture circle attendue");

    const result = runGesture(initial, [
      {
        type: "circle-handle-down",
        shapeId: "circle-1",
        handle: "e",
        world: circleHandleWorldPoint(circle, "e"),
      },
      { type: "move", world: { x: 150, y: 50 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "circle-1", {
      type: "circle",
      transform: { x: 50, y: 50 },
      r: 50,
    });
    const resized = result.state.doc.shapes[0];
    if (resized?.type === "circle") {
      expect(resized.transform.x + resized.r).toBeLessThanOrEqual(
        viewBox.x + viewBox.w,
      );
      expect(resized.transform.x - resized.r).toBeGreaterThanOrEqual(viewBox.x);
      expect(resized.transform.y + resized.r).toBeLessThanOrEqual(
        viewBox.y + viewBox.h,
      );
      expect(resized.transform.y - resized.r).toBeGreaterThanOrEqual(viewBox.y);
    }
  });

  it("ne commit pas un rayon trop petit", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 20,
      }),
    ];
    const circle = initial.doc.shapes[0]!;
    if (circle.type !== "circle") throw new Error("fixture circle attendue");

    const result = runGesture(initial, [
      {
        type: "circle-handle-down",
        shapeId: "circle-1",
        handle: "e",
        world: circleHandleWorldPoint(circle, "e"),
      },
      { type: "move", world: { x: 50.4, y: 50 } },
      { type: "up" },
    ]);

    expect(actionsOfType(result.allActions, "SHAPE_UPDATE")).toHaveLength(0);
    expectDocUnchanged(initial, result.state);
  });
});
