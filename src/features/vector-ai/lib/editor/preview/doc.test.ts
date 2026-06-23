import { describe, expect, it } from "vitest";

import { docWithPointerPreview } from "@/features/vector-ai/lib/editor/preview/doc";
import {
  makeCircleShape,
  makeDocWithRect,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("docWithPointerPreview", () => {
  it("ne modifie pas le doc en idle ou create-rect", () => {
    const doc = makeDocWithRect("rect-1");
    expect(docWithPointerPreview(doc, { kind: "idle" })).toBe(doc);
    expect(
      docWithPointerPreview(doc, {
        kind: "create-rect",
        pointerId: 1,
        startWorld: { x: 0, y: 0 },
        currentWorld: { x: 10, y: 10 },
      }),
    ).toBe(doc);
  });

  it("prévisualise le déplacement d'un rectangle", () => {
    const doc = makeDocWithRect("rect-1");
    const next = docWithPointerPreview(doc, {
      kind: "move",
      pointerId: 1,
      shapeIds: ["rect-1"],
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 5, y: 10 },
      startByShapeId: {
        "rect-1": { transform: { x: 10, y: 20 } },
      },
    });
    const rect = next.shapes[0];
    expect(rect).toEqual(
      expect.objectContaining({
        type: "rect",
        transform: { x: 15, y: 30 },
      }),
    );
  });

  it("prévisualise le déplacement d'une ligne (début et fin)", () => {
    const doc = {
      ...makeDocWithRect("rect-1"),
      shapes: [
        makeLineShape({
          id: "line-1",
          transform: { x: 0, y: 0 },
          x2: 100,
          y2: 0,
        }),
      ],
    };
    const next = docWithPointerPreview(doc, {
      kind: "move",
      pointerId: 1,
      shapeIds: ["line-1"],
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 3, y: 4 },
      startByShapeId: {
        "line-1": { transform: { x: 0, y: 0 }, x2: 100, y2: 0 },
      },
    });
    const line = next.shapes.find((s) => s.id === "line-1");
    expect(line).toEqual(
      expect.objectContaining({
        type: "line",
        transform: { x: 3, y: 4 },
        x2: 103,
        y2: 4,
      }),
    );
  });

  it("prévisualise le déplacement de l'extrémité de départ", () => {
    const doc = {
      ...makeDocWithRect(),
      shapes: [
        makeLineShape({
          id: "line-1",
          transform: { x: 0, y: 0 },
          x2: 100,
          y2: 50,
        }),
      ],
    };
    const next = docWithPointerPreview(doc, {
      kind: "move-line-end",
      pointerId: 1,
      shapeId: "line-1",
      end: "start",
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 20, y: 30 },
      startTransform: { x: 0, y: 0 },
      startX2: 100,
      startY2: 50,
    });
    const line = next.shapes.find((s) => s.id === "line-1");
    expect(line).toEqual(
      expect.objectContaining({
        type: "line",
        transform: { x: 20, y: 30 },
        x2: 100,
        y2: 50,
      }),
    );
  });

  it("prévisualise le déplacement de l'extrémité de fin", () => {
    const doc = {
      ...makeDocWithRect(),
      shapes: [
        makeLineShape({
          id: "line-1",
          transform: { x: 0, y: 0 },
          x2: 100,
          y2: 50,
        }),
      ],
    };
    const next = docWithPointerPreview(doc, {
      kind: "move-line-end",
      pointerId: 1,
      shapeId: "line-1",
      end: "end",
      startWorld: { x: 100, y: 50 },
      currentWorld: { x: 120, y: 80 },
      startTransform: { x: 0, y: 0 },
      startX2: 100,
      startY2: 50,
    });
    const line = next.shapes.find((s) => s.id === "line-1");
    expect(line).toEqual(
      expect.objectContaining({
        type: "line",
        transform: { x: 0, y: 0 },
        x2: 120,
        y2: 80,
      }),
    );
  });

  it("borne le déplacement d'un rectangle au viewBox", () => {
    const doc = {
      ...makeDocWithRect("rect-1"),
      viewBox: { x: 0, y: 0, w: 100, h: 100 },
      shapes: [
        makeRectShape({
          id: "rect-1",
          transform: { x: 10, y: 20 },
          w: 30,
          h: 20,
        }),
      ],
    };
    const next = docWithPointerPreview(doc, {
      kind: "move",
      pointerId: 1,
      shapeIds: ["rect-1"],
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 200, y: 200 },
      startByShapeId: {
        "rect-1": { transform: { x: 10, y: 20 } },
      },
    });
    expect(next.shapes[0]).toEqual(
      expect.objectContaining({
        type: "rect",
        transform: { x: 70, y: 80 },
      }),
    );
  });

  it("borne le déplacement d'une ligne au viewBox", () => {
    const doc = {
      ...makeDocWithRect(),
      viewBox: { x: 0, y: 0, w: 100, h: 100 },
      shapes: [
        makeLineShape({
          id: "line-1",
          transform: { x: 90, y: 10 },
          x2: 110,
          y2: 20,
        }),
      ],
    };
    const next = docWithPointerPreview(doc, {
      kind: "move",
      pointerId: 1,
      shapeIds: ["line-1"],
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 20, y: 0 },
      startByShapeId: {
        "line-1": { transform: { x: 90, y: 10 }, x2: 110, y2: 20 },
      },
    });
    expect(next.shapes[0]).toEqual(
      expect.objectContaining({
        type: "line",
        transform: { x: 80, y: 10 },
        x2: 100,
        y2: 20,
      }),
    );
  });

  it("borne le déplacement d'un cercle au viewBox", () => {
    const doc = {
      ...makeDocWithRect(),
      viewBox: { x: 0, y: 0, w: 100, h: 100 },
      shapes: [
        makeCircleShape({
          id: "circle-1",
          transform: { x: 50, y: 50 },
          r: 10,
        }),
      ],
    };
    const next = docWithPointerPreview(doc, {
      kind: "move",
      pointerId: 1,
      shapeIds: ["circle-1"],
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 200, y: 200 },
      startByShapeId: {
        "circle-1": { transform: { x: 50, y: 50 } },
      },
    });
    expect(next.shapes[0]).toEqual(
      expect.objectContaining({
        type: "circle",
        transform: { x: 90, y: 90 },
      }),
    );
  });

  it("borne l'extrémité de fin d'une ligne au viewBox", () => {
    const doc = {
      ...makeDocWithRect(),
      viewBox: { x: 0, y: 0, w: 100, h: 100 },
      shapes: [
        makeLineShape({
          id: "line-1",
          transform: { x: 0, y: 0 },
          x2: 50,
          y2: 50,
        }),
      ],
    };
    const next = docWithPointerPreview(doc, {
      kind: "move-line-end",
      pointerId: 1,
      shapeId: "line-1",
      end: "end",
      startWorld: { x: 50, y: 50 },
      currentWorld: { x: 150, y: 150 },
      startTransform: { x: 0, y: 0 },
      startX2: 50,
      startY2: 50,
    });
    expect(next.shapes[0]).toEqual(
      expect.objectContaining({
        type: "line",
        x2: 100,
        y2: 100,
      }),
    );
  });

  it("ignore les formes verrouillées", () => {
    const doc = {
      ...makeDocWithRect(),
      shapes: [makeRectShape({ id: "rect-1", locked: true })],
    };
    const next = docWithPointerPreview(doc, {
      kind: "move",
      pointerId: 1,
      shapeIds: ["rect-1"],
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 10, y: 10 },
      startByShapeId: {
        "rect-1": { transform: { x: 10, y: 20 } },
      },
    });
    expect(next.shapes[0]).toBe(doc.shapes[0]);
  });
});
