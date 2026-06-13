/**
 * @vitest-environment jsdom
 */
import "@/features/vector-ai/lib/editor/test/mock-create-shape-id";

import { act } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import type {
  EditorState,
  EditorTool,
} from "@/features/vector-ai/lib/editor/core/state";
import {
  expectAfterMove,
  expectShapeCount,
  expectShapeInDoc,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import type {
  TextShape,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import { commitTextEditActions } from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import {
  estimateTextBounds,
  textBoundsBottom,
  textBoundsRight,
} from "@/features/vector-ai/lib/editor/geometry/text-bounds";
import {
  actionsOfType,
  applyEditorActions,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeEditorWithRect,
  makeTextShape as makeTextShapeFixture,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import {
  canvasBackgroundTarget,
  makePointerEvent,
  renderInteractiveCanvas,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";

const TEXT_TOOL = "text" as EditorTool;

const TEXT_DEFAULTS = {
  fontSize: 16,
  fontFamily: "sans-serif",
  content: "",
  style: { fill: "#000000" },
} as const;

type TextShapeFixture = {
  id: string;
  type: "text";
  transform: { x: number; y: number };
  content: string;
  fontSize: number;
  fontFamily: string;
  style: { fill: string };
};

function withTextTool(state: EditorState): EditorState {
  return { ...state, tool: TEXT_TOOL };
}

function makeTextShape(
  overrides?: Partial<TextShapeFixture>,
): TextShapeFixture {
  return makeTextShapeFixture(overrides) as TextShapeFixture;
}

function textStaysInViewBox(shape: TextShape, viewBox: ViewBox): boolean {
  const bounds = estimateTextBounds(shape);
  return (
    bounds.x >= viewBox.x &&
    bounds.y >= viewBox.y &&
    textBoundsRight(bounds) <= viewBox.x + viewBox.w &&
    textBoundsBottom(bounds) <= viewBox.y + viewBox.h
  );
}

describe("workflow: création texte", () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("ouvre l'édition au clic sans ajouter le shape au doc", () => {
    const initial = withTextTool(makeEditorWithRect());

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 40, y: 50 } },
      { type: "up" },
    ]);

    expect(actionsOfType(result.allActions, "SHAPE_ADD")).toHaveLength(0);
    expect(result.state.tool).toBe("select");
    expect(result.state.history.past).toHaveLength(0);
    expectShapeCount(result.state, initial.doc.shapes.length);
  });

  it("crée le texte au commit de l'éditeur avec un seul push undo", () => {
    const initial = withTextTool(makeEditorWithRect());
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

    expect(canvas.getState().history.past).toHaveLength(0);
    expectShapeCount(canvas.getState(), initial.doc.shapes.length);
    expect(canvas.interaction.editingTextId).toBe("new-shape-id");

    act(() => {
      canvas.interaction.commitTextEdit({ content: "Hello" });
    });

    expectShapeInDoc(canvas.getState(), "new-shape-id", {
      type: "text",
      transform: { x: 40, y: 50 },
      content: "Hello",
      fontSize: TEXT_DEFAULTS.fontSize,
      fontFamily: TEXT_DEFAULTS.fontFamily,
      style: TEXT_DEFAULTS.style,
    });
    expect(canvas.getState().history.past).toHaveLength(1);

    canvas.unmount();
  });
});

