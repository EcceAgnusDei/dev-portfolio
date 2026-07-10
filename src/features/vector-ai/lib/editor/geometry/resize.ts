import type {
  CircleShape,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import type { RectPreview } from "@/features/vector-ai/lib/editor/preview/rect";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type {
  CircleResizeHandle,
  RectResizeHandle,
} from "@/features/vector-ai/lib/editor/session/types";
import {
  VECTOR_AI_RECT_CORNER_HANDLE_ZONE_TOLERANCE_FACTOR,
  VECTOR_AI_RECT_EDGE_HANDLE_OUTWARD_TOLERANCE_FACTOR,
} from "@/features/vector-ai/lib/vector-ai-config";

export const RECT_RESIZE_CURSOR: Record<RectResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

export const CIRCLE_RESIZE_CURSOR: Record<CircleResizeHandle, string> = {
  n: "ns-resize",
  e: "ew-resize",
  s: "ns-resize",
  w: "ew-resize",
};

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

export function distanceToCircleContour(
  center: WorldPoint,
  r: number,
  pointer: WorldPoint,
): number {
  return Math.abs(
    Math.hypot(pointer.x - center.x, pointer.y - center.y) - r,
  );
}

export function isOnCircleContour(
  circle: Pick<CircleShape, "transform" | "r">,
  pointer: WorldPoint,
  tolerance: number,
): boolean {
  return (
    distanceToCircleContour(circle.transform, circle.r, pointer) <= tolerance
  );
}

export function resolveCircleResizeHandle(
  center: WorldPoint,
  pointer: WorldPoint,
): CircleResizeHandle {
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "e" : "w";
  }
  return dy > 0 ? "s" : "n";
}

function rectCornerZone(tolerance: number, w: number, h: number): number {
  return Math.min(
    tolerance * VECTOR_AI_RECT_CORNER_HANDLE_ZONE_TOLERANCE_FACTOR,
    w / 2,
    h / 2,
  );
}

export function rectResizeHitStrokeWidth(tolerance: number): number {
  const outward = tolerance * VECTOR_AI_RECT_EDGE_HANDLE_OUTWARD_TOLERANCE_FACTOR;
  return tolerance + outward;
}

export function resolveRectResizeHandle(
  bounds: RectBounds,
  pointer: WorldPoint,
  tolerance: number,
): RectResizeHandle {
  const { x, y, w, h } = bounds;
  const seX = x + w;
  const seY = y + h;

  const cornerZone = rectCornerZone(tolerance, w, h);

  const distLeft = pointer.x - x;
  const distRight = seX - pointer.x;
  const distTop = pointer.y - y;
  const distBottom = seY - pointer.y;

  const minHoriz = Math.min(distLeft, distRight);
  const minVert = Math.min(distTop, distBottom);

  if (minHoriz <= minVert) {
    if (minHoriz === distLeft) {
      if (distTop <= cornerZone) return "nw";
      if (distBottom <= cornerZone) return "sw";
      return "w";
    }
    if (distTop <= cornerZone) return "ne";
    if (distBottom <= cornerZone) return "se";
    return "e";
  }

  if (minVert === distTop) {
    if (distLeft <= cornerZone) return "nw";
    if (distRight <= cornerZone) return "ne";
    return "n";
  }

  if (distLeft <= cornerZone) return "sw";
  if (distRight <= cornerZone) return "se";
  return "s";
}

export function cursorForRectResizeAtWorld(
  bounds: RectBounds,
  pointer: WorldPoint,
  tolerance: number,
): string {
  return RECT_RESIZE_CURSOR[resolveRectResizeHandle(bounds, pointer, tolerance)];
}

export function cursorForSelectedShapeAtWorld(
  shape: CircleShape,
  pointer: WorldPoint,
  tolerance: number,
): string {
  if (!isOnCircleContour(shape, pointer, tolerance)) return "";
  return CIRCLE_RESIZE_CURSOR[resolveCircleResizeHandle(shape.transform, pointer)];
}
