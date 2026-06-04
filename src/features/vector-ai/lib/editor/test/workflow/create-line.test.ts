import "@/features/vector-ai/lib/editor/test/mock-create-shape-id";

import { describe, expect, it } from "vitest";

import {
  expectAfterCreate,
  expectDocUnchanged,
  expectShapeCount,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  actionsOfType,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: création ligne", () => {
  it("crée une ligne au drag en mode line", () => {
    const initial = makeEditorWithRect();
    initial.tool = "line";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 60 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].previews.line).toEqual({
      x1: 10,
      y1: 20,
      x2: 50,
      y2: 60,
    });

    expectAfterCreate(result, "new-shape-id", {
      type: "line",
      transform: { x: 10, y: 20 },
      x2: 50,
      y2: 60,
    });
    expectShapeCount(result.state, initial.doc.shapes.length + 1);
  });

  it("borne le linePreview au viewBox quand le curseur déborde", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.tool = "line";
    initial.doc.viewBox = viewBox;

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 80, y: 80 } },
      { type: "move", world: { x: 150, y: 150 } },
    ]);

    const preview = result.snapshots[1].previews.line;
    expect(preview).toEqual({ x1: 80, y1: 80, x2: 100, y2: 100 });
  });

  it("n'ajoute pas une ligne trop petite", () => {
    const initial = makeEditorWithRect();
    initial.tool = "line";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 11, y: 21 } },
      { type: "up" },
    ]);

    expect(actionsOfType(result.allActions, "SHAPE_ADD")).toHaveLength(0);
    expectDocUnchanged(initial, result.state);
    expect(result.state.tool).toBe("line");
  });
});
