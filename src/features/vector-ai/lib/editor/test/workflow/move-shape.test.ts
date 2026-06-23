import { describe, expect, it } from "vitest";

import { canRedo, canUndo } from "@/features/vector-ai/lib/editor/core/selectors";
import {
  expectAfterMove,
  expectShapeInDoc,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  actionsOfType,
  lastSnapshot,
  runGesture,
  type GestureStep,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeCircleShape,
  makeEditorWithRect,
  makeEditorWithTwoRects,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

function dragShape(
  shapeId: string,
  down: WorldPoint,
  to: WorldPoint,
  options?: { additive?: boolean },
): GestureStep[] {
  return [
    {
      type: "shape-down",
      shapeId,
      world: down,
      additive: options?.additive,
    },
    { type: "move", world: to },
    { type: "up" },
  ];
}

describe("workflow: déplacement de forme", () => {
  describe("déplacement simple", () => {
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

  describe("déplacement multiple", () => {
    it("déplace toute la sélection après ajout Ctrl+clic", () => {
      const initial = makeEditorWithTwoRects(["rect-1"]);

      const result = runGesture(initial, [
        ...dragShape("rect-2", { x: 130, y: 30 }, { x: 140, y: 40 }, {
          additive: true,
        }),
      ]);

      expect(result.state.selection.ids).toEqual(["rect-1", "rect-2"]);
      expectShapeInDoc(result.state, "rect-1", {
        type: "rect",
        transform: { x: 20, y: 30 },
      });
      expectShapeInDoc(result.state, "rect-2", {
        type: "rect",
        transform: { x: 130, y: 30 },
      });
      expect(result.state.history.past).toHaveLength(1);
      expect(actionsOfType(result.allActions, "SHAPE_UPDATE")).toHaveLength(2);
    });

    it("déplace toute la sélection déjà constituée", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);

      const result = runGesture(
        initial,
        dragShape("rect-1", { x: 10, y: 20 }, { x: 20, y: 30 }),
      );

      expect(result.state.selection.ids).toEqual(["rect-1", "rect-2"]);
      expectShapeInDoc(result.state, "rect-1", {
        type: "rect",
        transform: { x: 20, y: 30 },
      });
      expectShapeInDoc(result.state, "rect-2", {
        type: "rect",
        transform: { x: 130, y: 30 },
      });
    });

    it("conserve la multi-sélection en re-cliquant une forme déjà sélectionnée", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);

      const { state, session } = runGesture(initial, [
        { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      ]);

      expect(state.selection.ids).toEqual(["rect-1", "rect-2"]);
      expect(session.kind).toBe("move");
    });

    it("ne déplace qu'une forme en cliquant une forme hors sélection", () => {
      const initial = makeEditorWithTwoRects(["rect-1"]);

      const result = runGesture(
        initial,
        dragShape("rect-2", { x: 130, y: 30 }, { x: 140, y: 40 }),
      );

      expect(result.state.selection.ids).toEqual(["rect-2"]);
      expectShapeInDoc(result.state, "rect-1", {
        type: "rect",
        transform: { x: 10, y: 20 },
      });
      expectShapeInDoc(result.state, "rect-2", {
        type: "rect",
        transform: { x: 130, y: 30 },
      });
      expect(actionsOfType(result.allActions, "SHAPE_UPDATE")).toHaveLength(1);
    });

    it("ignore les formes verrouillées dans la sélection", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);
      initial.doc.shapes[0]!.locked = true;

      const result = runGesture(
        initial,
        dragShape("rect-2", { x: 130, y: 30 }, { x: 140, y: 40 }),
      );

      expect(result.state.selection.ids).toEqual(["rect-1", "rect-2"]);
      expectShapeInDoc(result.state, "rect-1", {
        type: "rect",
        transform: { x: 10, y: 20 },
      });
      expectShapeInDoc(result.state, "rect-2", {
        type: "rect",
        transform: { x: 130, y: 30 },
      });
      expect(actionsOfType(result.allActions, "SHAPE_UPDATE")).toEqual([
        expect.objectContaining({ type: "SHAPE_UPDATE", id: "rect-2" }),
      ]);
    });

    it("prévisualise le déplacement de toutes les formes pendant le drag", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);

      const result = runGesture(initial, [
        { type: "shape-down", shapeId: "rect-2", world: { x: 130, y: 30 } },
        { type: "move", world: { x: 140, y: 40 } },
      ]);

      const preview = result.snapshots[1].displayDoc;
      expectShapeInDoc({ doc: preview } as typeof initial, "rect-1", {
        type: "rect",
        transform: { x: 20, y: 30 },
      });
      expectShapeInDoc({ doc: preview } as typeof initial, "rect-2", {
        type: "rect",
        transform: { x: 130, y: 30 },
      });
    });

    it("déplace une ligne et un rectangle ensemble", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.doc.shapes = [
        makeRectShape({ id: "rect-1", transform: { x: 10, y: 20 } }),
        makeLineShape({
          id: "line-1",
          transform: { x: 0, y: 0 },
          x2: 50,
          y2: 0,
        }),
      ];
      initial.selection.ids = ["rect-1", "line-1"];

      const result = runGesture(
        initial,
        dragShape("rect-1", { x: 10, y: 20 }, { x: 15, y: 25 }),
      );

      expectShapeInDoc(result.state, "rect-1", {
        type: "rect",
        transform: { x: 15, y: 25 },
      });
      expectShapeInDoc(result.state, "line-1", {
        type: "line",
        transform: { x: 5, y: 5 },
        x2: 55,
        y2: 5,
      });
    });

    it("borne le groupe au viewBox selon la forme la plus contrainte", () => {
      const viewBox = { x: 0, y: 0, w: 100, h: 100 };
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);
      initial.doc.viewBox = viewBox;
      initial.doc.shapes = [
        makeRectShape({
          id: "rect-1",
          transform: { x: 10, y: 20 },
          w: 30,
          h: 20,
        }),
        makeRectShape({
          id: "rect-2",
          transform: { x: 50, y: 20 },
          w: 30,
          h: 20,
        }),
      ];

      const result = runGesture(
        initial,
        dragShape("rect-1", { x: 0, y: 0 }, { x: 200, y: 0 }),
      );

      expectShapeInDoc(result.state, "rect-1", {
        type: "rect",
        transform: { x: 30, y: 20 },
      });
      expectShapeInDoc(result.state, "rect-2", {
        type: "rect",
        transform: { x: 70, y: 20 },
      });
    });

    it("ne recule pas la sélection en continuant le drag au-delà du bord", () => {
      const viewBox = { x: 0, y: 0, w: 100, h: 100 };
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);
      initial.doc.viewBox = viewBox;
      initial.doc.shapes = [
        makeRectShape({
          id: "rect-1",
          transform: { x: 10, y: 20 },
          w: 30,
          h: 20,
        }),
        makeRectShape({
          id: "rect-2",
          transform: { x: 50, y: 20 },
          w: 30,
          h: 20,
        }),
      ];

      const result = runGesture(initial, [
        { type: "shape-down", shapeId: "rect-1", world: { x: 0, y: 0 } },
        { type: "move", world: { x: 80, y: 0 } },
        { type: "move", world: { x: 200, y: 0 } },
        { type: "up" },
      ]);

      const atBoundary = result.snapshots[1].displayDoc;
      const pastBoundary = result.snapshots[2].displayDoc;
      const rect1AtBoundary = atBoundary.shapes.find((s) => s.id === "rect-1");
      const rect1PastBoundary = pastBoundary.shapes.find(
        (s) => s.id === "rect-1",
      );

      expect(rect1AtBoundary?.transform.x).toBe(30);
      expect(rect1PastBoundary?.transform.x).toBeGreaterThanOrEqual(30);
      expectShapeInDoc(result.state, "rect-1", {
        type: "rect",
        transform: { x: 30, y: 20 },
      });
      expectShapeInDoc(result.state, "rect-2", {
        type: "rect",
        transform: { x: 70, y: 20 },
      });
    });

    it("restaure toutes les formes en un seul undo", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);

      const moved = runGesture(
        initial,
        dragShape("rect-1", { x: 10, y: 20 }, { x: 25, y: 35 }),
      );
      const undone = runGesture(moved.state, [{ type: "undo" }]);

      expectShapeInDoc(undone.state, "rect-1", {
        type: "rect",
        transform: { x: 10, y: 20 },
      });
      expectShapeInDoc(undone.state, "rect-2", {
        type: "rect",
        transform: { x: 120, y: 20 },
      });
      expect(undone.state.selection.ids).toEqual(["rect-1", "rect-2"]);
      expect(canUndo(undone.state)).toBe(false);
      expect(canRedo(undone.state)).toBe(true);
    });
  });
});
