import { expect } from "vitest";

import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";
import type { RunGestureResult } from "@/features/vector-ai/lib/editor/test/run-gesture";

export function expectShapeInDoc(
  state: EditorState,
  id: string,
  partial: Record<string, unknown>,
) {
  const shape = getShapeById(state.doc, id);
  expect(shape).toEqual(expect.objectContaining(partial));
}

export function expectAfterCreate(
  result: RunGestureResult,
  shapeId: string,
  partial: Record<string, unknown>,
) {
  expect(result.state.tool).toBe("select");
  expect(result.state.selection.ids).toEqual([shapeId]);
  expect(result.state.history.past.length).toBeGreaterThan(0);
  expect(result.state.history.future).toEqual([]);
  expectShapeInDoc(result.state, shapeId, partial);
}

export function expectAfterMove(
  result: RunGestureResult,
  shapeId: string,
  partial: Record<string, unknown>,
) {
  expect(result.state.history.past.length).toBeGreaterThan(0);
  expectShapeInDoc(result.state, shapeId, partial);
}

export function expectDocUnchanged(
  before: EditorState,
  after: EditorState,
) {
  expect(after.doc.shapes).toEqual(before.doc.shapes);
  expect(after.history).toEqual(before.history);
}

export function expectShapeCount(state: EditorState, count: number) {
  expect(state.doc.shapes).toHaveLength(count);
}
