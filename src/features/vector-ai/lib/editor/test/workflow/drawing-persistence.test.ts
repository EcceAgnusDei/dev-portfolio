/**
 * @vitest-environment jsdom
 */
import "@/features/vector-ai/lib/editor/test/mock-create-shape-id";

import { act } from "react";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  canRedo,
  canUndo,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import {
  DRAWING_NAME_REQUIRED_ERROR,
  DRAWING_NOT_FOUND_ERROR,
  loadDrawingIntoEditor,
  saveDrawingFromDoc,
} from "@/features/vector-ai/lib/drawing-persistence";
import {
  getVectorDrawing,
  listVectorDrawings,
} from "@/features/vector-ai/lib/vector-drawing-storage";
import {
  expectDocUnchanged,
  expectShapeInDoc,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  makeEditorWithRect,
  makeEditorWithSampleDoc,
  makeSampleDoc,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import {
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  canvasBackgroundTarget,
  makePointerEvent,
  renderInteractiveCanvas,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";

const TEXT_TOOL = "text" as EditorTool;

describe("workflow: persistance des dessins", () => {
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

  it("enregistre, passe en brouillon, puis recharge le dessin", () => {
    const initial = makeEditorWithRect("rect-1");
    const modified = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 60 } },
      { type: "up" },
    ]);

    const saved = saveDrawingFromDoc({
      doc: modified.state.doc,
      activeDrawingId: null,
      drawingName: "Mon dessin",
      idFactory: () => "id-a",
    });
    expect(saved).toEqual({ ok: true, id: "id-a", name: "Mon dessin" });

    const blank = loadDrawingIntoEditor(modified.state, null);
    expect(blank.ok).toBe(true);
    if (!blank.ok) return;
    expect(blank.state.doc.shapes).toEqual([]);
    expect(blank.activeDrawingId).toBeNull();
    expect(blank.drawingName).toBe("");

    const loaded = loadDrawingIntoEditor(blank.state, "id-a");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    expectShapeInDoc(loaded.state, "rect-1", {
      type: "rect",
      transform: { x: 50, y: 60 },
    });
    expect(canUndo(loaded.state)).toBe(false);
    expect(canRedo(loaded.state)).toBe(false);
    expect(loaded.state.selection.ids).toEqual([]);
    expect(loaded.state.tool).toBe("select");
    expect(loaded.activeDrawingId).toBe("id-a");
    expect(loaded.drawingName).toBe("Mon dessin");
  });

  it("ré-enregistre un dessin existant avec le même id", () => {
    const initial = makeEditorWithRect("rect-1");
    const firstSave = saveDrawingFromDoc({
      doc: initial.doc,
      activeDrawingId: null,
      drawingName: "Dessin A",
      idFactory: () => "id-a",
    });
    expect(firstSave.ok).toBe(true);

    const moved = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 30, y: 40 } },
      { type: "up" },
    ]);

    const secondSave = saveDrawingFromDoc({
      doc: moved.state.doc,
      activeDrawingId: "id-a",
      drawingName: "Dessin A",
    });
    expect(secondSave).toEqual({ ok: true, id: "id-a", name: "Dessin A" });

    const stored = getVectorDrawing("id-a");
    expectShapeInDoc(
      { ...moved.state, doc: stored!.doc },
      "rect-1",
      { transform: { x: 30, y: 40 } },
    );
    expect(listVectorDrawings()).toHaveLength(1);
  });

  it("conserve un document multi-formes après round-trip", () => {
    const sampleDoc = makeSampleDoc();
    const saved = saveDrawingFromDoc({
      doc: sampleDoc,
      activeDrawingId: null,
      drawingName: "Complet",
      idFactory: () => "sample",
    });
    expect(saved.ok).toBe(true);

    const loaded = loadDrawingIntoEditor(makeEditorWithRect("other"), "sample");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    expect(loaded.state.doc).toEqual(sampleDoc);
    expect(loaded.state.doc.shapes).toHaveLength(4);
  });

  it("efface l'historique au chargement", () => {
    saveDrawingFromDoc({
      doc: makeEditorWithRect("rect-1").doc,
      activeDrawingId: null,
      drawingName: "A",
      idFactory: () => "id-a",
    });
    saveDrawingFromDoc({
      doc: makeEditorWithSampleDoc().doc,
      activeDrawingId: null,
      drawingName: "B",
      idFactory: () => "id-b",
    });

    const withHistory = runGesture(makeEditorWithRect("rect-1"), [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 15, y: 25 } },
      { type: "up" },
      { type: "undo" },
    ]);
    expect(canRedo(withHistory.state)).toBe(true);

    const loaded = loadDrawingIntoEditor(withHistory.state, "id-b");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    expect(canUndo(loaded.state)).toBe(false);
    expect(canRedo(loaded.state)).toBe(false);
    expect(loaded.state.history).toEqual({ past: [], future: [] });
    expect(loaded.state.doc).toEqual(makeSampleDoc());
  });

  it("refuse un dessin introuvable sans modifier l'état", () => {
    const state = makeEditorWithRect("rect-1");
    const result = loadDrawingIntoEditor(state, "ghost");

    expect(result).toEqual({ ok: false, error: DRAWING_NOT_FOUND_ERROR });
    expectDocUnchanged(state, state);
  });

  it("refuse un enregistrement sans nom", () => {
    const result = saveDrawingFromDoc({
      doc: makeEditorWithRect("rect-1").doc,
      activeDrawingId: null,
      drawingName: "   ",
    });

    expect(result).toEqual({ ok: false, error: DRAWING_NAME_REQUIRED_ERROR });
    expect(listVectorDrawings()).toEqual([]);
  });

  it("nettoie la session texte avant un chargement", () => {
    const initial = { ...makeEditorWithRect("rect-1"), tool: TEXT_TOOL };
    const canvas = renderInteractiveCanvas(initial);

    act(() => {
      canvas.interaction.onSvgPointerDown(
        makePointerEvent({
          clientX: 40,
          clientY: 50,
          target: canvasBackgroundTarget(),
        }) as never,
      );
    });
    act(() => {
      canvas.interaction.onSvgPointerUp(
        makePointerEvent({ clientX: 40, clientY: 50 }) as never,
      );
    });

    expect(canvas.interaction.editingTextId).toBe("new-shape-id");

    act(() => {
      canvas.interaction.clearTextEditSession();
    });

    const loaded = loadDrawingIntoEditor(canvas.getState(), null);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    expect(canvas.interaction.editingTextId).toBeNull();
    expect(loaded.state.doc.shapes).toEqual([]);

    canvas.unmount();
  });
});
