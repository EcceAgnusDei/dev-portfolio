import { describe, expect, it } from "vitest";

import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import { createInitialEditorState } from "@/features/vector-ai/lib/editor/state";
import { makeDocWithRect } from "@/features/vector-ai/lib/editor/test-fixtures";

describe("createInitialEditorState", () => {
  it("initialise un document vide par défaut", () => {
    const state = createInitialEditorState();
    expect(state.doc.shapes).toEqual([]);
    expect(state.selection.ids).toEqual([]);
    expect(state.tool).toBe("select");
    expect(state.history.past).toEqual([]);
    expect(state.history.future).toEqual([]);
  });

  it("accepte un document fourni", () => {
    const doc = makeDocWithRect("custom");
    const state = createInitialEditorState(doc);
    expect(state.doc.shapes).toHaveLength(1);
    expect(state.doc.shapes[0]?.id).toBe("custom");
  });

  it("ne partage pas la référence du doc passé", () => {
    const doc = createEmptyDoc();
    const state = createInitialEditorState(doc);
    expect(state.doc).toBe(doc);
  });
});
