import type { CircleShape, RectShape } from "@/features/vector-ai/lib/document/types";
import type { RectPreview } from "@/features/vector-ai/lib/editor/preview/rect";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type {
  CircleResizeHandle,
  RectResizeHandle,
} from "@/features/vector-ai/lib/editor/session/types";
import type { ViewBox } from "@/features/vector-ai/lib/document/types";

export function rectHandleWorldPoint(
  rect: Pick<RectShape, "transform" | "w" | "h">,
  handle: RectResizeHandle,
): WorldPoint {
  const { x, y } = rect.transform;
  const { w, h } = rect;
  switch (handle) {
    case "nw":
      return { x, y };
    case "n":
      return { x: x + w / 2, y };
    case "ne":
      return { x: x + w, y };
    case "e":
      return { x: x + w, y: y + h / 2 };
    case "se":
      return { x: x + w, y: y + h };
    case "s":
      return { x: x + w / 2, y: y + h };
    case "sw":
      return { x, y: y + h };
    case "w":
      return { x, y: y + h / 2 };
  }
}

export function circleHandleWorldPoint(
  circle: Pick<CircleShape, "transform" | "r">,
  handle: CircleResizeHandle,
): WorldPoint {
  const { x: cx, y: cy } = circle.transform;
  const { r } = circle;
  switch (handle) {
    case "n":
      return { x: cx, y: cy - r };
    case "e":
      return { x: cx + r, y: cy };
    case "s":
      return { x: cx, y: cy + r };
    case "w":
      return { x: cx - r, y: cy };
  }
}

export type RectBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function resizeRectFromHandle(
  startBounds: RectBounds,
  handle: RectResizeHandle,
  pointer: WorldPoint,
): RectPreview {
  const { x, y, w, h } = startBounds;
  const seX = x + w;
  const seY = y + h;

  let x1 = x;
  let y1 = y;
  let x2 = seX;
  let y2 = seY;

  switch (handle) {
    case "se":
      x2 = pointer.x;
      y2 = pointer.y;
      break;
    case "nw":
      x1 = pointer.x;
      y1 = pointer.y;
      break;
    case "ne":
      x2 = pointer.x;
      y1 = pointer.y;
      break;
    case "sw":
      x1 = pointer.x;
      y2 = pointer.y;
      break;
    case "e":
      x2 = pointer.x;
      break;
    case "w":
      x1 = pointer.x;
      break;
    case "n":
      y1 = pointer.y;
      break;
    case "s":
      y2 = pointer.y;
      break;
  }

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

export function resizeCircleFromHandle(
  center: WorldPoint,
  handle: CircleResizeHandle,
  pointer: WorldPoint,
): { cx: number; cy: number; r: number } {
  const { x: cx, y: cy } = center;
  let r = 0;
  switch (handle) {
    case "e":
      r = Math.abs(pointer.x - cx);
      break;
    case "w":
      r = Math.abs(cx - pointer.x);
      break;
    case "n":
      r = Math.abs(cy - pointer.y);
      break;
    case "s":
      r = Math.abs(pointer.y - cy);
      break;
  }
  return { cx, cy, r };
}

export function maxCircleRadiusInViewBox(
  cx: number,
  cy: number,
  viewBox: ViewBox,
): number {
  const minX = viewBox.x;
  const minY = viewBox.y;
  const maxX = viewBox.x + viewBox.w;
  const maxY = viewBox.y + viewBox.h;
  return Math.min(cx - minX, maxX - cx, cy - minY, maxY - cy);
}

export function clampCircleRadiusToViewBox(
  cx: number,
  cy: number,
  r: number,
  viewBox: ViewBox,
): number {
  if (r <= 0) return 0;
  return Math.min(r, maxCircleRadiusInViewBox(cx, cy, viewBox));
}
