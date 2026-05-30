import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type {
  CircleShape,
  LineShape,
  RectShape,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
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

export function makeCircleShape(
  overrides?: Partial<CircleShape>,
): CircleShape {
  const base: CircleShape = {
    id: "circle-1",
    type: "circle",
    transform: { x: 200, y: 120 },
    style: {
      fill: "none",
      stroke: "#000000",
      strokeWidth: 2,
    },
    r: 40,
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    transform: { ...base.transform, ...overrides.transform },
    style: { ...base.style, ...overrides.style },
  };
}

export function makeLineShape(overrides?: Partial<LineShape>): LineShape {
  const base: LineShape = {
    id: "line-1",
    type: "line",
    transform: { x: 80, y: 280 },
    style: {
      fill: "none",
      stroke: "#000000",
      strokeWidth: 2,
    },
    x2: 320,
    y2: 320,
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    transform: { ...base.transform, ...overrides.transform },
    style: { ...base.style, ...overrides.style },
  };
}

export function makeSampleDoc(): VectorDoc {
  return {
    ...createEmptyDoc(),
    shapes: [
      makeRectShape({
        id: "rect-1",
        transform: { x: 50, y: 50 },
        w: 140,
        h: 90,
        style: { fill: "#111111", stroke: "none" },
      }),
      makeCircleShape({ id: "circle-1" }),
      makeLineShape({ id: "line-1" }),
    ],
  };
}

export function makeEditorWithSampleDoc() {
  return createInitialEditorState(makeSampleDoc());
}
