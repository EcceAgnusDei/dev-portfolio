import type {
  CircleShape,
  LineShape,
  PathShape,
  RectShape,
  Shape,
} from "@/features/vector-ai/lib/document/types";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  cubicWorldPointsFromPathShape,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import type {
  CircleResizeHandle,
  CubicHandle,
  LineEnd,
  PointerSession,
  RectResizeHandle,
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

export function beginRectResizeSession(
  shape: RectShape,
  handle: RectResizeHandle,
  world: WorldPoint,
  pointerId: number,
): PointerSession {
  return {
    kind: "resize-rect",
    pointerId,
    shapeId: shape.id,
    handle,
    startWorld: world,
    currentWorld: world,
    startBounds: {
      x: shape.transform.x,
      y: shape.transform.y,
      w: shape.w,
      h: shape.h,
    },
  };
}

export function beginCircleResizeSession(
  shape: CircleShape,
  handle: CircleResizeHandle,
  world: WorldPoint,
  pointerId: number,
): PointerSession {
  return {
    kind: "resize-circle",
    pointerId,
    shapeId: shape.id,
    handle,
    startWorld: world,
    currentWorld: world,
    startCenter: { x: shape.transform.x, y: shape.transform.y },
    startR: shape.r,
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
