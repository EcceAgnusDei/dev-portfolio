import type {
  Shape,
  VectorDoc,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import { applyShapePatch } from "@/features/vector-ai/lib/editor/core/shape-patch";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import { clampShapeToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type {
  MoveStartState,
  PointerSession,
} from "@/features/vector-ai/lib/editor/session/types";

export function pointerDeltaFromMoveSession(
  session: Extract<PointerSession, { kind: "move" }>,
): { dx: number; dy: number } {
  return {
    dx: session.currentWorld.x - session.startWorld.x,
    dy: session.currentWorld.y - session.startWorld.y,
  };
}

export function shapeAfterMoveStart(
  shape: Shape,
  start: MoveStartState,
  dx: number,
  dy: number,
  viewBox: ViewBox,
): Shape {
  if (shape.type === "line" && start.x2 != null && start.y2 != null) {
    return clampShapeToViewBox(
      applyShapePatch(shape, {
        transform: {
          x: start.transform.x + dx,
          y: start.transform.y + dy,
        },
        x2: start.x2 + dx,
        y2: start.y2 + dy,
      }),
      viewBox,
    );
  }

  return clampShapeToViewBox(
    applyShapePatch(shape, {
      transform: {
        x: start.transform.x + dx,
        y: start.transform.y + dy,
      },
    }),
    viewBox,
  );
}

function moveScaleForShape(
  shape: Shape,
  start: MoveStartState,
  rawDx: number,
  rawDy: number,
  viewBox: ViewBox,
): number {
  const moved = shapeAfterMoveStart(shape, start, rawDx, rawDy, viewBox);
  const actualDx = moved.transform.x - start.transform.x;
  const actualDy = moved.transform.y - start.transform.y;

  let scale = 1;

  if (rawDx !== 0) {
    const sx = actualDx / rawDx;
    if (sx < 0) return 0;
    scale = Math.min(scale, sx);
  }

  if (rawDy !== 0) {
    const sy = actualDy / rawDy;
    if (sy < 0) return 0;
    scale = Math.min(scale, sy);
  }

  return scale;
}

export function clampGroupMoveDelta(
  doc: VectorDoc,
  shapeIds: readonly string[],
  startByShapeId: Readonly<Record<string, MoveStartState>>,
  rawDx: number,
  rawDy: number,
  viewBox: ViewBox,
): { dx: number; dy: number } {
  if (rawDx === 0 && rawDy === 0) {
    return { dx: 0, dy: 0 };
  }

  if (shapeIds.length <= 1) {
    return { dx: rawDx, dy: rawDy };
  }

  let scale = 1;

  for (const id of shapeIds) {
    const shape = getShapeById(doc, id);
    const start = startByShapeId[id];
    if (!shape || !start) continue;

    scale = Math.min(
      scale,
      moveScaleForShape(shape, start, rawDx, rawDy, viewBox),
    );
  }

  return { dx: rawDx * scale, dy: rawDy * scale };
}

export function resolvedMoveDelta(
  doc: VectorDoc,
  session: Extract<PointerSession, { kind: "move" }>,
): { dx: number; dy: number } {
  const raw = pointerDeltaFromMoveSession(session);
  return clampGroupMoveDelta(
    doc,
    session.shapeIds,
    session.startByShapeId,
    raw.dx,
    raw.dy,
    doc.viewBox,
  );
}
