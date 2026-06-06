import type {
  LineShape,
  PathShape,
  Shape,
  VectorDoc,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import {
  clampPointToViewBox,
  clampShapeToViewBox,
} from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import {
  cubicWorldPointsWithHandleAt,
  pathShapeFromCubicWorldPoints,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import { applyShapePatch } from "@/features/vector-ai/lib/editor/core/shape-patch";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

function applyMovePreview(
  shape: Shape,
  session: Extract<PointerSession, { kind: "move" }>,
  viewBox: ViewBox,
): Shape {
  const dx = session.currentWorld.x - session.startWorld.x;
  const dy = session.currentWorld.y - session.startWorld.y;

  if (
    shape.type === "line" &&
    session.startX2 != null &&
    session.startY2 != null
  ) {
    return clampShapeToViewBox(
      applyShapePatch(shape, {
        transform: {
          x: session.startTransform.x + dx,
          y: session.startTransform.y + dy,
        },
        x2: session.startX2 + dx,
        y2: session.startY2 + dy,
      }),
      viewBox,
    );
  }

  return clampShapeToViewBox(
    applyShapePatch(shape, {
      transform: {
        x: session.startTransform.x + dx,
        y: session.startTransform.y + dy,
      },
    }),
    viewBox,
  );
}

function applyCubicHandlePreview(
  shape: PathShape,
  session: Extract<PointerSession, { kind: "move-cubic-handle" }>,
  viewBox: ViewBox,
): PathShape {
  const point = clampPointToViewBox(session.currentWorld, viewBox);
  const world = cubicWorldPointsWithHandleAt(
    session.startPoints,
    session.handle,
    point,
  );
  const next = pathShapeFromCubicWorldPoints(shape, world);
  return clampShapeToViewBox(next, viewBox) as PathShape;
}

function applyLineEndPreview(
  shape: LineShape,
  session: Extract<PointerSession, { kind: "move-line-end" }>,
  viewBox: ViewBox,
): LineShape {
  const point = clampPointToViewBox(session.currentWorld, viewBox);

  if (session.end === "start") {
    return applyShapePatch(shape, {
      transform: { x: point.x, y: point.y },
    }) as LineShape;
  }

  return applyShapePatch(shape, {
    x2: point.x,
    y2: point.y,
  }) as LineShape;
}

export function shapeAfterPointerSession(
  shape: Shape,
  session: Extract<
    PointerSession,
    { kind: "move" | "move-line-end" | "move-cubic-handle" }
  >,
  viewBox: ViewBox,
): Shape {
  if (session.kind === "move") {
    return applyMovePreview(shape, session, viewBox);
  }
  if (session.kind === "move-cubic-handle") {
    if (shape.type !== "path") return shape;
    return applyCubicHandlePreview(shape, session, viewBox);
  }
  if (shape.type === "line") {
    return applyLineEndPreview(shape, session, viewBox);
  }
  return shape;
}

export function docWithPointerPreview(
  doc: VectorDoc,
  session: PointerSession,
): VectorDoc {
  if (
    session.kind === "idle" ||
    session.kind === "create-rect" ||
    session.kind === "create-circle" ||
    session.kind === "create-line" ||
    session.kind === "create-cubic"
  ) {
    return doc;
  }

  return {
    ...doc,
    shapes: doc.shapes.map((shape) => {
      if (shape.id !== session.shapeId || shape.locked) return shape;

      if (session.kind === "move" || session.kind === "move-line-end" || session.kind === "move-cubic-handle") {
        return shapeAfterPointerSession(shape, session, doc.viewBox);
      }

      return shape;
    }),
  };
}
