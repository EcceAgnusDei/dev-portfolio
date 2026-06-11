import type { ShapeStyle } from "@/features/vector-ai/lib/document/types";

export const VECTOR_AI_DOC_VERSION = 1 as const;

export const VECTOR_AI_DEFAULT_VIEWBOX = {
  x: 0,
  y: 0,
  w: 800,
  h: 600,
} as const;

export const VECTOR_AI_MAX_SHAPES = 200;
export const VECTOR_AI_MAX_VIEWBOX_DIMENSION = 10_000;
export const VECTOR_AI_MAX_SHAPE_DIMENSION = 10_000;
export const VECTOR_AI_MAX_STROKE_WIDTH = 100;
export const VECTOR_AI_MAX_SHAPE_NAME_LENGTH = 100;
export const VECTOR_AI_MAX_SHAPE_ID_LENGTH = 64;

export const VECTOR_AI_HIT_LINE_STROKE_WIDTH = 16;
export const VECTOR_AI_HIT_CIRCLE_PADDING = 10;

export const VECTOR_AI_SELECTION_HANDLE_RADIUS = 7;
export const VECTOR_AI_SELECTION_HANDLE_STROKE_WIDTH = 1.5;

export const VECTOR_AI_MIN_RECT_SIZE = 2;
export const VECTOR_AI_MIN_CIRCLE_RADIUS = 1;
export const VECTOR_AI_MIN_LINE_LENGTH = 2;

export const VECTOR_AI_DEFAULT_RECT_STYLE: ShapeStyle = {
  fill: "#000000",
  stroke: "none",
};

export const VECTOR_AI_DEFAULT_CIRCLE_STYLE: ShapeStyle = {
  fill: "none",
  stroke: "#000000",
  strokeWidth: 2,
};

export const VECTOR_AI_DEFAULT_LINE_STYLE: ShapeStyle = {
  fill: "none",
  stroke: "#000000",
  strokeWidth: 2,
};

export const VECTOR_AI_MIN_CUBIC_POINT_DISTANCE = 2;
export const VECTOR_AI_CUBIC_PATH_SEGMENT_COUNT_MVP = 2;
export const VECTOR_AI_MAX_PATH_SEGMENTS = 32;

export const VECTOR_AI_DEFAULT_CUBIC_PATH_STYLE: ShapeStyle = {
  fill: "none",
  stroke: "#000000",
  strokeWidth: 2,
};

export const VECTOR_AI_DEFAULT_FONT_SIZE = 16;
export const VECTOR_AI_DEFAULT_FONT_FAMILY = "sans-serif";
export const VECTOR_AI_MAX_FONT_SIZE = 512;
export const VECTOR_AI_MAX_FONT_FAMILY_LENGTH = 200;
export const VECTOR_AI_MAX_TEXT_LENGTH = 2_000;

export const VECTOR_AI_DEFAULT_TEXT_STYLE: ShapeStyle = {
  fill: "#000000",
};

export const VECTOR_AI_HIT_TEXT_MIN_WIDTH = 24;
export const VECTOR_AI_HIT_TEXT_MIN_HEIGHT = 20;
export const VECTOR_AI_TEXT_LINE_HEIGHT_FACTOR = 1.2;
export const VECTOR_AI_TEXT_DOUBLE_CLICK_MS = 400;
