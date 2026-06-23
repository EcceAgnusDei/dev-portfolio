import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type {
  CircleShape,
  CubicMvpPathSegments,
  CubicWorldPoints,
  LineShape,
  PathShape,
  RectShape,
  TextShape,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
import {
  VECTOR_AI_DEFAULT_FONT_FAMILY,
  VECTOR_AI_DEFAULT_FONT_SIZE,
  VECTOR_AI_MAX_SHAPES,
} from "@/features/vector-ai/lib/vector-ai-config";
import { createInitialEditorState } from "@/features/vector-ai/lib/editor/core/state";
import { cubicWorldToLocalSegments } from "@/features/vector-ai/lib/editor/geometry/path-segments";
import { segmentsToPathD } from "@/features/vector-ai/lib/view/segments-to-path-d";
import { VECTOR_AI_DEFAULT_CUBIC_PATH_STYLE } from "@/features/vector-ai/lib/vector-ai-config";

export const CUBIC_REFERENCE_WORLD: CubicWorldPoints = {
  p0: { x: 10, y: 20 },
  c1: { x: 30, y: 10 },
  c2: { x: 50, y: 40 },
  p3: { x: 70, y: 20 },
};

export const CUBIC_REFERENCE_TRANSFORM = {
  x: CUBIC_REFERENCE_WORLD.p0.x,
  y: CUBIC_REFERENCE_WORLD.p0.y,
};

export const CUBIC_REFERENCE_SEGMENTS: CubicMvpPathSegments =
  cubicWorldToLocalSegments(CUBIC_REFERENCE_WORLD);

export const CUBIC_REFERENCE_PATH_D = segmentsToPathD(CUBIC_REFERENCE_SEGMENTS);

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

export function makeEditorWithTwoRects(selectedIds: string[] = []) {
  const state = makeEditorWithRect("rect-1");
  state.doc.shapes = [
    makeRectShape({ id: "rect-1" }),
    makeRectShape({ id: "rect-2", transform: { x: 120, y: 20 } }),
  ];
  state.selection = { ids: selectedIds };
  return state;
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

export function makeTextShape(overrides?: Partial<TextShape>): TextShape {
  const base: TextShape = {
    id: "text-1",
    type: "text",
    transform: { x: 40, y: 50 },
    content: "Hello",
    fontSize: VECTOR_AI_DEFAULT_FONT_SIZE,
    fontFamily: VECTOR_AI_DEFAULT_FONT_FAMILY,
    style: { fill: "#000000" },
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    transform: { ...base.transform, ...overrides.transform },
    style: { ...base.style, ...overrides.style },
  };
}

export function makeCubicPathShape(
  overrides?: Partial<PathShape>,
): PathShape {
  const base: PathShape = {
    id: "path-1",
    type: "path",
    transform: { ...CUBIC_REFERENCE_TRANSFORM },
    segments: [...CUBIC_REFERENCE_SEGMENTS],
    style: { ...VECTOR_AI_DEFAULT_CUBIC_PATH_STYLE },
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    transform: { ...base.transform, ...overrides.transform },
    style: { ...base.style, ...overrides.style },
    segments: overrides.segments ?? base.segments,
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
      makeCubicPathShape({ id: "path-1" }),
    ],
  };
}

export function makeEditorWithSampleDoc() {
  return createInitialEditorState(makeSampleDoc());
}

export function makeEmptyVectorDoc(): VectorDoc {
  return createEmptyDoc();
}

export function makeDocWithRectAndPath(): VectorDoc {
  return {
    ...createEmptyDoc(),
    shapes: [makeRectShape({ id: "rect-1" }), makeCubicPathShape({ id: "path-1" })],
  };
}

export function makeDocAtMaxShapes(): VectorDoc {
  const shapes: RectShape[] = [];
  for (let i = 0; i < VECTOR_AI_MAX_SHAPES; i++) {
    shapes.push(
      makeRectShape({
        id: `rect-${i}`,
        transform: { x: i, y: i },
        w: 10,
        h: 10,
      }),
    );
  }
  return {
    ...createEmptyDoc(),
    shapes,
  };
}

export function makeDocNearMaxShapes(): VectorDoc {
  const shapes: RectShape[] = [];
  for (let i = 0; i < VECTOR_AI_MAX_SHAPES - 1; i++) {
    shapes.push(
      makeRectShape({
        id: `rect-${i}`,
        transform: { x: i, y: i },
        w: 10,
        h: 10,
      }),
    );
  }
  return {
    ...createEmptyDoc(),
    shapes,
  };
}

export const MINIMAL_VALID_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
