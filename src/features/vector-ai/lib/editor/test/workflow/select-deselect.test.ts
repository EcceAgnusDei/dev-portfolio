import { describe, expect, it } from "vitest";

import { runGesture } from "@/features/vector-ai/lib/editor/test/run-gesture";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: sélection", () => {
  it("sélectionne au clic sur une forme en mode select", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.selection.ids = [];

    const { state, session } = runGesture(initial, [
      { type: "shape-down", shapeId: "rect-1", world: { x: 10, y: 20 } },
    ]);

    expect(state.selection.ids).toEqual(["rect-1"]);
    expect(state.history.past).toHaveLength(0);
    expect(session.kind).toBe("move");
  });

  it("désélectionne au clic sur le fond en mode select", () => {
    const initial = makeEditorWithRect("rect-1");
    initial.selection.ids = ["rect-1"];

    const { state, session } = runGesture(initial, [
      { type: "background-down", world: { x: 5, y: 5 } },
    ]);

    expect(state.selection.ids).toEqual([]);
    expect(state.history.past).toHaveLength(0);
    expect(session.kind).toBe("idle");
  });
});
