import type { GridCoord } from "@/features/pixel-ai/lib/grid-coords";

export const PIXEL_AI_DEFAULT_GRID_SIZE: GridCoord = { x: 50, y: 30 };
export const PIXEL_AI_DEFAULT_CELL_SIZE = "10px";

export const MAX_GRID_CELLS = 150 * 150;

export const PIXEL_AI_PROMPT_MAX_LENGTH = 1000;

export const PIXEL_AI_MAX_OUTPUT_TOKENS = 32768;

export const PIXEL_AI_RATE_LIMIT_MAX = 10;
export const PIXEL_AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
