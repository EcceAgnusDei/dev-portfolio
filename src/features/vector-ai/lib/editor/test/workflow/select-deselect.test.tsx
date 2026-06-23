/**
 * @vitest-environment jsdom
 */
import { act, type PointerEvent as ReactPointerEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  makeCubicPathShape,
  makeEditorWithRect,
  makeEditorWithTwoRects,
  makeLineShape,
  makeRectShape,
  makeSampleDoc,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import {
  makePointerEvent,
  renderInteractionHook,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import {
  runGesture,
  type GestureStep,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";

type DispatchMock = ReturnType<typeof vi.fn<(action: EditorAction) => void>>;

function clickShape(
  shapeId: string,
  world: WorldPoint,
  options?: { additive?: boolean },
): GestureStep {
  return {
    type: "shape-down",
    shapeId,
    world,
    additive: options?.additive,
  };
}

function clickBackground(world: WorldPoint): GestureStep {
  return { type: "background-down", world };
}

function docWithTwoRects() {
  return {
    ...createEmptyDoc(),
    shapes: [
      makeRectShape({
        id: "rect-a",
        transform: { x: 10, y: 20 },
        w: 100,
        h: 50,
      }),
      makeRectShape({
        id: "rect-b",
        transform: { x: 200, y: 30 },
        w: 80,
        h: 40,
      }),
    ],
  };
}

describe("workflow: sélection", () => {
  describe("sélection simple", () => {
    it("sélectionne une forme au clic en mode sélection", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.selection.ids = [];

      const { state, session } = runGesture(initial, [
        clickShape("rect-1", { x: 10, y: 20 }),
      ]);

      expect(state.selection.ids).toEqual(["rect-1"]);
      expect(session.kind).toBe("move");
      expect(state.history.past).toHaveLength(0);
    });

    it("permet de déplacer la forme sélectionnée", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.selection.ids = [];

      const { state } = runGesture(initial, [
        clickShape("rect-1", { x: 10, y: 20 }),
        { type: "move", world: { x: 30, y: 40 } },
        { type: "up" },
      ]);

      expect(state.selection.ids).toEqual(["rect-1"]);
      expect(state.doc.shapes[0]?.transform).toEqual({ x: 30, y: 40 });
    });

    it("désélectionne tout en cliquant le fond vide", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.selection.ids = ["rect-1"];

      const { state, session } = runGesture(initial, [
        clickBackground({ x: 5, y: 5 }),
      ]);

      expect(state.selection.ids).toEqual([]);
      expect(session.kind).toBe("idle");
    });

    it("remplace la sélection en cliquant une autre forme", () => {
      const initial = makeEditorWithTwoRects(["rect-1"]);

      const { state, session } = runGesture(initial, [
        clickShape("rect-2", { x: 130, y: 30 }),
      ]);

      expect(state.selection.ids).toEqual(["rect-2"]);
      expect(session.kind).toBe("move");
    });

    it("conserve la sélection unique en re-cliquant la même forme", () => {
      const initial = makeEditorWithTwoRects(["rect-1"]);

      const { state, session } = runGesture(initial, [
        clickShape("rect-1", { x: 10, y: 20 }),
      ]);

      expect(state.selection.ids).toEqual(["rect-1"]);
      expect(session.kind).toBe("move");
    });

    it("affiche un contour de sélection sans modifier le style de la forme", () => {
      const markup = renderToStaticMarkup(
        <VectorCanvas doc={makeSampleDoc()} selectedIds={["rect-1"]} />,
      );

      expect(markup).toContain('fill="#111111"');
      expect(markup).toContain('stroke="none"');
      expect(markup).toContain('data-layer="selection-outlines"');
      expect(markup).toContain('stroke="var(--primary)"');
      expect(markup).toContain('stroke-dasharray="4 2"');
    });

    it("affiche les poignées de redimensionnement quand une seule forme est sélectionnée", () => {
      const doc = docWithTwoRects();

      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={doc}
          selectedIds={["rect-a"]}
          onRectHandlePointerDown={() => {}}
        />,
      );

      expect(markup).toContain("data-rect-handle");
    });

    it("trace le contour extérieur du trait pour une ligne sélectionnée", () => {
      const doc = {
        ...createEmptyDoc(),
        shapes: [
          makeLineShape({
            id: "line-1",
            transform: { x: 0, y: 0 },
            x2: 100,
            y2: 0,
          }),
        ],
      };

      const markup = renderToStaticMarkup(
        <VectorCanvas doc={doc} selectedIds={["line-1"]} />,
      );

      expect(markup).toContain('data-selection-outline="true"');
      expect(markup).toMatch(/d="M [^"]*Z"/);
      expect(markup).not.toMatch(/<line[^>]*data-selection-outline/);
    });

    it("trace le contour extérieur du trait pour une courbe sélectionnée", () => {
      const doc = {
        ...createEmptyDoc(),
        shapes: [makeCubicPathShape({ id: "path-1" })],
      };

      const markup = renderToStaticMarkup(
        <VectorCanvas doc={doc} selectedIds={["path-1"]} />,
      );

      expect(markup).toContain("data-selection-outline");
      expect(markup).toMatch(/d="M [^"]*Z"/);
      expect(markup).toContain('stroke-dasharray="4 2"');
    });

    it("n'affiche aucun contour sans sélection", () => {
      const markup = renderToStaticMarkup(
        <VectorCanvas doc={docWithTwoRects()} selectedIds={[]} />,
      );

      expect(markup).not.toContain('data-layer="selection-outlines"');
    });
  });

  describe("multi-sélection (Ctrl / Cmd)", () => {
    it("ajoute une forme à la sélection avec Ctrl+clic", () => {
      const initial = makeEditorWithTwoRects(["rect-1"]);

      const { state, session } = runGesture(initial, [
        clickShape("rect-2", { x: 130, y: 30 }, { additive: true }),
      ]);

      expect(state.selection.ids).toEqual(["rect-1", "rect-2"]);
      expect(session.kind).toBe("move");
    });

    it("retire une forme de la sélection avec Ctrl+clic", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);

      const { state, session } = runGesture(initial, [
        clickShape("rect-1", { x: 10, y: 20 }, { additive: true }),
      ]);

      expect(state.selection.ids).toEqual(["rect-2"]);
      expect(session.kind).toBe("idle");
    });

    it("construit une sélection de trois formes par ajouts successifs", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.doc.shapes = [
        makeRectShape({ id: "rect-1" }),
        makeRectShape({ id: "rect-2", transform: { x: 120, y: 20 } }),
        makeRectShape({ id: "rect-3", transform: { x: 240, y: 20 } }),
      ];
      initial.selection.ids = ["rect-1"];

      const { state } = runGesture(initial, [
        clickShape("rect-2", { x: 130, y: 30 }, { additive: true }),
        clickShape("rect-3", { x: 250, y: 30 }, { additive: true }),
      ]);

      expect(state.selection.ids).toEqual(["rect-1", "rect-2", "rect-3"]);
    });

    it("désélectionne tout au clic fond même après une multi-sélection", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);

      const { state } = runGesture(initial, [
        clickBackground({ x: 5, y: 5 }),
      ]);

      expect(state.selection.ids).toEqual([]);
    });

    it("affiche un contour par forme en multi-sélection", () => {
      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={docWithTwoRects()}
          selectedIds={["rect-a", "rect-b"]}
        />,
      );

      expect(markup).toContain('data-layer="selection-outlines"');
      expect(markup.match(/data-selection-outline/g)?.length).toBe(2);
      expect(markup).toContain('stroke-dasharray="4 2"');
    });

    it("n'affiche pas les poignées de redimensionnement en multi-sélection", () => {
      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={docWithTwoRects()}
          selectedIds={["rect-a", "rect-b"]}
          onRectHandlePointerDown={() => {}}
        />,
      );

      expect(markup).not.toContain("data-rect-handle");
    });

    describe("raccourcis clavier dans le canvas", () => {
      let dispatch: DispatchMock;

      beforeAll(() => {
        (
          globalThis as typeof globalThis & {
            IS_REACT_ACT_ENVIRONMENT?: boolean;
          }
        ).IS_REACT_ACT_ENVIRONMENT = true;
      });

      beforeEach(() => {
        dispatch = vi.fn();
      });

      afterEach(() => {
        vi.clearAllMocks();
      });

      it("interprète Ctrl+clic comme ajout à la sélection", () => {
        const state = makeEditorWithTwoRects(["rect-1"]);
        const harness = renderInteractionHook(state, dispatch);

        act(() => {
          harness.interaction.onShapePointerDown(
            "rect-2",
            makePointerEvent({ clientX: 130, clientY: 30, ctrlKey: true }),
          );
        });

        expect(dispatch).toHaveBeenCalledWith({
          type: "SELECTION_SET",
          ids: ["rect-1", "rect-2"],
        });
        harness.unmount();
      });

      it("interprète Cmd+clic comme ajout à la sélection (Mac)", () => {
        const state = makeEditorWithTwoRects(["rect-1"]);
        const harness = renderInteractionHook(state, dispatch);

        act(() => {
          harness.interaction.onShapePointerDown(
            "rect-2",
            makePointerEvent({ clientX: 130, clientY: 30, metaKey: true }),
          );
        });

        expect(dispatch).toHaveBeenCalledWith({
          type: "SELECTION_SET",
          ids: ["rect-1", "rect-2"],
        });
        harness.unmount();
      });
    });
  });

  describe("cas limites", () => {
    it("n'accroche pas une forme verrouillée", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.doc.shapes = [
        makeRectShape({ id: "rect-1" }),
        makeRectShape({
          id: "rect-2",
          locked: true,
          transform: { x: 120, y: 20 },
        }),
      ];
      initial.selection.ids = ["rect-1"];

      const { state, session } = runGesture(initial, [
        clickShape("rect-2", { x: 130, y: 30 }),
      ]);

      expect(state.selection.ids).toEqual(["rect-1"]);
      expect(session.kind).toBe("idle");
    });

    it("n'accroche pas une forme hors mode sélection", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.tool = "rect";
      initial.selection.ids = [];

      const { state, session } = runGesture(initial, [
        clickShape("rect-1", { x: 10, y: 20 }),
      ]);

      expect(state.selection.ids).toEqual([]);
      expect(session.kind).toBe("idle");
    });

    it("ne déplace pas une forme qu'on vient de retirer avec Ctrl+clic", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);

      const { state, allActions } = runGesture(initial, [
        clickShape("rect-1", { x: 10, y: 20 }, { additive: true }),
        { type: "move", world: { x: 40, y: 50 } },
        { type: "up" },
      ]);

      expect(state.selection.ids).toEqual(["rect-2"]);
      expect(allActions).not.toContainEqual(
        expect.objectContaining({ type: "SHAPE_UPDATE" }),
      );
    });

    it("ne déplace pas après Ctrl+clic de retrait même via le câblage React", () => {
      const dispatch = vi.fn();
      const state = makeEditorWithTwoRects(["rect-1", "rect-2"]);
      const harness = renderInteractionHook(state, dispatch);

      act(() => {
        harness.interaction.onShapePointerDown(
          "rect-1",
          makePointerEvent({ clientX: 10, clientY: 20, ctrlKey: true }),
        );
      });
      act(() => {
        harness.interaction.onSvgPointerMove(
          makePointerEvent({
            clientX: 40,
            clientY: 50,
          }) as ReactPointerEvent<SVGSVGElement>,
        );
      });
      act(() => {
        harness.interaction.onSvgPointerUp(
          makePointerEvent({
            clientX: 40,
            clientY: 50,
          }) as ReactPointerEvent<SVGSVGElement>,
        );
      });

      expect(dispatch).toHaveBeenCalledWith({
        type: "SELECTION_SET",
        ids: ["rect-2"],
      });
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "SHAPE_UPDATE" }),
      );
      harness.unmount();
    });

    it("nettoie un id de sélection obsolète au prochain clic forme", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.selection.ids = ["gone"];

      const { state } = runGesture(initial, [
        clickShape("rect-1", { x: 10, y: 20 }),
      ]);

      expect(state.selection.ids).toEqual(["rect-1"]);
    });
  });
});
