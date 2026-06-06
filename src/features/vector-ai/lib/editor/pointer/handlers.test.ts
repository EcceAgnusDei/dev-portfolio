import { describe, expect, it } from "vitest";

import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";
import {
  handleLineEndPointerDown,
  handleShapePointerDown,
  type EditorInteractionState,
  shapePointerEventsForTool,
} from "@/features/vector-ai/lib/editor/pointer/handlers";
import {
  makeCircleShape,
  makeEditorWithRect,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

function interactionState(
  editor: Pick<EditorState, "doc" | "tool">,
): EditorInteractionState {
  return { doc: editor.doc, tool: editor.tool };
}

describe("pointer handlers", () => {
  it("ignore le clic forme hors mode select", () => {
    const editor = makeEditorWithRect("rect-1");
    editor.tool = "rect";
    const interaction = interactionState(editor);

    expect(
      handleShapePointerDown(interaction, "rect-1", { x: 0, y: 0 }, 1),
    ).toBeNull();
  });

  it("ignore une forme verrouillée", () => {
    const editor = makeEditorWithRect("rect-1");
    editor.doc.shapes = [makeRectShape({ id: "rect-1", locked: true })];
    const interaction = interactionState(editor);

    expect(
      handleShapePointerDown(interaction, "rect-1", { x: 0, y: 0 }, 1),
    ).toBeNull();
  });

  it("ignore line-end sur une forme non ligne", () => {
    const editor = makeEditorWithRect("rect-1");
    const interaction = interactionState(editor);

    expect(
      handleLineEndPointerDown(interaction, "rect-1", "end", { x: 0, y: 0 }, 1),
    ).toBeNull();
  });

  it("ignore line-end sur cercle", () => {
    const editor = makeEditorWithRect();
    editor.doc.shapes = [makeCircleShape({ id: "circle-1" })];
    const interaction = interactionState(editor);

    expect(
      handleLineEndPointerDown(
        interaction,
        "circle-1",
        "end",
        { x: 0, y: 0 },
        1,
      ),
    ).toBeNull();
  });

  it("expose shapePointerEvents auto en select et none en dessin", () => {
    expect(shapePointerEventsForTool("select")).toBe("auto");
    expect(shapePointerEventsForTool("rect")).toBe("none");
    expect(shapePointerEventsForTool("circle")).toBe("none");
    expect(shapePointerEventsForTool("line")).toBe("none");
  });
});
