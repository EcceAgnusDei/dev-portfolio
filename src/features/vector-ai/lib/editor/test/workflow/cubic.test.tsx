/**
 * @vitest-environment jsdom
 */
import "@/features/vector-ai/lib/editor/test/mock-create-shape-id";

import { act, type PointerEvent as ReactPointerEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type {
  CubicHandle,
  CubicWorldPoints,
} from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import { cubicWorldPointsFromPathShape } from "@/features/vector-ai/lib/editor/geometry/path-segments";
import { shapePointerEventsForTool } from "@/features/vector-ai/lib/editor/pointer/handlers";
import {
  expectAfterCreate,
  expectAfterMove,
  expectDocUnchanged,
  expectShapeCount,
  expectShapeInDoc,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  CUBIC_REFERENCE_PATH_D,
  CUBIC_REFERENCE_SEGMENTS,
  CUBIC_REFERENCE_TRANSFORM,
  CUBIC_REFERENCE_WORLD,
  makeCubicPathShape,
  makeEditorWithRect,
  makeLineShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import {
  makePointerEvent,
  renderInteractionHook,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import {
  actionsOfType,
  lastSnapshot,
  runGesture,
  type GestureStep,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import { ShapeView } from "@/features/vector-ai/lib/view/shape-view";
import { serializeToSvg } from "@/features/vector-ai/lib/view/serialize-to-svg";
import { segmentsToPathD } from "@/features/vector-ai/lib/view/segments-to-path-d";
import { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";
import { VECTOR_AI_MIN_CUBIC_POINT_DISTANCE } from "@/features/vector-ai/lib/vector-ai-config";

const LINE_REFERENCE_MIDPOINT = { x: 200, y: 300 };

const NEW_CUBIC_WORLD: CubicWorldPoints = {
  p0: LINE_REFERENCE_MIDPOINT,
  c1: { x: 220, y: 280 },
  c2: { x: 260, y: 320 },
  p3: CUBIC_REFERENCE_WORLD.p3,
};

function svgLineHitTarget(): SVGLineElement {
  return document.createElementNS("http://www.w3.org/2000/svg", "line");
}

function svgPathHitTarget(): SVGPathElement {
  return document.createElementNS("http://www.w3.org/2000/svg", "path");
}

function makeEditorWithCubicTool() {
  const state = makeEditorWithRect();
  state.tool = "cubic";
  return state;
}

function clickSvgAt(
  interaction: ReturnType<typeof renderInteractionHook>["interaction"],
  point: { x: number; y: number },
  target: Element,
) {
  act(() => {
    interaction.onSvgPointerDown(
      makePointerEvent({
        clientX: point.x,
        clientY: point.y,
        target,
      }) as ReactPointerEvent<SVGSVGElement>,
    );
  });
}

function makeEditorWithCubicPath(id = "path-1") {
  const state = makeEditorWithRect();
  state.doc.shapes = [makeCubicPathShape({ id })];
  return state;
}

function cubicCreateSteps(points: CubicWorldPoints): GestureStep[] {
  return [
    { type: "background-down", world: points.p0 },
    { type: "background-down", world: points.c1 },
    { type: "background-down", world: points.c2 },
    { type: "background-down", world: points.p3 },
  ];
}

function cubicHandleDrag(
  shapeId: string,
  handle: CubicHandle,
  from: { x: number; y: number },
  to: { x: number; y: number },
): GestureStep[] {
  return [
    { type: "cubic-handle-down", shapeId, handle, world: from },
    { type: "move", world: to },
    { type: "up" },
  ];
}

describe("courbe cubique", () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  describe("création", () => {
    it("crée un path cubique en 4 clics", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(
        initial,
        cubicCreateSteps(CUBIC_REFERENCE_WORLD),
      );

      expectAfterCreate(result, "new-shape-id", {
        type: "path",
        transform: CUBIC_REFERENCE_TRANSFORM,
        segments: CUBIC_REFERENCE_SEGMENTS,
      });
      expectShapeCount(result.state, initial.doc.shapes.length + 1);
    });

    it("n'affiche pas de preview avant le survol après le 1er clic", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.p0 },
      ]);

      expect(result.snapshots[0].session).toEqual(
        expect.objectContaining({
          kind: "create-cubic",
          step: 2,
          placed: { p0: CUBIC_REFERENCE_WORLD.p0 },
        }),
      );
      expect(result.snapshots[0].previews.cubic).toBeNull();
    });

    it("prévisualise la courbe pendant le placement des points", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.p0 },
        { type: "move", world: CUBIC_REFERENCE_WORLD.c1 },
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.c1 },
        { type: "move", world: CUBIC_REFERENCE_WORLD.c2 },
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.c2 },
        { type: "move", world: CUBIC_REFERENCE_WORLD.p3 },
      ]);

      expect(result.snapshots[1].previews.cubic?.kind).toBe("segment-p0-hover");
      expect(result.snapshots[1].previews.cubic?.transform).toEqual(
        CUBIC_REFERENCE_TRANSFORM,
      );
      expect(result.snapshots[3].previews.cubic?.kind).toBe(
        "segment-p0-c1-hover",
      );
      expect(result.snapshots[5].previews.cubic?.kind).toBe(
        "curve-p0-c1-c2-hover",
      );
    });

    it("garde P0 fixe pendant la création", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.p0 },
        { type: "move", world: { x: 80, y: 60 } },
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.c1 },
        { type: "move", world: { x: 90, y: 70 } },
      ]);

      for (const snap of result.snapshots) {
        if (snap.session.kind === "create-cubic") {
          expect(snap.session.placed.p0).toEqual(CUBIC_REFERENCE_WORLD.p0);
        }
      }
    });

    it("ignore un clic trop proche du point précédent", () => {
      const initial = makeEditorWithCubicTool();
      const tooClose = {
        x: CUBIC_REFERENCE_WORLD.p0.x + VECTOR_AI_MIN_CUBIC_POINT_DISTANCE / 2,
        y: CUBIC_REFERENCE_WORLD.p0.y,
      };

      const result = runGesture(initial, [
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.p0 },
        { type: "background-down", world: tooClose },
      ]);

      expect(result.session).toEqual(
        expect.objectContaining({ kind: "create-cubic", step: 2 }),
      );
      expect(actionsOfType(result.allActions, "SHAPE_ADD")).toHaveLength(0);
    });

    it("n'ajoute pas une courbe si le dernier clic est trop proche de C2", () => {
      const initial = makeEditorWithCubicTool();
      const tooCloseToC2 = {
        x: CUBIC_REFERENCE_WORLD.c2.x + 0.5,
        y: CUBIC_REFERENCE_WORLD.c2.y,
      };

      const result = runGesture(initial, [
        ...cubicCreateSteps({
          ...CUBIC_REFERENCE_WORLD,
          p3: tooCloseToC2,
        }).slice(0, 3),
        { type: "background-down", world: tooCloseToC2 },
      ]);

      expect(actionsOfType(result.allActions, "SHAPE_ADD")).toHaveLength(0);
      expectDocUnchanged(initial, result.state);
      expect(result.state.tool).toBe("cubic");
    });

    it("borne la preview au viewBox quand le curseur déborde", () => {
      const viewBox = { x: 0, y: 0, w: 100, h: 100 };
      const initial = makeEditorWithCubicTool();
      initial.doc.viewBox = viewBox;

      const result = runGesture(initial, [
        { type: "background-down", world: { x: 95, y: 95 } },
        { type: "move", world: { x: 150, y: 150 } },
      ]);

      const preview = result.snapshots[1].previews.cubic;
      expect(preview).not.toBeNull();
      expect(preview!.transform).toEqual({ x: 95, y: 95 });
      expect(preview!.d).toContain("C 5 5");
    });

    it("borne les points au viewBox à la création", () => {
      const viewBox = { x: 0, y: 0, w: 100, h: 100 };
      const initial = makeEditorWithCubicTool();
      initial.doc.viewBox = viewBox;

      const result = runGesture(initial, [
        { type: "background-down", world: { x: 95, y: 95 } },
        { type: "background-down", world: { x: 110, y: 80 } },
        { type: "background-down", world: { x: 120, y: 110 } },
        { type: "background-down", world: { x: 105, y: 100 } },
      ]);

      const shape = getShapeById(result.state.doc, "new-shape-id");
      expect(shape?.type).toBe("path");
      if (shape?.type !== "path") return;

      const world = cubicWorldPointsFromPathShape(shape);
      expect(world).not.toBeNull();
      for (const point of Object.values(world!)) {
        expect(point.x).toBeLessThanOrEqual(viewBox.x + viewBox.w);
        expect(point.y).toBeLessThanOrEqual(viewBox.y + viewBox.h);
        expect(point.x).toBeGreaterThanOrEqual(viewBox.x);
        expect(point.y).toBeGreaterThanOrEqual(viewBox.y);
      }
    });
  });

  describe("session de création", () => {
    it("annule la session au changement d'outil", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.p0 },
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.c1 },
        { type: "tool-set", tool: "select" },
      ]);

      expect(lastSnapshot(result).session.kind).toBe("idle");
      expectDocUnchanged(initial, result.state);
      expect(result.state.tool).toBe("select");
    });

    it("annule la session sur cancel-session (Escape)", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.p0 },
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.c1 },
        { type: "cancel-session" },
      ]);

      expect(lastSnapshot(result).session.kind).toBe("idle");
      expectDocUnchanged(initial, result.state);
    });

    it("n'ajoute pas de forme si la session est annulée au pointercancel", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.p0 },
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.c1 },
        { type: "pointer-cancel" },
      ]);

      expect(lastSnapshot(result).session.kind).toBe("idle");
      expectDocUnchanged(initial, result.state);
    });

    it("réinitialise la session si l'outil n'est plus cubic", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        { type: "background-down", world: CUBIC_REFERENCE_WORLD.p0 },
        { type: "tool-set", tool: "select" },
        { type: "background-down", world: { x: 0, y: 0 } },
      ]);

      expect(lastSnapshot(result).session.kind).toBe("idle");
      expect(result.state.selection.ids).toEqual([]);
    });

    it("n'interagit pas avec les formes pendant l'outil cubic", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      ]);

      expect(result.session.kind).toBe("idle");
      expect(result.state.selection.ids).toEqual([]);
    });
  });

  describe("création sur formes existantes", () => {
    it("crée une courbe en cliquant sur des hit areas de ligne et de courbe existantes", () => {
      const state = makeEditorWithCubicTool();
      state.doc.shapes = [
        makeLineShape({ id: "line-1" }),
        makeCubicPathShape({ id: "existing-path" }),
      ];
      const dispatch = vi.fn();
      const { interaction, unmount } = renderInteractionHook(state, dispatch);

      clickSvgAt(interaction, NEW_CUBIC_WORLD.p0, svgLineHitTarget());
      clickSvgAt(interaction, NEW_CUBIC_WORLD.c1, svgPathHitTarget());
      clickSvgAt(interaction, NEW_CUBIC_WORLD.c2, svgLineHitTarget());
      clickSvgAt(interaction, NEW_CUBIC_WORLD.p3, svgPathHitTarget());

      expect(interaction.session).toEqual({ kind: "idle" });
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SHAPE_ADD",
          shape: expect.objectContaining({
            id: "new-shape-id",
            type: "path",
            transform: { x: NEW_CUBIC_WORLD.p0.x, y: NEW_CUBIC_WORLD.p0.y },
          }),
        }),
      );
      expect(dispatch).toHaveBeenCalledWith({
        type: "SELECTION_SET",
        ids: ["new-shape-id"],
      });
      expect(dispatch).toHaveBeenCalledWith({ type: "TOOL_SET", tool: "select" });
      unmount();
    });
  });

  describe("curseur au-dessus de formes existantes", () => {
    it("désactive les pointer events forme en mode cubic", () => {
      expect(shapePointerEventsForTool("cubic")).toBe("none");
    });

    it("n'affiche pas cursor move sur une ligne en mode dessin", () => {
      const doc = {
        ...createEmptyDoc(),
        shapes: [makeLineShape({ id: "line-1" })],
      };

      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={doc}
          shapePointerEvents="none"
          onShapePointerDown={() => {}}
          onPointerDown={() => {}}
        />,
      );

      expect(markup).toContain("pointer-events:none");
      expect(markup).not.toContain("cursor:move");
    });

    it("n'affiche pas cursor move sur une courbe en mode dessin", () => {
      const doc = {
        ...createEmptyDoc(),
        shapes: [makeCubicPathShape({ id: "path-1" })],
      };

      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={doc}
          shapePointerEvents="none"
          onShapePointerDown={() => {}}
          onPointerDown={() => {}}
        />,
      );

      expect(markup).toContain("pointer-events:none");
      expect(markup).not.toContain("cursor:move");
    });

    it("conserve cursor move en mode sélection pour comparaison", () => {
      const doc = {
        ...createEmptyDoc(),
        shapes: [makeLineShape({ id: "line-1" })],
      };

      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={doc}
          shapePointerEvents="auto"
          onShapePointerDown={() => {}}
          onPointerDown={() => {}}
        />,
      );

      expect(markup).toContain("cursor:move");
    });
  });

  describe("sélection et déplacement", () => {
    it("déplace toute la courbe sans modifier les segments locaux", () => {
      const initial = makeEditorWithCubicPath();

      const result = runGesture(initial, [
        {
          type: "shape-down",
          shapeId: "path-1",
          world: CUBIC_REFERENCE_WORLD.p0,
        },
        { type: "move", world: { x: 20, y: 30 } },
        { type: "up" },
      ]);

      expectAfterMove(result, "path-1", {
        type: "path",
        transform: { x: 20, y: 30 },
        segments: CUBIC_REFERENCE_SEGMENTS,
      });
    });

    it("commit un déplacement de courbe borné au viewBox", () => {
      const viewBox = { x: 0, y: 0, w: 100, h: 100 };
      const initial = makeEditorWithCubicPath();
      initial.doc.viewBox = viewBox;

      const result = runGesture(initial, [
        {
          type: "shape-down",
          shapeId: "path-1",
          world: CUBIC_REFERENCE_WORLD.p0,
        },
        { type: "move", world: { x: 200, y: 200 } },
        { type: "up" },
      ]);

      const shape = getShapeById(result.state.doc, "path-1");
      expect(shape?.type).toBe("path");
      if (shape?.type !== "path") return;

      const world = cubicWorldPointsFromPathShape(shape);
      expect(world).not.toBeNull();
      const xs = [world!.p0.x, world!.c1.x, world!.c2.x, world!.p3.x];
      const ys = [world!.p0.y, world!.c1.y, world!.c2.y, world!.p3.y];
      expect(Math.max(...xs)).toBeLessThanOrEqual(viewBox.x + viewBox.w);
      expect(Math.max(...ys)).toBeLessThanOrEqual(viewBox.y + viewBox.h);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(viewBox.x);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(viewBox.y);
    });

    it("ignore le déplacement d'une courbe verrouillée", () => {
      const initial = makeEditorWithCubicPath();
      initial.doc.shapes = [makeCubicPathShape({ id: "path-1", locked: true })];

      const result = runGesture(initial, [
        {
          type: "shape-down",
          shapeId: "path-1",
          world: CUBIC_REFERENCE_WORLD.p0,
        },
        { type: "move", world: { x: 20, y: 30 } },
        { type: "up" },
      ]);

      expect(result.session.kind).toBe("idle");
      expectShapeInDoc(result.state, "path-1", {
        transform: CUBIC_REFERENCE_TRANSFORM,
      });
      expect(result.state.history.past).toHaveLength(0);
    });
  });

  describe("édition des poignées", () => {
    it("déplace uniquement C1", () => {
      const initial = makeEditorWithCubicPath();
      const nextC1 = { x: 35, y: 15 };

      const result = runGesture(
        initial,
        cubicHandleDrag("path-1", "c1", CUBIC_REFERENCE_WORLD.c1, nextC1),
      );

      const shape = getShapeById(result.state.doc, "path-1");
      expect(shape?.type).toBe("path");
      if (shape?.type !== "path") return;

      const world = cubicWorldPointsFromPathShape(shape);
      expect(world?.c1).toEqual(nextC1);
      expect(world?.p0).toEqual(CUBIC_REFERENCE_WORLD.p0);
      expect(world?.c2).toEqual(CUBIC_REFERENCE_WORLD.c2);
      expect(world?.p3).toEqual(CUBIC_REFERENCE_WORLD.p3);
      expectAfterMove(result, "path-1", { type: "path" });
    });

    it("déplace uniquement P3", () => {
      const initial = makeEditorWithCubicPath();
      const nextP3 = { x: 80, y: 30 };

      const result = runGesture(
        initial,
        cubicHandleDrag("path-1", "p3", CUBIC_REFERENCE_WORLD.p3, nextP3),
      );

      const world = cubicWorldPointsFromPathShape(
        getShapeById(result.state.doc, "path-1") as ReturnType<
          typeof makeCubicPathShape
        >,
      );
      expect(world?.p3).toEqual(nextP3);
      expect(world?.p0).toEqual(CUBIC_REFERENCE_WORLD.p0);
    });

    it("déplace P0 et recalcule la courbe", () => {
      const initial = makeEditorWithCubicPath();
      const nextP0 = { x: 20, y: 25 };

      const result = runGesture(
        initial,
        cubicHandleDrag("path-1", "p0", CUBIC_REFERENCE_WORLD.p0, nextP0),
      );

      const shape = getShapeById(result.state.doc, "path-1");
      expect(shape?.type).toBe("path");
      if (shape?.type !== "path") return;

      expect(shape.transform).toEqual(nextP0);
      const world = cubicWorldPointsFromPathShape(shape);
      expect(world?.p0).toEqual(nextP0);
      expect(world?.c1).toEqual(CUBIC_REFERENCE_WORLD.c1);
      expect(world?.p3).toEqual(CUBIC_REFERENCE_WORLD.p3);
    });

    it("prévisualise le déplacement d'une poignée avant commit", () => {
      const initial = makeEditorWithCubicPath();
      const nextC1 = { x: 35, y: 15 };

      const result = runGesture(initial, [
        {
          type: "cubic-handle-down",
          shapeId: "path-1",
          handle: "c1",
          world: CUBIC_REFERENCE_WORLD.c1,
        },
        { type: "move", world: nextC1 },
      ]);

      const previewShape = result.snapshots[1].displayDoc.shapes[0];
      expect(previewShape?.type).toBe("path");
      if (previewShape?.type !== "path") return;

      const world = cubicWorldPointsFromPathShape(previewShape);
      expect(world?.c1).toEqual(nextC1);
    });

    it("borne une poignée au viewBox", () => {
      const viewBox = { x: 0, y: 0, w: 100, h: 100 };
      const initial = makeEditorWithCubicPath();
      initial.doc.viewBox = viewBox;

      const result = runGesture(
        initial,
        cubicHandleDrag("path-1", "p3", CUBIC_REFERENCE_WORLD.p3, {
          x: 150,
          y: 150,
        }),
      );

      const shape = getShapeById(result.state.doc, "path-1");
      expect(shape?.type).toBe("path");
      if (shape?.type !== "path") return;

      const world = cubicWorldPointsFromPathShape(shape);
      expect(world?.p3).toEqual({ x: 100, y: 100 });
    });

    it("ignore l'édition des poignées si la courbe est verrouillée", () => {
      const initial = makeEditorWithCubicPath();
      initial.doc.shapes = [makeCubicPathShape({ id: "path-1", locked: true })];

      const result = runGesture(
        initial,
        cubicHandleDrag("path-1", "c1", CUBIC_REFERENCE_WORLD.c1, {
          x: 35,
          y: 15,
        }),
      );

      expect(result.session.kind).toBe("idle");
      expectShapeInDoc(result.state, "path-1", {
        segments: CUBIC_REFERENCE_SEGMENTS,
      });
    });

    it("n'édite pas les poignées hors mode sélection", () => {
      const initial = makeEditorWithCubicPath();
      initial.tool = "rect";

      const result = runGesture(
        initial,
        cubicHandleDrag("path-1", "c1", CUBIC_REFERENCE_WORLD.c1, {
          x: 35,
          y: 15,
        }),
      );

      expect(result.session.kind).toBe("idle");
      expectShapeInDoc(result.state, "path-1", {
        segments: CUBIC_REFERENCE_SEGMENTS,
      });
    });
  });

  describe("historique", () => {
    it("undo après création supprime la courbe", () => {
      const initial = makeEditorWithCubicTool();

      const result = runGesture(initial, [
        ...cubicCreateSteps(CUBIC_REFERENCE_WORLD),
        { type: "undo" },
      ]);

      expectShapeCount(result.state, initial.doc.shapes.length);
      expect(result.state.selection.ids).toEqual([]);
    });

    it("undo après déplacement de poignée restaure la courbe", () => {
      const initial = makeEditorWithCubicPath();

      const result = runGesture(initial, [
        ...cubicHandleDrag("path-1", "c1", CUBIC_REFERENCE_WORLD.c1, {
          x: 35,
          y: 15,
        }),
        { type: "undo" },
      ]);

      expectShapeInDoc(result.state, "path-1", {
        segments: CUBIC_REFERENCE_SEGMENTS,
      });
    });
  });

  describe("rendu et export", () => {
    it("rend un path cubique avec hit area et coords locales", () => {
      const markup = renderToStaticMarkup(
        <ShapeView shape={makeCubicPathShape()} onPointerDown={() => {}} />,
      );

      expect(markup).toMatch(/^<g\b/);
      expect(markup).toContain('transform="translate(10 20)"');
      expect(markup).toContain(`d="${CUBIC_REFERENCE_PATH_D}"`);
      expect(markup).toContain('stroke="#000000"');
      expect(markup.match(/<path\b/g)?.length).toBe(2);
    });

    it("exporte la courbe en SVG", () => {
      const svg = serializeToSvg({
        version: 1,
        viewBox: { x: 0, y: 0, w: 800, h: 600 },
        shapes: [makeCubicPathShape()],
      });

      expect(svg).toContain("<path");
      expect(svg).toContain(`d="${CUBIC_REFERENCE_PATH_D}"`);
      expect(svg).toContain('stroke-width="2"');
    });

    it("convertit les segments de référence en d SVG attendu", () => {
      expect(segmentsToPathD(CUBIC_REFERENCE_SEGMENTS)).toBe(
        "M 0 0 C 20 -10 40 20 60 0",
      );
    });
  });
});
