/**
 * @vitest-environment jsdom
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import {
  canUndo,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test/fixtures";
import { viewBoxToAttr } from "@/features/vector-ai/lib/editor/test/viewbox-workflow-harness";
import {
  expectedCanvasRemSize,
  renderZoomWorkflow,
  type RenderedZoomWorkflow,
} from "@/features/vector-ai/lib/editor/test/zoom-workflow-harness";
import {
  VECTOR_AI_DISPLAY_ZOOM_INCREMENT,
  VECTOR_AI_MAX_DISPLAY_ZOOM,
  VECTOR_AI_MIN_DISPLAY_ZOOM,
} from "@/features/vector-ai/lib/vector-ai-config";

function assertZoomUi(
  workflow: RenderedZoomWorkflow,
  expected: {
    percentLabel: string;
    displayZoom: number;
    viewBox: ViewBox;
    zoomInDisabled?: boolean;
    zoomOutDisabled?: boolean;
    resetDisabled?: boolean;
  },
) {
  expect(workflow.getZoomPercentLabel()).toBe(expected.percentLabel);
  expect(workflow.getCanvasWrapperStyle()).toEqual(
    expectedCanvasRemSize(expected.viewBox, expected.displayZoom),
  );
  expect(workflow.getCanvasViewBoxAttr()).toBe(viewBoxToAttr(expected.viewBox));

  if (expected.zoomInDisabled !== undefined) {
    expect(workflow.isZoomInDisabled()).toBe(expected.zoomInDisabled);
  }
  if (expected.zoomOutDisabled !== undefined) {
    expect(workflow.isZoomOutDisabled()).toBe(expected.zoomOutDisabled);
  }
  if (expected.resetDisabled !== undefined) {
    expect(workflow.isZoomResetDisabled()).toBe(expected.resetDisabled);
  }
}

function assertDocumentSnapshot(
  workflow: RenderedZoomWorkflow,
  initial: EditorState,
) {
  expect(workflow.getState().doc).toEqual(initial.doc);
  expect(workflow.getState().history).toEqual(initial.history);
}

function zoomInSteps(workflow: RenderedZoomWorkflow, count: number) {
  for (let step = 0; step < count; step += 1) {
    workflow.clickZoomIn();
  }
}

function zoomOutSteps(workflow: RenderedZoomWorkflow, count: number) {
  for (let step = 0; step < count; step += 1) {
    workflow.clickZoomOut();
  }
}

function maxZoomInStepsFromDefault(): number {
  return (VECTOR_AI_MAX_DISPLAY_ZOOM - 1) / VECTOR_AI_DISPLAY_ZOOM_INCREMENT;
}

function maxZoomOutStepsFromDefault(): number {
  return (1 - VECTOR_AI_MIN_DISPLAY_ZOOM) / VECTOR_AI_DISPLAY_ZOOM_INCREMENT;
}

describe("workflow: zoom d'affichage", () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("affiche 100 %, un canvas à la taille d'origine et des contrôles cohérents au démarrage", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    assertZoomUi(workflow, {
      percentLabel: "100 %",
      displayZoom: 1,
      viewBox,
      zoomInDisabled: false,
      zoomOutDisabled: false,
      resetDisabled: true,
    });
    assertDocumentSnapshot(workflow, initial);

    await workflow.unmount();
  });

  it("zoome avant par pas de 25 points jusqu'à 175 % en mettant à jour l'affichage à chaque clic", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    workflow.clickZoomIn();
    assertZoomUi(workflow, {
      percentLabel: "125 %",
      displayZoom: 1.25,
      viewBox,
      zoomOutDisabled: false,
      resetDisabled: false,
    });
    assertDocumentSnapshot(workflow, initial);

    workflow.clickZoomIn();
    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox,
    });
    assertDocumentSnapshot(workflow, initial);

    workflow.clickZoomIn();
    assertZoomUi(workflow, {
      percentLabel: "175 %",
      displayZoom: 1.75,
      viewBox,
      zoomInDisabled: false,
      zoomOutDisabled: false,
      resetDisabled: false,
    });
    assertDocumentSnapshot(workflow, initial);

    await workflow.unmount();
  });

  it("zoome arrière après un zoom avant et retrouve 125 %", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    zoomInSteps(workflow, 2);
    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox,
    });

    workflow.clickZoomOut();
    assertZoomUi(workflow, {
      percentLabel: "125 %",
      displayZoom: 1.25,
      viewBox,
      zoomOutDisabled: false,
      resetDisabled: false,
    });
    assertDocumentSnapshot(workflow, initial);

    await workflow.unmount();
  });

  it("réinitialise le zoom à 100 % depuis 175 %", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    zoomInSteps(workflow, 3);
    assertZoomUi(workflow, {
      percentLabel: "175 %",
      displayZoom: 1.75,
      viewBox,
      resetDisabled: false,
    });

    workflow.clickZoomReset();
    assertZoomUi(workflow, {
      percentLabel: "100 %",
      displayZoom: 1,
      viewBox,
      zoomInDisabled: false,
      zoomOutDisabled: false,
      resetDisabled: true,
    });
    assertDocumentSnapshot(workflow, initial);

    await workflow.unmount();
  });

  it("atteint 400 %, désactive le zoom avant et ignore les clics supplémentaires", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    zoomInSteps(workflow, maxZoomInStepsFromDefault());
    assertZoomUi(workflow, {
      percentLabel: "400 %",
      displayZoom: VECTOR_AI_MAX_DISPLAY_ZOOM,
      viewBox,
      zoomInDisabled: true,
      zoomOutDisabled: false,
      resetDisabled: false,
    });

    workflow.clickZoomIn();
    workflow.clickZoomIn();
    assertZoomUi(workflow, {
      percentLabel: "400 %",
      displayZoom: VECTOR_AI_MAX_DISPLAY_ZOOM,
      viewBox,
      zoomInDisabled: true,
    });
    assertDocumentSnapshot(workflow, initial);

    await workflow.unmount();
  });

  it("atteint 25 %, désactive le zoom arrière et ignore les clics supplémentaires", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    zoomOutSteps(workflow, maxZoomOutStepsFromDefault());
    assertZoomUi(workflow, {
      percentLabel: "25 %",
      displayZoom: VECTOR_AI_MIN_DISPLAY_ZOOM,
      viewBox,
      zoomInDisabled: false,
      zoomOutDisabled: true,
      resetDisabled: false,
    });

    workflow.clickZoomOut();
    workflow.clickZoomOut();
    assertZoomUi(workflow, {
      percentLabel: "25 %",
      displayZoom: VECTOR_AI_MIN_DISPLAY_ZOOM,
      viewBox,
      zoomOutDisabled: true,
    });
    assertDocumentSnapshot(workflow, initial);

    await workflow.unmount();
  });

  it("conserve le document, l'historique et le viewBox SVG après plusieurs zooms", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    zoomInSteps(workflow, 4);
    zoomOutSteps(workflow, 2);
    workflow.clickZoomReset();
    zoomInSteps(workflow, 2);

    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox,
    });
    assertDocumentSnapshot(workflow, initial);
    expect(workflow.getState().selection).toEqual(initial.selection);

    await workflow.unmount();
  });

  it("conserve le zoom affiché quand on annule une modification du document", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    await workflow.openDimensions();
    workflow.setPlanWidth("1000");
    workflow.setPlanHeight("500");
    workflow.confirmDimensions();

    const modifiedViewBox: ViewBox = { x: 0, y: 0, w: 1000, h: 500 };
    expect(workflow.getState().doc.viewBox).toEqual(modifiedViewBox);
    expect(canUndo(workflow.getState())).toBe(true);

    zoomInSteps(workflow, 2);
    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox: modifiedViewBox,
    });

    workflow.clickUndo();
    expect(workflow.getState().doc.viewBox).toEqual(viewBox);
    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox,
    });
    expect(workflow.getCanvasViewBoxAttr()).toBe(viewBoxToAttr(viewBox));

    await workflow.unmount();
  });

  it("recalcule la taille du canvas après un changement de dimensions tout en conservant le zoom", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);

    zoomInSteps(workflow, 2);
    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox: initial.doc.viewBox,
    });

    await workflow.openDimensions();
    workflow.setPlanWidth("1000");
    workflow.setPlanHeight("500");
    workflow.confirmDimensions();

    const nextViewBox: ViewBox = { x: 0, y: 0, w: 1000, h: 500 };
    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox: nextViewBox,
    });
    expect(workflow.getState().doc.viewBox).toEqual(nextViewBox);
    expect(workflow.getState().history.past).toHaveLength(1);

    await workflow.unmount();
  });

  it("désactive tous les contrôles de zoom pendant une requête IA", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial, { aiPending: true });
    const viewBox = initial.doc.viewBox;

    assertZoomUi(workflow, {
      percentLabel: "100 %",
      displayZoom: 1,
      viewBox,
      zoomInDisabled: true,
      zoomOutDisabled: true,
      resetDisabled: true,
    });
    assertDocumentSnapshot(workflow, initial);

    await workflow.unmount();
  });

  it("réinitialise le zoom à 100 % après le chargement d'un dessin enregistré", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial, {
      saveIdFactory: () => "drawing-zoom",
    });
    const viewBox = initial.doc.viewBox;

    zoomInSteps(workflow, 3);
    assertZoomUi(workflow, {
      percentLabel: "175 %",
      displayZoom: 1.75,
      viewBox,
    });

    workflow.setDrawingName("Zoom test");
    workflow.saveDrawing();
    workflow.selectDrawing(null);
    assertZoomUi(workflow, {
      percentLabel: "100 %",
      displayZoom: 1,
      viewBox,
      resetDisabled: true,
    });

    workflow.selectDrawing("drawing-zoom");
    assertZoomUi(workflow, {
      percentLabel: "100 %",
      displayZoom: 1,
      viewBox,
      resetDisabled: true,
    });
    expect(workflow.getState().doc.shapes).toHaveLength(1);
    expect(workflow.getState().doc.shapes[0]?.id).toBe("rect-1");

    await workflow.unmount();
  });

  it("permet de sélectionner une forme après un zoom sans modifier le niveau de zoom", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderZoomWorkflow(initial);
    const viewBox = initial.doc.viewBox;

    zoomInSteps(workflow, 2);
    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox,
    });

    workflow.selectShape("rect-1", { x: 10, y: 20 });
    expect(workflow.getState().selection.ids).toEqual(["rect-1"]);
    assertZoomUi(workflow, {
      percentLabel: "150 %",
      displayZoom: 1.5,
      viewBox,
    });
    assertDocumentSnapshot(workflow, initial);

    await workflow.unmount();
  });
});