describe("workflow: déplacement texte", () => {
  it("déplace un texte et commit au pointerup", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [makeTextShape({ id: "text-1" })];

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "text-1", world: { x: 40, y: 50 } },
      { type: "move", world: { x: 60, y: 80 } },
      { type: "up" },
    ]);

    expect(result.state.selection.ids).toEqual(["text-1"]);
    expectAfterMove(result, "text-1", {
      type: "text",
      transform: { x: 60, y: 80 },
      content: "Hello",
    });
  });

  it("commit un déplacement de texte borné au viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeTextShape({
        id: "text-1",
        transform: { x: 10, y: 20 },
      }),
    ];

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "text-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 200, y: 200 } },
      { type: "up" },
    ]);

    expectAfterMove(result, "text-1", {
      type: "text",
      transform: { x: 78, y: 90 },
    });

    const moved = getShapeById(result.state.doc, "text-1");
    if (moved?.type !== "text") throw new Error("fixture texte attendue");
    expect(textStaysInViewBox(moved, viewBox)).toBe(true);
    expect(textBoundsRight(estimateTextBounds(moved))).toBeLessThanOrEqual(
      viewBox.x + viewBox.w,
    );
    expect(textBoundsBottom(estimateTextBounds(moved))).toBeLessThanOrEqual(
      viewBox.y + viewBox.h,
    );
  });

  it("garde le bord droit du texte dans le viewBox après déplacement vers la droite", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeTextShape({
        id: "text-1",
        transform: { x: 10, y: 20 },
        content: "ABCDEFGHIJ",
      }),
    ];

    const result = runGesture(initial, [
      { type: "shape-down", shapeId: "text-1", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 200, y: 20 } },
      { type: "up" },
    ]);

    const moved = getShapeById(result.state.doc, "text-1");
    if (moved?.type !== "text") throw new Error("fixture texte attendue");
    expect(textStaysInViewBox(moved, viewBox)).toBe(true);
    expect(textBoundsRight(estimateTextBounds(moved))).toBe(
      viewBox.x + viewBox.w,
    );
  });
});

describe("workflow: édition contenu texte", () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("ouvre l'éditeur au double-clic, édite le contenu et recale si nécessaire", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.tool = "select";
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeTextShape({
        id: "text-1",
        transform: { x: 80, y: 20 },
        content: "Hi",
      }),
    ];

    const canvas = renderInteractiveCanvas(initial);

    act(() => {
      canvas.interaction.onShapePointerDown(
        "text-1",
        makePointerEvent({ clientX: 80, clientY: 20, timeStamp: 1_000 }),
      );
      canvas.interaction.onSvgPointerUp(
        makePointerEvent({
          clientX: 80,
          clientY: 20,
          timeStamp: 1_050,
        }) as never,
      );
      canvas.interaction.onShapePointerDown(
        "text-1",
        makePointerEvent({ clientX: 80, clientY: 20, timeStamp: 1_200 }),
      );
      canvas.interaction.onSvgPointerUp(
        makePointerEvent({
          clientX: 80,
          clientY: 20,
          timeStamp: 1_250,
        }) as never,
      );
    });

    expect(canvas.interaction.editingTextId).toBe("text-1");

    let textarea = canvas.container.querySelector<HTMLTextAreaElement>(
      '[aria-label="Édition du texte"]',
    );
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe("Hi");

    act(() => {
      canvas.interaction.commitTextEdit({
        content: "Bonjour",
        fontSize: 16,
      });
    });

    expect(canvas.interaction.editingTextId).toBeNull();
    expectShapeInDoc(canvas.getState(), "text-1", {
      type: "text",
      content: "Bonjour",
    });
    expect(canvas.getState().history.past.length).toBeGreaterThan(0);

    act(() => {
      canvas.interaction.onShapePointerDown(
        "text-1",
        makePointerEvent({ clientX: 80, clientY: 20, timeStamp: 2_000 }),
      );
      canvas.interaction.onSvgPointerUp(
        makePointerEvent({
          clientX: 80,
          clientY: 20,
          timeStamp: 2_050,
        }) as never,
      );
      canvas.interaction.onShapePointerDown(
        "text-1",
        makePointerEvent({ clientX: 80, clientY: 20, timeStamp: 2_150 }),
      );
      canvas.interaction.onSvgPointerUp(
        makePointerEvent({
          clientX: 80,
          clientY: 20,
          timeStamp: 2_200,
        }) as never,
      );
    });

    expect(canvas.interaction.editingTextId).toBe("text-1");

    textarea = canvas.container.querySelector<HTMLTextAreaElement>(
      '[aria-label="Édition du texte"]',
    );
    expect(textarea?.value).toBe("Bonjour");

    act(() => {
      canvas.interaction.commitTextEdit({
        content: "ABCDEFGHIJ",
        fontSize: 16,
      });
    });

    expect(canvas.interaction.editingTextId).toBeNull();

    const updated = getShapeById(canvas.getState().doc, "text-1");
    if (updated?.type !== "text") throw new Error("fixture texte attendue");
    expect(updated.content).toBe("ABCDEFGHIJ");
    expect(textStaysInViewBox(updated, viewBox)).toBe(true);
    expect(textBoundsRight(estimateTextBounds(updated))).toBeLessThanOrEqual(
      viewBox.x + viewBox.w,
    );

    canvas.unmount();
  });

  it("recale le texte si un contenu multiligne dépasserait le bord bas du viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeTextShape({
        id: "text-1",
        transform: { x: 10, y: 70 },
        content: "Ligne 1",
      }),
    ];

    const next = applyEditorActions(initial, [
      {
        type: "SHAPE_UPDATE",
        id: "text-1",
        patch: { content: "Ligne 1\nLigne 2\nLigne 3\nLigne 4" },
      },
    ]);

    const updated = getShapeById(next.doc, "text-1");
    if (updated?.type !== "text") throw new Error("fixture texte attendue");
    expect(textStaysInViewBox(updated, viewBox)).toBe(true);
    expect(textBoundsBottom(estimateTextBounds(updated))).toBeLessThanOrEqual(
      viewBox.y + viewBox.h,
    );
  });

  it("supprime le texte quand le contenu validé est vide", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [makeTextShape({ id: "text-1", content: "Hello" })];

    const next = applyEditorActions(
      initial,
      commitTextEditActions({
        shapeId: "text-1",
        input: { content: "" },
        doc: initial.doc,
      }),
    );

    expectShapeCount(next, 0);
    expect(next.selection.ids).toEqual([]);
  });

  it.each(["   ", "\n", "\t", " \n\t ", "  \n  \t  "])(
    "supprime le texte quand le contenu validé ne contient que des blancs (%j)",
    (content) => {
      const initial = makeEditorWithRect();
      initial.doc.shapes = [makeTextShape({ id: "text-1", content: "Hello" })];

      const next = applyEditorActions(
        initial,
        commitTextEditActions({
          shapeId: "text-1",
          input: { content },
          doc: initial.doc,
        }),
      );

      expectShapeCount(next, 0);
      expect(next.selection.ids).toEqual([]);
    },
  );

  it("ne laisse aucun texte si la saisie validée ne contient que des blancs après création", () => {
    const initial = withTextTool(makeEditorWithRect());
    const shapeCountBefore = initial.doc.shapes.length;

    const afterCreate = runGesture(initial, [
      { type: "background-down", world: { x: 40, y: 50 } },
      { type: "up" },
    ]);

    expect(actionsOfType(afterCreate.allActions, "SHAPE_ADD")).toHaveLength(0);

    const afterCommit = applyEditorActions(
      afterCreate.state,
      commitTextEditActions({
        shapeId: "new-shape-id",
        input: { content: " \n\t " },
        doc: afterCreate.state.doc,
        pendingWorld: { x: 40, y: 50 },
      }),
    );

    expectShapeCount(afterCommit, shapeCountBefore);
    expect(afterCommit.doc.shapes).toEqual(initial.doc.shapes);
  });
});

