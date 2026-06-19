/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  getShapeById,
  getStyleControlState,
} from "@/features/vector-ai/lib/editor/core/selectors";
import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import {
  makeEditorWithRect,
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
function withDrawingTool(tool: Exclude<EditorTool, "select">) {
  const state = makeEditorWithRect();
  state.tool = tool;
  return state;
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
