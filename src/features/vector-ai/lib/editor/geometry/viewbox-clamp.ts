import type {
  CircleShape,
  CubicWorldPoints,
  LineShape,
  PathShape,
  RectShape,
  Shape,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import {
  cubicWorldBounds,
  cubicWorldPointsFromPathShape,
  cubicWorldToLocalSegments,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import { circlePreviewFromAnchorAndPoint } from "@/features/vector-ai/lib/editor/geometry/circle-from-anchor";
import type { CirclePreview } from "@/features/vector-ai/lib/editor/preview/circle";
import type { LinePreview } from "@/features/vector-ai/lib/editor/preview/line";
import type { RectPreview } from "@/features/vector-ai/lib/editor/preview/rect";

type Point = { x: number; y: number };

function viewBoxEdges(vb: ViewBox) {
  return {
    minX: vb.x,
    minY: vb.y,
    maxX: vb.x + vb.w,
    maxY: vb.y + vb.h,
  };
}

export function clampInRange(v: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(v, min), max);
}

export function clampPointToViewBox(point: Point, viewBox: ViewBox): Point {
  const { minX, minY, maxX, maxY } = viewBoxEdges(viewBox);
  return {
    x: clampInRange(point.x, minX, maxX),
    y: clampInRange(point.y, minY, maxY),
  };
}

function circleFitsViewBox(
  cx: number,
  cy: number,
  r: number,
  viewBox: ViewBox,
): boolean {
  if (r <= 0) return true;
  const { minX, minY, maxX, maxY } = viewBoxEdges(viewBox);
  return cx - r >= minX && cx + r <= maxX && cy - r >= minY && cy + r <= maxY;
}

export function clampCirclePreviewFromAnchor(
  anchor: Point,
  current: Point,
  viewBox: ViewBox,
): CirclePreview {
  const target = clampPointToViewBox(current, viewBox);
  const dx = target.x - anchor.x;
  const dy = target.y - anchor.y;

  if (dx === 0 && dy === 0) {
    return {
      cx: anchor.x,
      cy: anchor.y,
      r: 0,
      anchorX: anchor.x,
      anchorY: anchor.y,
    };
  }

  const full = circlePreviewFromAnchorAndPoint(anchor, target);
  if (circleFitsViewBox(full.cx, full.cy, full.r, viewBox)) {
    return full;
  }

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    const point = { x: anchor.x + mid * dx, y: anchor.y + mid * dy };
    const { cx, cy, r } = circlePreviewFromAnchorAndPoint(anchor, point);
    if (circleFitsViewBox(cx, cy, r, viewBox)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const point = { x: anchor.x + lo * dx, y: anchor.y + lo * dy };
  return circlePreviewFromAnchorAndPoint(anchor, point);
}

export function clampCirclePreviewToViewBox(
  preview: CirclePreview,
  viewBox: ViewBox,
): CirclePreview {
  const opposite = {
    x: 2 * preview.cx - preview.anchorX,
    y: 2 * preview.cy - preview.anchorY,
  };
  return clampCirclePreviewFromAnchor(
    { x: preview.anchorX, y: preview.anchorY },
    opposite,
    viewBox,
  );
}

export function clampPartialCubicWorld(
  placed: Partial<CubicWorldPoints>,
  viewBox: ViewBox,
): Partial<CubicWorldPoints> {
  return {
    ...(placed.p0 != null
      ? { p0: clampPointToViewBox(placed.p0, viewBox) }
      : {}),
    ...(placed.c1 != null
      ? { c1: clampPointToViewBox(placed.c1, viewBox) }
      : {}),
    ...(placed.c2 != null
      ? { c2: clampPointToViewBox(placed.c2, viewBox) }
      : {}),
    ...(placed.p3 != null
      ? { p3: clampPointToViewBox(placed.p3, viewBox) }
      : {}),
  };
}

export function clampCubicWorldPoints(
  points: CubicWorldPoints,
  viewBox: ViewBox,
): CubicWorldPoints {
  return {
    p0: clampPointToViewBox(points.p0, viewBox),
    c1: clampPointToViewBox(points.c1, viewBox),
    c2: clampPointToViewBox(points.c2, viewBox),
    p3: clampPointToViewBox(points.p3, viewBox),
  };
}

export function clampLinePreviewToViewBox(
  preview: LinePreview,
  viewBox: ViewBox,
): LinePreview {
  const a = clampPointToViewBox({ x: preview.x1, y: preview.y1 }, viewBox);
  const b = clampPointToViewBox({ x: preview.x2, y: preview.y2 }, viewBox);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

export function clampRectPreviewToViewBox(
  preview: RectPreview,
  viewBox: ViewBox,
): RectPreview {
  const { minX, minY, maxX, maxY } = viewBoxEdges(viewBox);
  const x1 = Math.max(preview.x, minX);
  const y1 = Math.max(preview.y, minY);
  const x2 = Math.min(preview.x + preview.w, maxX);
  const y2 = Math.min(preview.y + preview.h, maxY);
  return {
    x: x1,
    y: y1,
    w: Math.max(0, x2 - x1),
    h: Math.max(0, y2 - y1),
  };
}

function clampRectShape(shape: RectShape, viewBox: ViewBox): RectShape {
  const { minX, minY, maxX, maxY } = viewBoxEdges(viewBox);
  return {
    ...shape,
    transform: {
      ...shape.transform,
      x: clampInRange(shape.transform.x, minX, maxX - shape.w),
      y: clampInRange(shape.transform.y, minY, maxY - shape.h),
    },
  };
}

function clampCircleShape(shape: CircleShape, viewBox: ViewBox): CircleShape {
  const { minX, minY, maxX, maxY } = viewBoxEdges(viewBox);
  return {
    ...shape,
    transform: {
      ...shape.transform,
      x: clampInRange(shape.transform.x, minX + shape.r, maxX - shape.r),
      y: clampInRange(shape.transform.y, minY + shape.r, maxY - shape.r),
    },
  };
}

function translateCubicWorldPoints(
  points: CubicWorldPoints,
  dx: number,
  dy: number,
): CubicWorldPoints {
  const shift = (point: WorldPoint): WorldPoint => ({
    x: point.x + dx,
    y: point.y + dy,
  });
  return {
    p0: shift(points.p0),
    c1: shift(points.c1),
    c2: shift(points.c2),
    p3: shift(points.p3),
  };
}

function clampPathShape(shape: PathShape, viewBox: ViewBox): PathShape {
  const world = cubicWorldPointsFromPathShape(shape);
  if (!world) return shape;

  const { minX, minY, maxX, maxY } = viewBoxEdges(viewBox);
  const bounds = cubicWorldBounds(world);

  let dx = 0;
  let dy = 0;

  if (bounds.maxX - bounds.minX > maxX - minX) {
    dx = minX - bounds.minX;
  } else if (bounds.minX < minX) {
    dx = minX - bounds.minX;
  } else if (bounds.maxX > maxX) {
    dx = maxX - bounds.maxX;
  }

  if (bounds.maxY - bounds.minY > maxY - minY) {
    dy = minY - bounds.minY;
  } else if (bounds.minY < minY) {
    dy = minY - bounds.minY;
  } else if (bounds.maxY > maxY) {
    dy = maxY - bounds.maxY;
  }

  const shifted = translateCubicWorldPoints(world, dx, dy);
  return {
    ...shape,
    transform: { ...shape.transform, x: shifted.p0.x, y: shifted.p0.y },
    segments: cubicWorldToLocalSegments(shifted),
  };
}

function clampLineShape(shape: LineShape, viewBox: ViewBox): LineShape {
  const { minX, minY, maxX, maxY } = viewBoxEdges(viewBox);
  const lineMinX = Math.min(shape.transform.x, shape.x2);
  const lineMaxX = Math.max(shape.transform.x, shape.x2);
  const lineMinY = Math.min(shape.transform.y, shape.y2);
  const lineMaxY = Math.max(shape.transform.y, shape.y2);

  let dx = 0;
  let dy = 0;

  if (lineMaxX - lineMinX > maxX - minX) {
    dx = minX - lineMinX;
  } else if (lineMinX < minX) {
    dx = minX - lineMinX;
  } else if (lineMaxX > maxX) {
    dx = maxX - lineMaxX;
  }

  if (lineMaxY - lineMinY > maxY - minY) {
    dy = minY - lineMinY;
  } else if (lineMinY < minY) {
    dy = minY - lineMinY;
  } else if (lineMaxY > maxY) {
    dy = maxY - lineMaxY;
  }

  return {
    ...shape,
    transform: {
      ...shape.transform,
      x: shape.transform.x + dx,
      y: shape.transform.y + dy,
    },
    x2: shape.x2 + dx,
    y2: shape.y2 + dy,
  };
}

export function clampShapeToViewBox(shape: Shape, viewBox: ViewBox): Shape {
  if (shape.type === "rect") return clampRectShape(shape, viewBox);
  if (shape.type === "circle") return clampCircleShape(shape, viewBox);
  if (shape.type === "path") return clampPathShape(shape, viewBox);
  return clampLineShape(shape, viewBox);
}
