import type { ShapeType } from "@/features/vector-ai/lib/document/types";

export const VECTOR_AI_PROMPT_MAX_LENGTH = 1000;

export const VECTOR_AI_MAX_OUTPUT_TOKENS = 16_384;

export const VECTOR_AI_RATE_LIMIT_MAX = 10;
export const VECTOR_AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export const VECTOR_AI_LLM_ALLOWED_SHAPE_TYPES = [
  "rect",
  "circle",
  "line",
  "text",
] as const satisfies readonly ShapeType[];
