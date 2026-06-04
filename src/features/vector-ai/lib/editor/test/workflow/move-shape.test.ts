import { describe, expect, it } from "vitest";

import {
  expectAfterMove,
  expectShapeInDoc,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  lastSnapshot,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeCircleShape,
  makeEditorWithRect,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: déplacement de forme", () => {
  it("déplace un rectangle et commit au pointerup", () => {
    const initial = makeEditorWithRect("rect-1");

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 15, y: 25 } },
      { type: "up" },
    ]);

    expect(result.state.selection.ids).toEqual(["rect-1"]);
    expect(result.snapshots[1].session.kind).toBe("move");
    expect(result.snapshots[1].displayDoc.shapes[0]).toEqual(
      expect.objectContaining({
        type: "rect",
        transform: { x: 15, y: 25 },
      }),
    );

    expectAfterMove(result, "rect-1", {
      type: "rect",
      transform: { x: 15, y: 25 },
    });
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("commit un déplacement de rectangle borné au viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect("rect-1");
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 30,
        h: 20,
      }),
    ];

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 0, y: 0 } },
      { type: "move", world: { x: 200, y: 200 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].displayDoc.shapes[0]).toEqual(
      expect.objectContaining({
        type: "rect",
        transform: { x: 70, y: 80 },
      }),
    );
    expectAfterMove(result, "rect-1", {
      type: "rect",
      transform: { x: 70, y: 80 },
    });
  });

  it("commit un déplacement de ligne borné au viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 90, y: 10 },
        x2: 110,
        y2: 20,
      }),
    ];

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "line-1", world: { x: 0, y: 0 } },
      { type: "move", world: { x: 20, y: 0 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].displayDoc.shapes[0]).toEqual(
      expect.objectContaining({
        type: "line",
        transform: { x: 80, y: 10 },
        x2: 100,
        y2: 20,
      }),
    );
    expectShapeInDoc(result.state, "line-1", {
      type: "line",
      transform: { x: 80, y: 10 },
      x2: 100,
      y2: 20,
    });
    expect(result.state.history.past.length).toBeGreaterThan(0);
  });

  it("commit un déplacement de cercle borné au viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 10,
      }),
    ];

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "circle-1", world: { x: 0, y: 0 } },
      { type: "move", world: { x: 200, y: 200 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].displayDoc.shapes[0]).toEqual(
      expect.objectContaining({
        type: "circle",
        transform: { x: 90, y: 90 },
      }),
    );
    expectAfterMove(result, "circle-1", {
      type: "circle",
      transform: { x: 90, y: 90 },
    });
    const circle = result.state.doc.shapes[0];
    if (circle?.type === "circle") {
      expect(circle.transform.x + circle.r).toBeLessThanOrEqual(
        viewBox.x + viewBox.w,
      );
      expect(circle.transform.y + circle.r).toBeLessThanOrEqual(
        viewBox.y + viewBox.h,
      );
    }
  });

  it("déplace une ligne en mettant à jour transform et x2/y2", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 0, y: 0 },
        x2: 100,
        y2: 50,
      }),
    ];

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "line-1", world: { x: 0, y: 0 } },
      { type: "move", world: { x: 5, y: 10 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "line-1", {
      type: "line",
      transform: { x: 5, y: 10 },
      x2: 105,
      y2: 60,
    });
  });
});