describe("workflow: taille de police texte", () => {
  it("met à jour fontSize via SHAPE_UPDATE", () => {
    const initial = makeEditorWithRect();
    initial.doc.shapes = [
      makeTextShape({ id: "text-1", fontSize: 16, content: "Hello" }),
    ];

    const next = applyEditorActions(initial, [
      {
        type: "SHAPE_UPDATE",
        id: "text-1",
        patch: { fontSize: 32 },
      },
    ]);

    expectShapeInDoc(next, "text-1", {
      type: "text",
      fontSize: 32,
      content: "Hello",
    });
    expect(next.history.past.length).toBeGreaterThan(0);
  });

  it("recale le texte si une taille de police plus grande dépasserait le bord bas du viewBox", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.doc.viewBox = viewBox;
    initial.doc.shapes = [
      makeTextShape({
        id: "text-1",
        transform: { x: 50, y: 92 },
        content: "Hi",
        fontSize: 16,
      }),
    ];

    const next = applyEditorActions(initial, [
      {
        type: "SHAPE_UPDATE",
        id: "text-1",
        patch: { fontSize: 48 },
      },
    ]);

    const updated = getShapeById(next.doc, "text-1");
    if (updated?.type !== "text") throw new Error("fixture texte attendue");
    expect(updated.fontSize).toBe(48);
    expect(updated.transform.y).toBeLessThan(92);
    expect(textStaysInViewBox(updated, viewBox)).toBe(true);
    expect(textBoundsBottom(estimateTextBounds(updated))).toBeLessThanOrEqual(
      viewBox.y + viewBox.h,
    );
  });
});
