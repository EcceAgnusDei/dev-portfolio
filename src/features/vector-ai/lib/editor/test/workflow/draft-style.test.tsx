/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  canUndo,
  getShapeById,
  getStyleControlState,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { EditorState, EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import {
  makeEditorWithRect,
  makeEditorWithTwoRects,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import {
  changeColorInput,
  changeNumberInput,
  clickButton,
  queryColorFieldNoneButton,
  queryColorInput,
  queryStrokeWidthInput,
  renderStyleToolbarHarness,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import { applyEditorActions } from "@/features/vector-ai/lib/editor/test/run-gesture";

function withDrawingTool(tool: Exclude<EditorTool, "select">) {
  const state = makeEditorWithRect();
  state.tool = tool;
  return state;
}

function withSelectSelection(
  state: EditorState,
  ids: string[],
): EditorState {
  return {
    ...state,
    tool: "select",
    selection: { ids },
  };
}

function twoRectsWithFills(fillA: string, fillB: string) {
  const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);
  initial.doc.shapes = [
    makeRectShape({
      id: "rect-1",
      style: { fill: fillA, stroke: "none" },
    }),
    makeRectShape({
      id: "rect-2",
      transform: { x: 120, y: 20 },
      style: { fill: fillB, stroke: "none" },
    }),
  ];
  return initial;
}

describe("workflow: couleur UI → EditorState", () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("mode draft", () => {
    it("met à jour draftStyle.fill via le picker de remplissage", () => {
      const harness = renderStyleToolbarHarness(withDrawingTool("rect"));

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      const state = harness.getState();
      expect(state.draftStyle.fill).toBe("#aabbcc");
      expect(getStyleControlState(state).values.fill).toBe("#aabbcc");
      expect(getStyleControlState(state).mode).toBe("draft");
      harness.unmount();
    });

    it("met à jour draftStyle.stroke via le picker de contour", () => {
      const harness = renderStyleToolbarHarness(withDrawingTool("line"));

      changeColorInput(
        queryColorInput(harness.container, "Couleur de contour"),
        "#112233",
      );

      const state = harness.getState();
      expect(state.draftStyle.stroke).toBe("#112233");
      expect(getStyleControlState(state).values.stroke).toBe("#112233");
      harness.unmount();
    });

    it("met à jour draftStyle.strokeWidth via l'input épaisseur", () => {
      const initial = withDrawingTool("line");
      initial.draftStyle = {
        ...initial.draftStyle,
        stroke: "#000000",
      };
      const harness = renderStyleToolbarHarness(initial);

      changeNumberInput(queryStrokeWidthInput(harness.container), "5");

      expect(harness.getState().draftStyle.strokeWidth).toBe(5);
      harness.unmount();
    });

    it("bascule fill sur none puis restaure la teinte via Aucun", () => {
      const harness = renderStyleToolbarHarness(withDrawingTool("rect"));

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#ff0000",
      );
      expect(harness.getState().draftStyle.fill).toBe("#ff0000");

      clickButton(
        queryColorFieldNoneButton(harness.container, "Couleur de remplissage"),
      );
      expect(harness.getState().draftStyle.fill).toBe("none");

      clickButton(
        queryColorFieldNoneButton(harness.container, "Couleur de remplissage"),
      );
      expect(harness.getState().draftStyle.fill).toBe("#ff0000");
      harness.unmount();
    });

    it("ne modifie pas le document en mode draft", () => {
      const initial = withDrawingTool("rect");
      const shapesBefore = initial.doc.shapes;
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      expect(harness.getState().doc.shapes).toBe(shapesBefore);
      expect(harness.getState().history).toEqual({ past: [], future: [] });
      harness.unmount();
    });

    it("reste en mode idle sans sélection en outil sélection", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.tool = "select";
      initial.selection = { ids: [] };
      const draftBefore = { ...initial.draftStyle };
      const harness = renderStyleToolbarHarness(initial);

      expect(getStyleControlState(harness.getState()).mode).toBe("idle");
      expect(getStyleControlState(harness.getState()).visibility).toEqual({
        fill: false,
        stroke: false,
        strokeWidth: false,
      });
      expect(() =>
        queryColorInput(harness.container, "Couleur de remplissage"),
      ).toThrow("Input couleur introuvable");
      expect(harness.getState().draftStyle).toEqual(draftBefore);
      harness.unmount();
    });
  });

  describe("sélection simple", () => {
    it("met à jour le style de la forme sélectionnée via le picker", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.tool = "select";
      initial.selection = { ids: ["rect-1"] };
      initial.doc.shapes = [makeRectShape({ id: "rect-1" })];
      const draftBefore = { ...initial.draftStyle };
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      const state = harness.getState();
      expect(getStyleControlState(state).mode).toBe("selection");
      expect(getShapeById(state.doc, "rect-1")?.style.fill).toBe("#aabbcc");
      expect(state.draftStyle).toEqual(draftBefore);
      harness.unmount();
    });

    it("met à jour stroke et strokeWidth de la forme en sélection", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.tool = "select";
      initial.selection = { ids: ["rect-1"] };
      initial.doc.shapes = [
        makeRectShape({
          id: "rect-1",
          style: {
            fill: "#000000",
            stroke: "#000000",
            strokeWidth: 2,
          },
        }),
      ];
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de contour"),
        "#445566",
      );
      changeNumberInput(queryStrokeWidthInput(harness.container), "6");

      const shape = getShapeById(harness.getState().doc, "rect-1");
      expect(shape?.style).toEqual({
        fill: "#000000",
        stroke: "#445566",
        strokeWidth: 6,
      });
      harness.unmount();
    });
  });

  describe("sélection multiple", () => {
    it("reste en mode sélection avec plusieurs formes sélectionnées", () => {
      const harness = renderStyleToolbarHarness(
        twoRectsWithFills("#111111", "#111111"),
      );

      expect(getStyleControlState(harness.getState()).mode).toBe("selection");
      harness.unmount();
    });

    it("applique le fill à toutes les formes sélectionnées", () => {
      const initial = twoRectsWithFills("#111111", "#222222");
      const draftBefore = { ...initial.draftStyle };
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      const state = harness.getState();
      expect(getShapeById(state.doc, "rect-1")?.style.fill).toBe("#aabbcc");
      expect(getShapeById(state.doc, "rect-2")?.style.fill).toBe("#aabbcc");
      expect(state.draftStyle).toEqual(draftBefore);
      harness.unmount();
    });

    it("applique stroke et strokeWidth à toutes les formes sélectionnées", () => {
      const initial = withSelectSelection(makeEditorWithTwoRects(), [
        "rect-1",
        "rect-2",
      ]);
      initial.doc.shapes = [
        makeRectShape({
          id: "rect-1",
          style: { fill: "#000000", stroke: "#000000", strokeWidth: 2 },
        }),
        makeRectShape({
          id: "rect-2",
          transform: { x: 120, y: 20 },
          style: { fill: "#000000", stroke: "#000000", strokeWidth: 2 },
        }),
      ];
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de contour"),
        "#445566",
      );
      changeNumberInput(queryStrokeWidthInput(harness.container), "6");

      const state = harness.getState();
      for (const id of ["rect-1", "rect-2"] as const) {
        expect(getShapeById(state.doc, id)?.style).toEqual({
          fill: "#000000",
          stroke: "#445566",
          strokeWidth: 6,
        });
      }
      harness.unmount();
    });

    it("enregistre une seule entrée d'historique pour une modification groupée", () => {
      const harness = renderStyleToolbarHarness(
        twoRectsWithFills("#111111", "#222222"),
      );

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      const state = harness.getState();
      expect(state.history.past).toHaveLength(1);
      expect(canUndo(state)).toBe(true);
      harness.unmount();
    });

    it("restaure toutes les formes en un seul undo", () => {
      const harness = renderStyleToolbarHarness(
        twoRectsWithFills("#111111", "#222222"),
      );

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      const restored = applyEditorActions(harness.getState(), [
        { type: "UNDO" },
      ]);

      expect(getShapeById(restored.doc, "rect-1")?.style.fill).toBe("#111111");
      expect(getShapeById(restored.doc, "rect-2")?.style.fill).toBe("#222222");
      expect(restored.history.past).toHaveLength(0);
      harness.unmount();
    });

    it("ignore les formes verrouillées dans la sélection", () => {
      const initial = twoRectsWithFills("#111111", "#222222");
      initial.doc.shapes[0]!.locked = true;
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      const state = harness.getState();
      expect(getShapeById(state.doc, "rect-1")?.style.fill).toBe("#111111");
      expect(getShapeById(state.doc, "rect-2")?.style.fill).toBe("#aabbcc");
      harness.unmount();
    });

    it("affiche la couleur commune quand tous les fills sont identiques", () => {
      const harness = renderStyleToolbarHarness(
        twoRectsWithFills("#112233", "#112233"),
      );

      expect(getStyleControlState(harness.getState()).values.fill).toBe(
        "#112233",
      );
      harness.unmount();
    });

    it("affiche le draftStyle quand les fills diffèrent entre les formes", () => {
      const initial = twoRectsWithFills("#111111", "#222222");
      initial.draftStyle = {
        ...initial.draftStyle,
        fill: "#abcdef",
      };
      const harness = renderStyleToolbarHarness(initial);

      expect(getStyleControlState(harness.getState()).values.fill).toBe(
        "#abcdef",
      );
      harness.unmount();
    });

    it("expose les contrôles fill et stroke pour une multi-sélection de rectangles", () => {
      const harness = renderStyleToolbarHarness(
        twoRectsWithFills("#111111", "#111111"),
      );

      expect(getStyleControlState(harness.getState()).visibility).toEqual({
        fill: true,
        stroke: true,
        strokeWidth: true,
      });
      harness.unmount();
    });

    it("n'expose que stroke pour une multi-sélection de lignes", () => {
      const initial = withSelectSelection(makeEditorWithRect(), [
        "line-1",
        "line-2",
      ]);
      initial.doc.shapes = [
        makeLineShape({ id: "line-1" }),
        makeLineShape({
          id: "line-2",
          transform: { x: 120, y: 20 },
          x2: 200,
          y2: 100,
        }),
      ];
      const harness = renderStyleToolbarHarness(initial);

      expect(getStyleControlState(harness.getState()).visibility).toEqual({
        fill: false,
        stroke: true,
        strokeWidth: true,
      });
      harness.unmount();
    });

    it("expose fill et stroke pour une sélection mixte rectangle et ligne", () => {
      const initial = withSelectSelection(makeEditorWithRect(), [
        "rect-1",
        "line-1",
      ]);
      initial.doc.shapes = [
        makeRectShape({ id: "rect-1" }),
        makeLineShape({ id: "line-1" }),
      ];
      const harness = renderStyleToolbarHarness(initial);

      expect(getStyleControlState(harness.getState()).visibility).toEqual({
        fill: true,
        stroke: true,
        strokeWidth: true,
      });
      harness.unmount();
    });

    it("n'applique le fill qu'aux formes qui le supportent dans une sélection mixte", () => {
      const initial = withSelectSelection(makeEditorWithRect(), [
        "rect-1",
        "line-1",
      ]);
      initial.doc.shapes = [
        makeRectShape({
          id: "rect-1",
          style: { fill: "#111111", stroke: "#000000", strokeWidth: 2 },
        }),
        makeLineShape({
          id: "line-1",
          style: { fill: "none", stroke: "#000000", strokeWidth: 2 },
        }),
      ];
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      const state = harness.getState();
      expect(getShapeById(state.doc, "rect-1")?.style.fill).toBe("#aabbcc");
      expect(getShapeById(state.doc, "line-1")?.style).toEqual({
        fill: "none",
        stroke: "#000000",
        strokeWidth: 2,
      });
      harness.unmount();
    });

    it("applique le stroke aux rectangles et aux lignes d'une sélection mixte", () => {
      const initial = withSelectSelection(makeEditorWithRect(), [
        "rect-1",
        "line-1",
      ]);
      initial.doc.shapes = [
        makeRectShape({
          id: "rect-1",
          style: { fill: "#111111", stroke: "#000000", strokeWidth: 2 },
        }),
        makeLineShape({
          id: "line-1",
          style: { fill: "none", stroke: "#000000", strokeWidth: 2 },
        }),
      ];
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de contour"),
        "#445566",
      );

      const state = harness.getState();
      expect(getShapeById(state.doc, "rect-1")?.style.stroke).toBe("#445566");
      expect(getShapeById(state.doc, "line-1")?.style.stroke).toBe("#445566");
      harness.unmount();
    });

    it("ne modifie pas les formes sélectionnées hors outil sélection", () => {
      const initial = twoRectsWithFills("#111111", "#222222");
      initial.tool = "rect";
      const harness = renderStyleToolbarHarness(initial);

      changeColorInput(
        queryColorInput(harness.container, "Couleur de remplissage"),
        "#aabbcc",
      );

      const state = harness.getState();
      expect(getStyleControlState(state).mode).toBe("draft");
      expect(state.draftStyle.fill).toBe("#aabbcc");
      expect(getShapeById(state.doc, "rect-1")?.style.fill).toBe("#111111");
      expect(getShapeById(state.doc, "rect-2")?.style.fill).toBe("#222222");
      harness.unmount();
    });
  });
});
