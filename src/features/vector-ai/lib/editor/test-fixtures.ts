import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type { RectShape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import { createInitialEditorState } from "@/features/vector-ai/lib/editor/state";

export function makeRectShape(overrides?: Partial<RectShape>): RectShape {
  const base: RectShape = {
    id: "rect-1",
    type: "rect",
    transform: { x: 10, y: 20 },
    style: {
      fill: "#000000",
      stroke: "none",
    },
    w: 100,
    h: 50,
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    transform: { ...base.transform, ...overrides.transform },
    style: { ...base.style, ...overrides.style },
  };
}

export function makeDocWithRect(id = "rect-1"): VectorDoc {
  return {
    ...createEmptyDoc(),
    shapes: [makeRectShape({ id })],
  };
}

export function makeEditorWithRect(id = "rect-1") {
  return createInitialEditorState(makeDocWithRect(id));
}
