import type {
  CircleShape,
  LineShape,
  RectShape,
  Shape,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import type { RectPreview } from "@/features/vector-ai/lib/editor/pointer/pointer-session";

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
  return clampLineShape(shape, viewBox);
}
