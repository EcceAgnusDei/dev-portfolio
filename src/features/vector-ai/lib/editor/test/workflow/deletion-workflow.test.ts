/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  canRedo,
  canUndo,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import { createInitialEditorState } from "@/features/vector-ai/lib/editor/core/state";
import { clearAllShapesActions } from "@/features/vector-ai/lib/editor/dispatch/delete-shape";
import {
  expectDocUnchanged,
  expectShapeCount,
  expectShapeInDoc,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import { renderDeletionWorkflow } from "@/features/vector-ai/lib/editor/test/deletion-workflow-harness";
import {
  makeEditorWithRect,
  makeEditorWithSampleDoc,
  makeEditorWithTwoRects,
} from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: suppression UI → EditorState", () => {
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

  describe("Effacer (vider le canvas)", () => {
    it("supprime toutes les formes via le bouton Effacer, met à jour le SVG et permet undo/redo", () => {
      const initial = makeEditorWithSampleDoc();
      initial.selection.ids = ["circle-1"];
      const workflow = renderDeletionWorkflow(initial);

      expect(workflow.countRenderedShapes()).toBe(4);
      expect(workflow.isClearDisabled()).toBe(false);

      workflow.clickClear();

      expectShapeCount(workflow.getState(), 0);
      expect(workflow.getState().selection.ids).toEqual([]);
      expect(workflow.getState().history.past).toHaveLength(1);
      expect(workflow.getState().history.future).toEqual([]);
      expect(workflow.countRenderedShapes()).toBe(0);
      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.isClearDisabled()).toBe(true);
      expect(canUndo(workflow.getState())).toBe(true);

      workflow.clickUndo();

      expectShapeCount(workflow.getState(), 4);
      expect(workflow.getState().doc.shapes.map((shape) => shape.id)).toEqual([
        "rect-1",
        "circle-1",
        "line-1",
        "path-1",
      ]);
      expect(workflow.getState().selection.ids).toEqual([]);
      expect(workflow.countRenderedShapes()).toBe(4);
      expect(canRedo(workflow.getState())).toBe(true);

      workflow.clickRedo();

      expectShapeCount(workflow.getState(), 0);
      expect(workflow.countRenderedShapes()).toBe(0);
      expect(canRedo(workflow.getState())).toBe(false);

      workflow.unmount();
    });

    it("désactive Effacer sur un canvas vide et ignore le clic", () => {
      const initial = createInitialEditorState();
      const workflow = renderDeletionWorkflow(initial);

      expect(workflow.isClearDisabled()).toBe(true);
      expectShapeCount(workflow.getState(), 0);

      workflow.clickClear();

      expectShapeCount(workflow.getState(), 0);
      expect(workflow.getState().history.past).toHaveLength(0);

      workflow.unmount();
    });

    it("supprime uniquement les formes déverrouillées dans un document mixte", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);
      initial.doc.shapes[0]!.locked = true;

      const workflow = renderDeletionWorkflow(initial);

      workflow.clickClear();

      expectShapeCount(workflow.getState(), 1);
      expect(workflow.getState().doc.shapes[0]?.id).toBe("rect-1");
      expect(workflow.getState().history.past).toHaveLength(1);
      expect(workflow.countRenderedShapes()).toBe(1);
      expect(workflow.isClearDisabled()).toBe(true);

      workflow.unmount();
    });

    it("vide le canvas quel que soit l'outil actif et sans sélection", () => {
      const initial = makeEditorWithTwoRects();
      initial.tool = "rect";
      initial.selection.ids = [];

      const workflow = renderDeletionWorkflow(initial);

      workflow.clickClear();

      expectShapeCount(workflow.getState(), 0);
      expect(workflow.getState().tool).toBe("rect");
      expect(workflow.getState().selection.ids).toEqual([]);

      workflow.unmount();
    });

    it("désactive Effacer pendant une requête IA", () => {
      const initial = makeEditorWithRect("rect-1");
      const workflow = renderDeletionWorkflow(initial, { aiPending: true });

      expect(workflow.isClearDisabled()).toBe(true);
      expectShapeCount(workflow.getState(), 1);

      workflow.clickClear();

      expectDocUnchanged(initial, workflow.getState());

      workflow.unmount();
    });

    it("aligne les actions dispatchées sur clearAllShapesActions", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);
      const workflow = renderDeletionWorkflow(initial);

      workflow.clickClear();

      expect(clearAllShapesActions(initial.doc)).toEqual([
        { type: "SHAPE_DELETE", id: "rect-1" },
        { type: "SHAPE_DELETE", id: "rect-2", recordHistory: false },
      ]);

      workflow.unmount();
    });
  });

  describe("Supprimer (sélection)", () => {
    it("supprime la forme sélectionnée via le bouton Supprimer", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.selection.ids = [];
      const workflow = renderDeletionWorkflow(initial);

      workflow.selectShape("rect-1", { x: 10, y: 20 });
      expect(workflow.getState().selection.ids).toEqual(["rect-1"]);
      expect(workflow.isDeleteDisabled()).toBe(false);

      workflow.clickDeleteSelected();

      expectShapeCount(workflow.getState(), 0);
      expect(workflow.getState().selection.ids).toEqual([]);
      expect(workflow.countRenderedShapes()).toBe(0);
      expect(workflow.isDeleteDisabled()).toBe(true);
      expect(canUndo(workflow.getState())).toBe(true);

      workflow.unmount();
    });

    it("désactive Supprimer sans sélection", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.selection.ids = [];
      const workflow = renderDeletionWorkflow(initial);

      expect(workflow.isDeleteDisabled()).toBe(true);

      workflow.clickDeleteSelected();

      expectShapeCount(workflow.getState(), 1);
      expect(workflow.getState().history.past).toHaveLength(0);

      workflow.unmount();
    });

    it("désactive Supprimer hors outil sélection", () => {
      const initial = makeEditorWithRect("rect-1");
      initial.tool = "circle";
      initial.selection.ids = ["rect-1"];
      const workflow = renderDeletionWorkflow(initial);

      expect(workflow.isDeleteDisabled()).toBe(true);

      workflow.clickDeleteSelected();

      expectShapeInDoc(workflow.getState(), "rect-1", { type: "rect" });
      expect(workflow.getState().history.past).toHaveLength(0);

      workflow.unmount();
    });

    it("supprime toute une multi-sélection en une action via Supprimer", () => {
      const initial = makeEditorWithTwoRects(["rect-1", "rect-2"]);
      const workflow = renderDeletionWorkflow(initial);

      expect(workflow.isDeleteDisabled()).toBe(false);

      workflow.clickDeleteSelected();

      expectShapeCount(workflow.getState(), 0);
      expect(workflow.getState().history.past).toHaveLength(1);
      expect(workflow.countRenderedShapes()).toBe(0);

      workflow.clickUndo();

      expectShapeCount(workflow.getState(), 2);
      expect(workflow.countRenderedShapes()).toBe(2);

      workflow.unmount();
    });
  });
});
