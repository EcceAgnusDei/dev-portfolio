import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { ViewBoxResizeHandle } from "@/features/vector-ai/lib/editor/session/types";
import {
  VECTOR_AI_MAX_VIEWBOX_DIMENSION,
  VECTOR_AI_MIN_VIEWBOX_DIMENSION,
} from "@/features/vector-ai/lib/vector-ai-config";

export const VIEWBOX_RESIZE_HANDLES = [
  "n",
  "e",
  "s",
  "w",
] as const satisfies readonly ViewBoxResizeHandle[];

function clampViewBoxDimension(value: number): number {
  return Math.max(
    VECTOR_AI_MIN_VIEWBOX_DIMENSION,
    Math.min(VECTOR_AI_MAX_VIEWBOX_DIMENSION, value),
  );
}

export function viewBoxHandleWorldPoint(
  viewBox: ViewBox,
  handle: ViewBoxResizeHandle,
): WorldPoint {
  const { x, y, w, h } = viewBox;
  switch (handle) {
    case "n":
      return { x: x + w / 2, y };
    case "s":
      return { x: x + w / 2, y: y + h };
    case "e":
      return { x: x + w, y: y + h / 2 };
    case "w":
      return { x, y: y + h / 2 };
  }
}

export function resizeViewBoxFromHandle(
  startViewBox: ViewBox,
  handle: ViewBoxResizeHandle,
  pointer: WorldPoint,
): ViewBox {
  const { x, y, w, h } = startViewBox;
  let nextX = x;
  let nextY = y;
  let nextW = w;
  let nextH = h;

  switch (handle) {
    case "n": {
      const bottom = y + h;
      nextY = pointer.y;
      nextH = bottom - nextY;
      if (nextH < VECTOR_AI_MIN_VIEWBOX_DIMENSION) {
        nextH = VECTOR_AI_MIN_VIEWBOX_DIMENSION;
        nextY = bottom - nextH;
      }
      break;
    }
    case "s": {
      nextH = pointer.y - y;
      if (nextH < VECTOR_AI_MIN_VIEWBOX_DIMENSION) {
        nextH = VECTOR_AI_MIN_VIEWBOX_DIMENSION;
      }
      break;
    }
    case "e": {
      nextW = pointer.x - x;
      if (nextW < VECTOR_AI_MIN_VIEWBOX_DIMENSION) {
        nextW = VECTOR_AI_MIN_VIEWBOX_DIMENSION;
      }
      break;
    }
    case "w": {
      const right = x + w;
      nextX = pointer.x;
      nextW = right - nextX;
      if (nextW < VECTOR_AI_MIN_VIEWBOX_DIMENSION) {
        nextW = VECTOR_AI_MIN_VIEWBOX_DIMENSION;
        nextX = right - nextW;
      }
      break;
    }
  }

  return {
    x: nextX,
    y: nextY,
    w: clampViewBoxDimension(nextW),
    h: clampViewBoxDimension(nextH),
  };
}
