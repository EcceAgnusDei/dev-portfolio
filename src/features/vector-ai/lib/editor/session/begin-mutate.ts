import type {
  CircleShape,
  LineShape,
  PathShape,
  RectShape,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  cubicWorldPointsFromPathShape,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import type {
  CircleResizeHandle,
  CubicHandle,
  LineEnd,
  MoveStartState,
  PointerSession,
  RectResizeHandle,
} from "@/features/vector-ai/lib/editor/session/types";

function moveStartStateFromShape(
  shape: NonNullable<ReturnType<typeof getShapeById>>,
): MoveStartState {
  return {
    transform: { x: shape.transform.x, y: shape.transform.y },
    ...(shape.type === "line" ? { x2: shape.x2, y2: shape.y2 } : {}),
  };
}

export function beginMoveSession(
  doc: VectorDoc,
  shapeIds: readonly string[],
  world: WorldPoint,
  pointerId: number,
): PointerSession {
  const startByShapeId: Record<string, MoveStartState> = {};

  for (const id of shapeIds) {
    const shape = getShapeById(doc, id);
    if (!shape) continue;
    startByShapeId[id] = moveStartStateFromShape(shape);
  }

  return {
    kind: "move",
    pointerId,
    shapeIds: [...shapeIds],
    startWorld: world,
    currentWorld: world,
    startByShapeId,
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
