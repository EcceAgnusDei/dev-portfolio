import type { LineShape, PathShape, Shape } from "@/features/vector-ai/lib/document/types";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  cubicWorldPointsFromPathShape,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import type {
  CubicHandle,
  LineEnd,
  PointerSession,
} from "@/features/vector-ai/lib/editor/session/types";

export function beginMoveSession(
  shape: Shape,
  world: WorldPoint,
  pointerId: number,
): PointerSession {
  return {
    kind: "move",
    pointerId,
    shapeId: shape.id,
    startWorld: world,
    currentWorld: world,
    startTransform: { x: shape.transform.x, y: shape.transform.y },
    ...(shape.type === "line"
      ? { startX2: shape.x2, startY2: shape.y2 }
      : {}),
  };
}

export function beginLineEndMoveSession(
  shape: LineShape,
  end: LineEnd,
  world: WorldPoint,
  pointerId: number,
): PointerSession {
  return {
    kind: "move-line-end",
    pointerId,
    shapeId: shape.id,
    end,
    startWorld: world,
    currentWorld: world,
    startTransform: { x: shape.transform.x, y: shape.transform.y },
    startX2: shape.x2,
    startY2: shape.y2,
  };
}

export function beginCubicHandleMoveSession(
  shape: PathShape,
  handle: CubicHandle,
  world: WorldPoint,
  pointerId: number,
): PointerSession | null {
  const startPoints = cubicWorldPointsFromPathShape(shape);
  if (!startPoints) return null;

  return {
    kind: "move-cubic-handle",
    pointerId,
    shapeId: shape.id,
    handle,
    startWorld: world,
    currentWorld: world,
    startPoints,
  };
}
