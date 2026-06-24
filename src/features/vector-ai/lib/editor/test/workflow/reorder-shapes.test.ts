/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import {
  canRedo,
  canUndo,
  getShapeById,
} from "@/features/vector-ai/lib/editor/core/selectors";
import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";
import {
  getZOrderAvailability,
  type ZOrderCommand,
} from "@/features/vector-ai/lib/editor/dispatch/reorder-shapes";
import { expectDocUnchanged } from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  renderInteractiveCanvas,
  renderStyleToolbarHarness,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import {
  actionsOfType,
  lastSnapshot,
  runGesture,
  type GestureStep,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import {
  makeEditorWithRect,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

function makeEditorWithOrderedRects(
  ids: string[],
  selectedIds: string[] = [],
): EditorState {
  const state = makeEditorWithRect(ids[0]!);
  state.doc.shapes = ids.map((id, index) =>
    makeRectShape({ id, transform: { x: index * 50, y: 20 } }),
  );
  state.selection = { ids: selectedIds };
  return state;
}

function shapeIds(state: EditorState): string[] {
  return state.doc.shapes.map((shape) => shape.id);
}

function reorder(command: ZOrderCommand): GestureStep {
  return { type: "reorder-selected", command };
}

function clickMenuItem(label: string) {
  const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
    (node) => node.textContent === label,
  );
  expect(item).toBeTruthy();
  act(() => {
    item!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
}

describe("workflow: ordre de superposition", () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  describe("forme unique", () => {
    it("avance une forme d'un cran", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);

      const result = runGesture(initial, [reorder("forward")]);

      expect(shapeIds(result.state)).toEqual(["a", "c", "b"]);
      expect(result.state.selection.ids).toEqual(["b"]);
      expect(result.state.history.past).toHaveLength(1);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toEqual([
        {
          type: "SHAPES_REORDER",
          ids: ["b"],
          command: "forward",
          recordHistory: true,
        },
      ]);
      expect(lastSnapshot(result).session.kind).toBe("idle");
    });

    it("recule une forme d'un cran", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);

      const result = runGesture(initial, [reorder("backward")]);

      expect(shapeIds(result.state)).toEqual(["b", "a", "c"]);
      expect(result.state.selection.ids).toEqual(["b"]);
      expect(result.state.history.past).toHaveLength(1);
    });

    it("met une forme au premier plan", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["a"]);

      const result = runGesture(initial, [reorder("front")]);

      expect(shapeIds(result.state)).toEqual(["b", "c", "a"]);
      expect(result.state.selection.ids).toEqual(["a"]);
      expect(result.state.history.past).toHaveLength(1);
    });

    it("met une forme à l'arrière-plan", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["c"]);

      const result = runGesture(initial, [reorder("back")]);

      expect(shapeIds(result.state)).toEqual(["c", "a", "b"]);
      expect(result.state.selection.ids).toEqual(["c"]);
      expect(result.state.history.past).toHaveLength(1);
    });
  });

  describe("limites de pile", () => {
    it("n'avance pas une forme déjà au premier plan", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["c"]);

      const result = runGesture(initial, [reorder("forward")]);

      expectDocUnchanged(initial, result.state);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        0,
      );
      expect(result.state.history.past).toHaveLength(0);
    });

    it("ne recule pas une forme déjà à l'arrière-plan", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["a"]);

      const result = runGesture(initial, [reorder("backward")]);

      expectDocUnchanged(initial, result.state);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        0,
      );
      expect(result.state.history.past).toHaveLength(0);
    });

    it("ne change rien avec premier plan quand la forme est déjà devant", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["c"]);

      const result = runGesture(initial, [reorder("front")]);

      expectDocUnchanged(initial, result.state);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        0,
      );
    });

    it("ne change rien avec arrière-plan quand la forme est déjà derrière", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["a"]);

      const result = runGesture(initial, [reorder("back")]);

      expectDocUnchanged(initial, result.state);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        0,
      );
    });

    it("n'applique aucune commande sur un document à une seule forme", () => {
      for (const command of ["forward", "backward", "front", "back"] as const) {
        const initial = makeEditorWithOrderedRects(["only"], ["only"]);

        const result = runGesture(initial, [reorder(command)]);

        expectDocUnchanged(initial, result.state);
        expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
          0,
        );
      }
    });
  });

  describe("prérequis de sélection et d'outil", () => {
    it("ne réordonne rien sans sélection", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], []);

      const result = runGesture(initial, [reorder("forward")]);

      expectDocUnchanged(initial, result.state);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        0,
      );
      expect(result.state.history.past).toHaveLength(0);
    });

    it("ne réordonne pas hors outil sélection", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);
      initial.tool = "rect";

      const result = runGesture(initial, [reorder("forward")]);

      expectDocUnchanged(initial, result.state);
      expect(result.state.tool).toBe("rect");
      expect(result.state.selection.ids).toEqual(["b"]);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        0,
      );
    });
  });

  describe("multi-sélection", () => {
    it("avance chaque forme sélectionnée en conservant leur ordre relatif", () => {
      const initial = makeEditorWithOrderedRects(
        ["a", "b", "c", "d", "e"],
        ["b", "d"],
      );

      const result = runGesture(initial, [reorder("forward")]);

      expect(shapeIds(result.state)).toEqual(["a", "c", "b", "e", "d"]);
      expect(result.state.selection.ids).toEqual(["b", "d"]);
      expect(result.state.history.past).toHaveLength(1);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toEqual([
        {
          type: "SHAPES_REORDER",
          ids: ["b", "d"],
          command: "forward",
          recordHistory: true,
        },
      ]);
    });

    it("recule chaque forme sélectionnée en conservant leur ordre relatif", () => {
      const initial = makeEditorWithOrderedRects(
        ["a", "b", "c", "d", "e"],
        ["b", "d"],
      );

      const result = runGesture(initial, [reorder("backward")]);

      expect(shapeIds(result.state)).toEqual(["b", "a", "d", "c", "e"]);
      expect(result.state.selection.ids).toEqual(["b", "d"]);
    });

    it("met toute la sélection au premier plan en bloc", () => {
      const initial = makeEditorWithOrderedRects(
        ["a", "b", "c", "d", "e"],
        ["b", "d"],
      );

      const result = runGesture(initial, [reorder("front")]);

      expect(shapeIds(result.state)).toEqual(["a", "c", "e", "b", "d"]);
      expect(result.state.selection.ids).toEqual(["b", "d"]);
    });

    it("met toute la sélection à l'arrière-plan en bloc", () => {
      const initial = makeEditorWithOrderedRects(
        ["a", "b", "c", "d", "e"],
        ["b", "d"],
      );

      const result = runGesture(initial, [reorder("back")]);

      expect(shapeIds(result.state)).toEqual(["b", "d", "a", "c", "e"]);
      expect(result.state.selection.ids).toEqual(["b", "d"]);
    });

    it("déplace un bloc contigu d'un cran vers l'avant", () => {
      const initial = makeEditorWithOrderedRects(
        ["a", "b", "c", "d", "e"],
        ["b", "c"],
      );

      const result = runGesture(initial, [reorder("forward")]);

      expect(shapeIds(result.state)).toEqual(["a", "d", "b", "c", "e"]);
      expect(result.state.selection.ids).toEqual(["b", "c"]);
    });
  });

  describe("formes verrouillées", () => {
    it("ne réordonne pas une forme verrouillée seule", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);
      initial.doc.shapes[1]!.locked = true;

      const result = runGesture(initial, [reorder("forward")]);

      expectDocUnchanged(initial, result.state);
      expect(result.state.selection.ids).toEqual(["b"]);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        0,
      );
    });

    it("réordonne uniquement les formes déverrouillées d'une multi-sélection", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b", "c"]);
      initial.doc.shapes[1]!.locked = true;

      const result = runGesture(initial, [reorder("forward")]);

      expect(shapeIds(result.state)).toEqual(["a", "b", "c"]);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        0,
      );
    });

    it("peut passer une forme déverrouillée devant une forme verrouillée", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);
      initial.doc.shapes[2]!.locked = true;

      const result = runGesture(initial, [reorder("forward")]);

      expect(shapeIds(result.state)).toEqual(["a", "c", "b"]);
      expect(getShapeById(initial.doc, "c")?.locked).toBe(true);
      expect(getShapeById(result.state.doc, "c")?.locked).toBe(true);
    });

    it("recule une forme déverrouillée derrière une forme verrouillée", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["c"]);
      initial.doc.shapes[1]!.locked = true;

      const result = runGesture(initial, [reorder("backward")]);

      expect(shapeIds(result.state)).toEqual(["a", "c", "b"]);
      expect(getShapeById(result.state.doc, "b")?.locked).toBe(true);
    });
  });

  describe("historique", () => {
    it("annule et rétablit un réordonnancement", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);

      const moved = runGesture(initial, [reorder("forward")]);
      expect(shapeIds(moved.state)).toEqual(["a", "c", "b"]);
      expect(canUndo(moved.state)).toBe(true);

      const restored = runGesture(moved.state, [{ type: "undo" }]);
      expect(shapeIds(restored.state)).toEqual(["a", "b", "c"]);
      expect(restored.state.selection.ids).toEqual(["b"]);
      expect(canRedo(restored.state)).toBe(true);

      const redone = runGesture(restored.state, [{ type: "redo" }]);
      expect(shapeIds(redone.state)).toEqual(["a", "c", "b"]);
      expect(redone.state.selection.ids).toEqual(["b"]);
      expect(canRedo(redone.state)).toBe(false);
    });

    it("empile plusieurs réordonnancements distincts", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c", "d"], ["b"]);

      const first = runGesture(initial, [reorder("forward")]);
      expect(shapeIds(first.state)).toEqual(["a", "c", "b", "d"]);
      expect(first.state.history.past).toHaveLength(1);

      const second = runGesture(first.state, [reorder("forward")]);
      expect(shapeIds(second.state)).toEqual(["a", "c", "d", "b"]);
      expect(second.state.history.past).toHaveLength(2);

      const once = runGesture(second.state, [{ type: "undo" }]);
      expect(shapeIds(once.state)).toEqual(["a", "c", "b", "d"]);

      const twice = runGesture(once.state, [{ type: "undo" }]);
      expect(shapeIds(twice.state)).toEqual(["a", "b", "c", "d"]);
    });
  });

  describe("interaction en cours", () => {
    it("réordonne pendant un déplacement sans committer le déplacement", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);

      const result = runGesture(initial, [
        { type: "shape-down", shapeId: "b", world: { x: 50, y: 20 } },
        { type: "move", world: { x: 80, y: 40 } },
        reorder("forward"),
      ]);

      expect(shapeIds(result.state)).toEqual(["a", "c", "b"]);
      expect(result.state.selection.ids).toEqual(["b"]);
      expect(actionsOfType(result.allActions, "SHAPE_UPDATE")).toHaveLength(0);
      expect(actionsOfType(result.allActions, "SHAPES_REORDER")).toHaveLength(
        1,
      );
      expect(lastSnapshot(result).session.kind).toBe("idle");
      expectShapeInDocPosition(result.state, "b", { x: 50, y: 20 });
    });
  });

  describe("disponibilité des commandes", () => {
    it("active les quatre commandes pour une forme au milieu", () => {
      const doc = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]).doc;

      expect(getZOrderAvailability(doc, ["b"])).toEqual({
        front: true,
        forward: true,
        backward: true,
        back: true,
      });
    });

    it("désactive reculer et arrière-plan pour la forme du dessous", () => {
      const doc = makeEditorWithOrderedRects(["a", "b", "c"], ["a"]).doc;

      expect(getZOrderAvailability(doc, ["a"])).toEqual({
        front: true,
        forward: true,
        backward: false,
        back: false,
      });
    });

    it("désactive avancer et premier plan pour la forme du dessus", () => {
      const doc = makeEditorWithOrderedRects(["a", "b", "c"], ["c"]).doc;

      expect(getZOrderAvailability(doc, ["c"])).toEqual({
        front: false,
        forward: false,
        backward: true,
        back: true,
      });
    });

    it("désactive toutes les commandes pour une forme verrouillée", () => {
      const state = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);
      state.doc.shapes[1]!.locked = true;

      expect(getZOrderAvailability(state.doc, ["b"])).toEqual({
        front: false,
        forward: false,
        backward: false,
        back: false,
      });
    });
  });

  describe("câblage React", () => {
    it("réordonne via le hook d'interaction", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);
      const { interaction, getState, unmount } =
        renderInteractiveCanvas(initial);

      act(() => {
        interaction.reorderSelectedShapes("forward");
      });

      expect(shapeIds(getState())).toEqual(["a", "c", "b"]);
      expect(getState().selection.ids).toEqual(["b"]);
      expect(getState().history.past).toHaveLength(1);
      expect(interaction.session.kind).toBe("idle");
      expect(
        getZOrderAvailability(getState().doc, getState().selection.ids).forward,
      ).toBe(false);
      expect(
        getZOrderAvailability(getState().doc, getState().selection.ids)
          .backward,
      ).toBe(true);
      expect(canUndo(getState())).toBe(true);

      unmount();
    });

    it("n'expose pas le réordonnancement quand l'outil n'est pas sélection", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);
      initial.tool = "rect";
      const { interaction, getState, unmount } =
        renderInteractiveCanvas(initial);

      act(() => {
        interaction.reorderSelectedShapes("forward");
      });

      expect(shapeIds(getState())).toEqual(["a", "b", "c"]);
      expect(interaction.canReorderSelectedShapes).toBe(false);

      unmount();
    });

    it("réordonne via le menu Ordre de la toolbar", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], ["b"]);
      const { container, getState, unmount } =
        renderStyleToolbarHarness(initial);

      const trigger = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Ordre",
      );
      expect(trigger).toBeTruthy();
      expect((trigger as HTMLButtonElement).disabled).toBe(false);

      act(() => {
        trigger!.click();
      });

      clickMenuItem("Avancer");

      expect(shapeIds(getState())).toEqual(["a", "c", "b"]);
      expect(getState().selection.ids).toEqual(["b"]);
      expect(getState().history.past).toHaveLength(1);
      expect(canUndo(getState())).toBe(true);

      unmount();
    });

    it("désactive le menu Ordre sans sélection réordonnable", () => {
      const initial = makeEditorWithOrderedRects(["a", "b", "c"], []);
      const { container, unmount } = renderStyleToolbarHarness(initial);

      const trigger = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Ordre",
      );
      expect(trigger).toBeTruthy();
      expect((trigger as HTMLButtonElement).disabled).toBe(true);

      unmount();
    });
  });
});

function expectShapeInDocPosition(
  state: EditorState,
  id: string,
  transform: { x: number; y: number },
) {
  const shape = state.doc.shapes.find((entry) => entry.id === id);
  expect(shape?.transform).toEqual(transform);
}
