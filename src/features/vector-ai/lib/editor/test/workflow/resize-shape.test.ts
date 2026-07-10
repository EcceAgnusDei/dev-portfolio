import { describe, expect, it } from "vitest";

import {
  circleHandleWorldPoint,
  rectHandleWorldPoint,
} from "@/features/vector-ai/lib/editor/geometry/resize";
import {
  expectAfterMove,
  expectDocUnchanged,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  actionsOfType,
  lastSnapshot,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeCircleShape,
  makeEditorWithRect,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: redimensionnement rectangle", () => {
  it("agrandit via la poignée sud-est en gardant le coin nord-ouest fixe", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
    ];
    const rect = initial.doc.shapes[0]!;
    if (rect.type !== "rect") throw new Error("fixture rect attendue");

    const result = runGesture(initial, [
      {
        type: "rect-handle-down",
        shapeId: "rect-1",
        handle: "se",
        world: rectHandleWorldPoint(rect, "se"),
      },
      { type: "move", world: { x: 130, y: 90 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].session.kind).toBe("resize-rect");
    expect(result.snapshots[1].displayDoc.shapes[0]).toEqual(
      expect.objectContaining({
        type: "rect",
        transform: { x: 10, y: 20 },
        w: 120,
        h: 70,
      }),
    );
    expectAfterMove(result, "rect-1", {
      type: "rect",
      transform: { x: 10, y: 20 },
      w: 120,
      h: 70,
    });
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("redimensionne via la poignée nord-ouest en gardant le coin sud-est fixe", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
    ];
    const rect = initial.doc.shapes[0]!;
    if (rect.type !== "rect") throw new Error("fixture rect attendue");

    const result = runGesture(initial, [
      {
        type: "rect-handle-down",
        shapeId: "rect-1",
        handle: "nw",
        world: rectHandleWorldPoint(rect, "nw"),
      },
      { type: "move", world: { x: 30, y: 40 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "rect-1", {
      type: "rect",
      transform: { x: 30, y: 40 },
      w: 80,
      h: 30,
    });
  });

  it("modifie uniquement la largeur via la poignée est", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
    ];
    const rect = initial.doc.shapes[0]!;
    if (rect.type !== "rect") throw new Error("fixture rect attendue");

    const result = runGesture(initial, [
      {
        type: "rect-handle-down",
        shapeId: "rect-1",
        handle: "e",
        world: rectHandleWorldPoint(rect, "e"),
      },
      { type: "move", world: { x: 150, y: 45 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "rect-1", {
      type: "rect",
      transform: { x: 10, y: 20 },
      w: 140,
      h: 50,
    });
  });

  it("redimensionne via le bord nord hors du rectangle", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
    ];
    const rect = initial.doc.shapes[0]!;
    if (rect.type !== "rect") throw new Error("fixture rect attendue");

    const result = runGesture(initial, [
      {
        type: "rect-handle-down",
        shapeId: "rect-1",
        handle: "n",
        world: { x: rect.transform.x + rect.w / 2, y: rect.transform.y - 12 },
      },
      { type: "move", world: { x: 60, y: 5 } },
      { type: "up" },
    ]);

    expect(result.snapshots[0].session.kind).toBe("resize-rect");
    if (result.snapshots[0].session.kind === "resize-rect") {
      expect(result.snapshots[0].session.handle).toBe("n");
    }
  });

  it("privilégie une poignée de bord loin d'un coin", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
    ];
    const rect = initial.doc.shapes[0]!;
    if (rect.type !== "rect") throw new Error("fixture rect attendue");

    const result = runGesture(initial, [
      {
        type: "rect-handle-down",
        shapeId: "rect-1",
        handle: "n",
        world: { x: rect.transform.x + 15, y: rect.transform.y + 2 },
      },
      { type: "up" },
    ]);

    expect(result.snapshots[0].session.kind).toBe("resize-rect");
    if (result.snapshots[0].session.kind === "resize-rect") {
      expect(result.snapshots[0].session.handle).toBe("n");
    }
  });

  it("déplace au centre sans redimensionner", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.selection = { ids: ["rect-1"] };
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
    ];
    const rect = initial.doc.shapes[0]!;
    if (rect.type !== "rect") throw new Error("fixture rect attendue");

    const result = runGesture(initial, [
      {
        type: "shape-down",
        shapeId: "rect-1",
        world: {
          x: rect.transform.x + rect.w / 2,
          y: rect.transform.y + rect.h / 2,
        },
      },
      { type: "up" },
    ]);

    expect(result.snapshots[0].session.kind).toBe("move");
  });

  it("borne le redimensionnement au viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect("rect-1");
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 80,
        h: 50,
      }),
    ];
    const rect = initial.doc.shapes[0]!;
    if (rect.type !== "rect") throw new Error("fixture rect attendue");

    const result = runGesture(initial, [
      {
        type: "rect-handle-down",
        shapeId: "rect-1",
        handle: "se",
        world: rectHandleWorldPoint(rect, "se"),
      },
      { type: "move", world: { x: 200, y: 200 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "rect-1", {
      type: "rect",
      transform: { x: 10, y: 20 },
      w: 90,
      h: 80,
    });
    const resized = result.state.doc.shapes[0];
    if (resized?.type === "rect") {
      expect(resized.transform.x + resized.w).toBeLessThanOrEqual(
        viewBox.x + viewBox.w,
      );
      expect(resized.transform.y + resized.h).toBeLessThanOrEqual(
        viewBox.y + viewBox.h,
      );
    }
  });

  it("ne commit pas un rectangle trop petit", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
    ];
    const rect = initial.doc.shapes[0]!;
    if (rect.type !== "rect") throw new Error("fixture rect attendue");

    const result = runGesture(initial, [
      {
        type: "rect-handle-down",
        shapeId: "rect-1",
        handle: "se",
        world: rectHandleWorldPoint(rect, "se"),
      },
      { type: "move", world: { x: 11, y: 21 } },
      { type: "up" },
    ]);

    expect(actionsOfType(result.allActions, "SHAPE_UPDATE")).toHaveLength(0);
    expectDocUnchanged(initial, result.state);
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

  it("démarre un resize au clic sur le contour", () => {
    const initial = makeEditorWithRect();
    initial.selection = { ids: ["circle-1"] };
    initial.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 20,
      }),
    ];

    const result = runGesture(initial, [
      {
        type: "shape-down",
        shapeId: "circle-1",
        world: { x: 70, y: 50 },
      },
      { type: "up" },
    ]);

    expect(result.snapshots[0].session.kind).toBe("resize-circle");
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
