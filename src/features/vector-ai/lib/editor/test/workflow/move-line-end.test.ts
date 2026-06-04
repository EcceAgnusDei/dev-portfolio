import { describe, expect, it } from "vitest";

import { expectAfterMove } from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import { runGesture } from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeEditorWithRect,
  makeLineShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: extrémité de ligne", () => {
  it("commit un déplacement d'extrémité de fin borné au viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 0, y: 0 },
        x2: 50,
        y2: 50,
      }),
    ];

    const result = runGesture(initial, [
      {
        type: "line-end-down",
        shapeId: "line-1",
        end: "end",
        world: { x: 50, y: 50 },
      },
      { type: "move", world: { x: 150, y: 150 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].displayDoc.shapes[0]).toEqual(
      expect.objectContaining({
        type: "line",
        transform: { x: 0, y: 0 },
        x2: 100,
        y2: 100,
      }),
    );
    expectAfterMove(result, "line-1", {
      type: "line",
      transform: { x: 0, y: 0 },
      x2: 100,
      y2: 100,
    });
    const line = result.state.doc.shapes[0];
    if (line?.type === "line") {
      expect(line.x2).toBeLessThanOrEqual(viewBox.x + viewBox.w);
      expect(line.y2).toBeLessThanOrEqual(viewBox.y + viewBox.h);
    }
  });

  it("déplace uniquement l'extrémité de départ", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 0, y: 0 },
        x2: 100,
        y2: 50,
      }),
    ];

    const result = runGesture(initial, [
      {
        type: "line-end-down",
        shapeId: "line-1",
        end: "start",
        world: { x: 0, y: 0 },
      },
      { type: "move", world: { x: 20, y: 30 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "line-1", {
      type: "line",
      transform: { x: 20, y: 30 },
      x2: 100,
      y2: 50,
    });
  });

  it("déplace uniquement l'extrémité de fin", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 0, y: 0 },
        x2: 100,
        y2: 50,
      }),
    ];

    const result = runGesture(initial, [
      {
        type: "line-end-down",
        shapeId: "line-1",
        end: "end",
        world: { x: 100, y: 50 },
      },
      { type: "move", world: { x: 120, y: 80 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "line-1", {
      type: "line",
      transform: { x: 0, y: 0 },
      x2: 120,
      y2: 80,
    });
  });
});
