/**
 * @vitest-environment jsdom
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import {
  canRedo,
  canUndo,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";
import { viewBoxHandleWorldPoint } from "@/features/vector-ai/lib/editor/geometry/resize-viewbox";
import { expectShapeInDoc } from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test/fixtures";
import {
  renderViewBoxWorkflow,
  viewBoxToAttr,
  type RenderedViewBoxWorkflow,
} from "@/features/vector-ai/lib/editor/test/viewbox-workflow-harness";
import {
  VECTOR_AI_DEFAULT_VIEWBOX,
  VECTOR_AI_MAX_VIEWBOX_DIMENSION,
} from "@/features/vector-ai/lib/vector-ai-config";

function expectViewBox(state: EditorState, viewBox: ViewBox) {
  expect(state.doc.viewBox).toEqual(viewBox);
}

function expectShapesUnchanged(workflow: RenderedViewBoxWorkflow) {
  expect(workflow.getState().doc.shapes).toEqual(workflow.getInitialShapes());
}

describe("workflow: taille du plan (viewBox)", () => {
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

  it("ouvre Dimensions, saisit une nouvelle taille et valide avec OK", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));

    await workflow.openDimensions();
    workflow.setPlanWidth("1000");
    workflow.setPlanHeight("500");
    workflow.confirmDimensions();

    expectViewBox(workflow.getState(), { x: 0, y: 0, w: 1000, h: 500 });
    expectShapesUnchanged(workflow);
    expect(workflow.getState().history.past).toHaveLength(1);
    expect(workflow.getCanvasViewBoxAttr()).toBe(
      viewBoxToAttr({ x: 0, y: 0, w: 1000, h: 500 }),
    );

    await workflow.unmount();
  });

  it("affiche les dimensions actuelles à l'ouverture du menu", async () => {
    const initial = makeEditorWithRect("rect-1");
    const { w, h } = initial.doc.viewBox;
    const workflow = renderViewBoxWorkflow(initial);

    await workflow.openDimensions();

    const widthInput = document.querySelector(
      'input[aria-label="Largeur du plan"]',
    );
    const heightInput = document.querySelector(
      'input[aria-label="Hauteur du plan"]',
    );
    expect(widthInput).toHaveProperty("value", String(w));
    expect(heightInput).toHaveProperty("value", String(h));

    await workflow.unmount();
  });

  it("ne modifie pas le plan si OK sans changement", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderViewBoxWorkflow(initial);
    const historyBefore = initial.history;

    await workflow.openDimensions();
    workflow.confirmDimensions();

    expectViewBox(workflow.getState(), initial.doc.viewBox);
    expect(workflow.getState().history).toEqual(historyBefore);

    await workflow.unmount();
  });

  it("conserve la largeur actuelle quand le champ est vide", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderViewBoxWorkflow(initial);

    await workflow.openDimensions();
    workflow.setPlanWidth("");
    workflow.setPlanHeight("400");
    workflow.confirmDimensions();

    expectViewBox(workflow.getState(), { ...initial.doc.viewBox, h: 400 });

    await workflow.unmount();
  });

  it("conserve la dimension actuelle quand la saisie est invalide", async () => {
    const initial = makeEditorWithRect("rect-1");
    const workflow = renderViewBoxWorkflow(initial);

    await workflow.openDimensions();
    workflow.setPlanWidth("abc");
    workflow.setPlanHeight("400");
    workflow.confirmDimensions();

    expectViewBox(workflow.getState(), { ...initial.doc.viewBox, h: 400 });

    await workflow.unmount();
  });

  it("plafonne les dimensions au maximum autorisé", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));

    await workflow.openDimensions();
    workflow.setPlanWidth(String(VECTOR_AI_MAX_VIEWBOX_DIMENSION + 500));
    workflow.setPlanHeight(String(VECTOR_AI_MAX_VIEWBOX_DIMENSION));
    workflow.confirmDimensions();

    expectViewBox(workflow.getState(), {
      x: 0,
      y: 0,
      w: VECTOR_AI_MAX_VIEWBOX_DIMENSION,
      h: VECTOR_AI_MAX_VIEWBOX_DIMENSION,
    });

    await workflow.unmount();
  });

  it("ignore une dimension nulle ou négative", async () => {
    const initial = makeEditorWithRect("rect-1");
    const { w, h } = initial.doc.viewBox;
    const workflow = renderViewBoxWorkflow(initial);

    await workflow.openDimensions();
    workflow.setPlanWidth("0");
    workflow.setPlanHeight("-10");
    workflow.confirmDimensions();

    expectViewBox(workflow.getState(), { x: 0, y: 0, w, h });
    expect(workflow.getState().history).toEqual(initial.history);

    await workflow.unmount();
  });

  it("affiche les poignées de redimensionnement quand le menu est ouvert", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));

    await workflow.openDimensions();

    expect(workflow.queryHandle("n")).toBeTruthy();
    expect(workflow.queryHandle("e")).toBeTruthy();
    expect(workflow.queryHandle("s")).toBeTruthy();
    expect(workflow.queryHandle("w")).toBeTruthy();

    await workflow.unmount();
  });

  it("élargit le plan en tirant la poignée est", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));
    const start = workflow.getState().doc.viewBox;
    const down = viewBoxHandleWorldPoint(start, "e");

    await workflow.openDimensions();
    workflow.dragHandle("e", { x: down.x + 100, y: down.y });

    expectViewBox(workflow.getState(), { ...start, w: start.w + 100 });
    expectShapesUnchanged(workflow);
    expect(workflow.getState().history.past).toHaveLength(1);
    expect(workflow.interaction.session.kind).toBe("idle");

    await workflow.unmount();
  });

  it("agrandit la hauteur en tirant la poignée sud", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));
    const start = workflow.getState().doc.viewBox;
    const down = viewBoxHandleWorldPoint(start, "s");

    await workflow.openDimensions();
    workflow.dragHandle("s", { x: down.x, y: down.y + 80 });

    expectViewBox(workflow.getState(), { ...start, h: start.h + 80 });

    await workflow.unmount();
  });

  it("rétrécit le plan et décale x en tirant la poignée ouest", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));
    const start = workflow.getState().doc.viewBox;
    const down = viewBoxHandleWorldPoint(start, "w");

    await workflow.openDimensions();
    workflow.dragHandle("w", { x: 120, y: down.y });

    expectViewBox(workflow.getState(), { ...start, x: 120, w: start.w - 120 });

    await workflow.unmount();
  });

  it("rétrécit le plan et décale y en tirant la poignée nord", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));
    const start = workflow.getState().doc.viewBox;
    const down = viewBoxHandleWorldPoint(start, "n");

    await workflow.openDimensions();
    workflow.dragHandle("n", { x: down.x, y: 80 });

    expectViewBox(workflow.getState(), { ...start, y: 80, h: start.h - 80 });

    await workflow.unmount();
  });

  it("prévisualise la nouvelle taille pendant le drag sans valider le document", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));
    const start = workflow.getState().doc.viewBox;
    const down = viewBoxHandleWorldPoint(start, "e");

    await workflow.openDimensions();
    workflow.moveHandle("e", { x: down.x + 50, y: down.y });

    expect(workflow.getCanvasViewBoxAttr()).toBe(
      viewBoxToAttr({ ...start, w: start.w + 50 }),
    );
    expectViewBox(workflow.getState(), start);

    await workflow.unmount();
  });

  it("n'applique pas le redimensionnement si le drag est annulé", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));
    const initial = workflow.getState();
    const down = viewBoxHandleWorldPoint(initial.doc.viewBox, "e");

    await workflow.openDimensions();
    workflow.moveHandle("e", { x: down.x + 100, y: down.y });
    workflow.cancelHandleDrag();

    expectViewBox(workflow.getState(), initial.doc.viewBox);
    expect(workflow.getState().history).toEqual(initial.history);
    expect(workflow.interaction.session.kind).toBe("idle");

    await workflow.unmount();
  });

  it("restaure la taille du plan après Annuler puis Rétablir", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"));
    const original = workflow.getState().doc.viewBox;

    await workflow.openDimensions();
    workflow.setPlanWidth("900");
    workflow.setPlanHeight("500");
    workflow.confirmDimensions();

    expectViewBox(workflow.getState(), { x: 0, y: 0, w: 900, h: 500 });
    expect(canUndo(workflow.getState())).toBe(true);

    workflow.clickUndo();
    expectViewBox(workflow.getState(), original);
    expect(canUndo(workflow.getState())).toBe(false);
    expect(canRedo(workflow.getState())).toBe(true);

    workflow.clickRedo();
    expectViewBox(workflow.getState(), { x: 0, y: 0, w: 900, h: 500 });
    expect(canRedo(workflow.getState())).toBe(false);

    await workflow.unmount();
  });

  it("conserve le viewBox personnalisé après enregistrement et rechargement", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"), {
      saveIdFactory: () => "drawing-viewbox",
    });

    await workflow.openDimensions();
    workflow.setPlanWidth("400");
    workflow.setPlanHeight("300");
    workflow.confirmDimensions();

    workflow.setDrawingName("Plan custom");
    workflow.saveDrawing();

    workflow.selectDrawing(null);
    expect(workflow.getState().doc.shapes).toEqual([]);

    workflow.selectDrawing("drawing-viewbox");

    expectViewBox(workflow.getState(), { x: 0, y: 0, w: 400, h: 300 });
    expectShapeInDoc(workflow.getState(), "rect-1", {
      type: "rect",
      transform: { x: 10, y: 20 },
    });
    expect(workflow.getState().doc.viewBox).not.toEqual(
      VECTOR_AI_DEFAULT_VIEWBOX,
    );

    await workflow.unmount();
  });

  it("désactive le menu Dimensions pendant une requête IA", async () => {
    const workflow = renderViewBoxWorkflow(makeEditorWithRect("rect-1"), {
      aiPending: true,
    });

    expect(workflow.isDimensionsDisabled()).toBe(true);

    await workflow.unmount();
  });
});
