import type {
  LineShape,
  PathSegmentLocal,
  PathShape,
} from "@/features/vector-ai/lib/document/types";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  VECTOR_AI_DEFAULT_CUBIC_PATH_STYLE,
  VECTOR_AI_DEFAULT_LINE_STYLE,
} from "@/features/vector-ai/lib/vector-ai-config";

type Point = WorldPoint;

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s };
}

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function perpendicular(v: Point): Point {
  return { x: -v.y, y: v.x };
}

function cubicPoint(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x:
      uu * u * p0.x +
      3 * uu * t * c1.x +
      3 * u * tt * c2.x +
      tt * t * p3.x,
    y:
      uu * u * p0.y +
      3 * uu * t * c1.y +
      3 * u * tt * c2.y +
      tt * t * p3.y,
  };
}

function shapeStrokeHalfWidth(shape: LineShape | PathShape): number {
  if (shape.style.stroke === "none" || shape.style.stroke == null) return 0;
  const fallback =
    shape.type === "line"
      ? (VECTOR_AI_DEFAULT_LINE_STYLE.strokeWidth ?? 1)
      : (VECTOR_AI_DEFAULT_CUBIC_PATH_STYLE.strokeWidth ?? 1);
  return (shape.style.strokeWidth ?? fallback) / 2;
}

export function strokeContourHalfWidth(shape: LineShape | PathShape): number {
  return shapeStrokeHalfWidth(shape);
}

function formatPoint(point: Point): string {
  return `${point.x} ${point.y}`;
}

function roundCapArc(center: Point, halfWidth: number): string {
  return `A ${halfWidth} ${halfWidth} 0 0 1 ${formatPoint(center)}`;
}

export function openPolylineStrokeContourPathD(
  points: readonly Point[],
  halfWidth: number,
): string | null {
  if (points.length < 2 || halfWidth <= 0) return null;

  const left: Point[] = [];
  const right: Point[] = [];
  const last = points.length - 1;

  for (let i = 0; i < points.length; i++) {
    const tangent =
      i === 0
        ? normalize(sub(points[1]!, points[0]!))
        : i === last
          ? normalize(sub(points[last]!, points[last - 1]!))
          : normalize(sub(points[i + 1]!, points[i - 1]!));
    const normal = perpendicular(tangent);
    left.push(add(points[i]!, scale(normal, halfWidth)));
    right.push(sub(points[i]!, scale(normal, halfWidth)));
  }

  const parts = [`M ${formatPoint(left[0]!)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${formatPoint(left[i]!)}`);
  }
  parts.push(roundCapArc(right[last]!, halfWidth));
  for (let i = last - 1; i >= 0; i--) {
    parts.push(`L ${formatPoint(right[i]!)}`);
  }
  parts.push(roundCapArc(left[0]!, halfWidth));
  parts.push("Z");
  return parts.join(" ");
}

export function lineStrokeContourPathD(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  halfWidth: number,
): string | null {
  return openPolylineStrokeContourPathD(
    [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
    halfWidth,
  );
}

export function samplePathSegments(
  segments: readonly PathSegmentLocal[],
  stepsPerCubic = 24,
): Point[] {
  const points: Point[] = [];

  for (const seg of segments) {
    if (seg.t === "M") {
      points.push({ x: seg.x, y: seg.y });
      continue;
    }

    const p0 = points.at(-1);
    if (!p0) continue;

    const c1 = { x: seg.c1x, y: seg.c1y };
    const c2 = { x: seg.c2x, y: seg.c2y };
    const p3 = { x: seg.x, y: seg.y };
    for (let i = 1; i <= stepsPerCubic; i++) {
      points.push(cubicPoint(p0, c1, c2, p3, i / stepsPerCubic));
    }
  }

  return points;
}

export function pathStrokeContourPathD(
  segments: readonly PathSegmentLocal[],
  halfWidth: number,
): string | null {
  const points = samplePathSegments(segments);
  return openPolylineStrokeContourPathD(points, halfWidth);
}
