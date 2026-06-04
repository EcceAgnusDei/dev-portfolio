import "@/features/vector-ai/lib/editor/test/mock-create-shape-id";

import { describe, expect, it } from "vitest";

import {
  expectAfterCreate,
  expectDocUnchanged,
  expectShapeCount,
} from "@/features/vector-ai/lib/editor/test/expect-editor-state";
import {
  actionsOfType,
  lastSnapshot,
  runGesture,
} from "@/features/vector-ai/lib/editor/test/run-gesture";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: création rectangle", () => {
  it("crée un rectangle au drag et repasse en select", () => {
    const initial = makeEditorWithRect();
    initial.tool = "rect";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 50, y: 60 } },
      { type: "up" },
    ]);

    expect(result.snapshots[1].previews.rect).toEqual({
      x: 10,
      y: 20,
      w: 40,
      h: 40,
    });

    expectAfterCreate(result, "new-shape-id", {
      type: "rect",
      transform: { x: 10, y: 20 },
      w: 40,
      h: 40,
    });
    expectShapeCount(result.state, initial.doc.shapes.length + 1);
    expect(lastSnapshot(result).session.kind).toBe("idle");
  });

  it("borne le rectPreview au viewBox quand le curseur déborde", () => {
    const viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const initial = makeEditorWithRect();
    initial.tool = "rect";
    initial.doc.viewBox = viewBox;

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 80, y: 80 } },
      { type: "move", world: { x: 150, y: 150 } },
    ]);

    const preview = result.snapshots[1].previews.rect;
    expect(preview).toEqual({ x: 80, y: 80, w: 20, h: 20 });
  });

  it("n'ajoute pas un rectangle trop petit", () => {
    const initial = makeEditorWithRect();
    initial.tool = "rect";

    const result = runGesture(initial, [
      { type: "background-down", world: { x: 10, y: 20 } },
      { type: "move", world: { x: 11, y: 21 } },
      { type: "up" },
    ]);

    expect(actionsOfType(result.allActions, "SHAPE_ADD")).toHaveLength(0);
    expectDocUnchanged(initial, result.state);
    expect(result.state.tool).toBe("rect");
  });
});
