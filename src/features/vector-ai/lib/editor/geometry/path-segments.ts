import type {
  CubicHandle,
  CubicMvpPathSegments,
  CubicWorldPoints,
  PathSegmentLocal,
  PathShape,
} from "@/features/vector-ai/lib/document/types";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";

export function worldToLocal(point: WorldPoint, origin: WorldPoint): WorldPoint {
  return {
    x: point.x - origin.x,
    y: point.y - origin.y,
  };
}

export function localToWorld(point: WorldPoint, origin: WorldPoint): WorldPoint {
  return {
    x: point.x + origin.x,
    y: point.y + origin.y,
  };
}

export function cubicWorldToLocalSegments(
  points: CubicWorldPoints,
): CubicMvpPathSegments {
  const c1 = worldToLocal(points.c1, points.p0);
  const c2 = worldToLocal(points.c2, points.p0);
  const p3 = worldToLocal(points.p3, points.p0);
  return [
    { t: "M", x: 0, y: 0 },
    {
      t: "C",
      c1x: c1.x,
      c1y: c1.y,
      c2x: c2.x,
      c2y: c2.y,
      x: p3.x,
      y: p3.y,
    },
  ];
}

export function cubicWorldPointsFromLocalSegments(
  transform: Pick<WorldPoint, "x" | "y">,
  segments: CubicMvpPathSegments,
): CubicWorldPoints {
  const p0 = { x: transform.x, y: transform.y };
  const [, cubic] = segments;
  return {
    p0,
    c1: localToWorld({ x: cubic.c1x, y: cubic.c1y }, p0),
    c2: localToWorld({ x: cubic.c2x, y: cubic.c2y }, p0),
    p3: localToWorld({ x: cubic.x, y: cubic.y }, p0),
  };
}

export function isCubicMvpPathSegments(
  segments: readonly PathSegmentLocal[],
): segments is CubicMvpPathSegments {
  if (segments.length !== 2) return false;
  const [move, cubic] = segments;
  if (move.t !== "M" || cubic.t !== "C") return false;
  return move.x === 0 && move.y === 0;
}

export function cubicWorldPointsFromPathShape(
  shape: PathShape,
): CubicWorldPoints | null {
  if (!isCubicMvpPathSegments(shape.segments)) return null;
  return cubicWorldPointsFromLocalSegments(shape.transform, shape.segments);
}

export function cubicHandleWorldPoint(
  points: CubicWorldPoints,
  handle: CubicHandle,
): WorldPoint {
  return points[handle];
}

export function cubicWorldPointsWithHandleAt(
  startPoints: CubicWorldPoints,
  handle: CubicHandle,
  world: WorldPoint,
): CubicWorldPoints {
  return { ...startPoints, [handle]: world };
}

export function pathShapeFromCubicWorldPoints(
  shape: PathShape,
  points: CubicWorldPoints,
): PathShape {
  return {
    ...shape,
    transform: { ...shape.transform, x: points.p0.x, y: points.p0.y },
    segments: cubicWorldToLocalSegments(points),
  };
}

export function cubicWorldBounds(points: CubicWorldPoints): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const xs = [points.p0.x, points.c1.x, points.c2.x, points.p3.x];
  const ys = [points.p0.y, points.c1.y, points.c2.y, points.p3.y];
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
