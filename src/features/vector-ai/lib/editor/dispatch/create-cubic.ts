import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import type {
  CubicCreateStep,
  CubicMvpPathSegments,
  CubicWorldPoints,
  PathSegmentLocal,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import {
  cubicWorldToLocalSegments,
  isCubicMvpPathSegments,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import { clampCubicWorldPoints } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  VECTOR_AI_CUBIC_PATH_SEGMENT_COUNT_MVP,
  VECTOR_AI_DEFAULT_CUBIC_PATH_STYLE,
  VECTOR_AI_MIN_CUBIC_POINT_DISTANCE,
} from "@/features/vector-ai/lib/vector-ai-config";

export function distanceWorld(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function isCubicPointDistanceValid(
  a: WorldPoint,
  b: WorldPoint,
  minDistance = VECTOR_AI_MIN_CUBIC_POINT_DISTANCE,
): boolean {
  return distanceWorld(a, b) >= minDistance;
}

export function lastPlacedPointForStep(
  step: CubicCreateStep,
  placed: Partial<CubicWorldPoints>,
): WorldPoint | null {
  if (step === 1) return null;
  if (step === 2) return placed.p0 ?? null;
  if (step === 3) return placed.c1 ?? null;
  return placed.c2 ?? null;
}

export function shouldIgnoreCubicClick(
  step: CubicCreateStep,
  placed: Partial<CubicWorldPoints>,
  click: WorldPoint,
): boolean {
  const last = lastPlacedPointForStep(step, placed);
  if (!last) return false;
  return !isCubicPointDistanceValid(last, click);
}

export function isCompleteCubicWorld(
  placed: Partial<CubicWorldPoints>,
): placed is CubicWorldPoints {
  return (
    placed.p0 != null &&
    placed.c1 != null &&
    placed.c2 != null &&
    placed.p3 != null
  );
}

export function isValidCubicWorldPoints(points: CubicWorldPoints): boolean {
  if (
    !isCubicPointDistanceValid(points.p0, points.c1) ||
    !isCubicPointDistanceValid(points.c1, points.c2) ||
    !isCubicPointDistanceValid(points.c2, points.p3)
  ) {
    return false;
  }
  const segments = cubicWorldToLocalSegments(points);
  const end = segments[1];
  return Math.hypot(end.x, end.y) >= VECTOR_AI_MIN_CUBIC_POINT_DISTANCE;
}

export function isValidCubicMvpSegments(
  segments: readonly PathSegmentLocal[],
): segments is CubicMvpPathSegments {
  if (segments.length !== VECTOR_AI_CUBIC_PATH_SEGMENT_COUNT_MVP) return false;
  return isCubicMvpPathSegments(segments);
}

export function commitCreateCubicFromWorld(
  placed: Partial<CubicWorldPoints>,
  viewBox: ViewBox,
): EditorAction[] {
  if (
    placed.p0 == null ||
    placed.c1 == null ||
    placed.c2 == null ||
    placed.p3 == null
  ) {
    return [];
  }

  const points: CubicWorldPoints = {
    p0: placed.p0,
    c1: placed.c1,
    c2: placed.c2,
    p3: placed.p3,
  };

  if (!isValidCubicWorldPoints(points)) return [];

  const clamped = clampCubicWorldPoints(points, viewBox);
  const segments = cubicWorldToLocalSegments(clamped);
  if (!isValidCubicMvpSegments(segments)) return [];

  const id = createShapeId();
  return [
    {
      type: "SHAPE_ADD",
      shape: {
        id,
        type: "path",
        transform: { x: clamped.p0.x, y: clamped.p0.y },
        segments: [...segments],
        style: { ...VECTOR_AI_DEFAULT_CUBIC_PATH_STYLE },
      },
    },
    { type: "SELECTION_SET", ids: [id] },
    { type: "TOOL_SET", tool: "select" },
  ];
}
