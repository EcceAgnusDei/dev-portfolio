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

export const VECTOR_AI_PREVIEW_PNG_MAX_LONG_EDGE = 256;

export const VECTOR_AI_PREVIEW_PNG_MAX_BASE64_LENGTH = 400_000;

export const VECTOR_AI_PREVIEW_MEDIA_RESOLUTION = "MEDIA_RESOLUTION_MEDIUM" as const;

export type VectorAiPreviewPng = {
  base64: string;
  mimeType: "image/png";
};
