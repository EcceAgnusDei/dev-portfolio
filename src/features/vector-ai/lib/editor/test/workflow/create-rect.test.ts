import "@/features/vector-ai/lib/editor/test/mock-create-shape-id";

import { describe, expect, it } from "vitest";

import type { RectShape } from "@/features/vector-ai/lib/document/types";
import type { RectResizeHandle } from "@/features/vector-ai/lib/editor/session/types";
import {
  expectAfterCreate,
  expectAfterMove,
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

function rectHandleWorldPoint(
  rect: Pick<RectShape, "transform" | "w" | "h">,
  handle: RectResizeHandle,
) {
  const { x, y } = rect.transform;
  const { w, h } = rect;
  switch (handle) {
    case "nw":
      return { x, y };
    case "n":
      return { x: x + w / 2, y };
    case "ne":
      return { x: x + w, y };
    case "e":
      return { x: x + w, y: y + h / 2 };
    case "se":
      return { x: x + w, y: y + h };
    case "s":
      return { x: x + w / 2, y: y + h };
    case "sw":
      return { x, y: y + h };
    case "w":
      return { x, y: y + h / 2 };
  }
}

describe("workflow: création rectangle", () => {
  it("crée un rectangle au drag et conserve l'outil rect", () => {
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
      "rect",
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
      "rect",
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
