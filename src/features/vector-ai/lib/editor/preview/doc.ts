import type {
  CircleShape,
  LineShape,
  PathShape,
  RectShape,
  Shape,
  VectorDoc,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import {
  clampCircleRadiusToViewBox,
  resizeCircleFromHandle,
  resizeRectFromHandle,
} from "@/features/vector-ai/lib/editor/geometry/resize";
import {
  clampPointToViewBox,
  clampRectPreviewToViewBox,
  clampShapeToViewBox,
} from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import {
  resolvedMoveDelta,
  shapeAfterMoveStart,
} from "@/features/vector-ai/lib/editor/geometry/group-move";
import {
  cubicWorldPointsWithHandleAt,
  pathShapeFromCubicWorldPoints,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import { applyShapePatch } from "@/features/vector-ai/lib/editor/core/shape-patch";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

function applyMovePreview(
  shape: Shape,
  session: Extract<PointerSession, { kind: "move" }>,
  doc: VectorDoc,
): Shape {
  const start = session.startByShapeId[shape.id];
  if (!start) return shape;

  const { dx, dy } = resolvedMoveDelta(doc, session);
  return shapeAfterMoveStart(shape, start, dx, dy, doc.viewBox);
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

function applyResizeRectPreview(
  shape: RectShape,
  session: Extract<PointerSession, { kind: "resize-rect" }>,
  viewBox: ViewBox,
): RectShape {
  const preview = clampRectPreviewToViewBox(
    resizeRectFromHandle(
      session.startBounds,
      session.handle,
      session.currentWorld,
    ),
    viewBox,
  );
  return applyShapePatch(shape, {
    transform: { x: preview.x, y: preview.y },
    w: preview.w,
    h: preview.h,
  }) as RectShape;
}

function applyResizeCirclePreview(
  shape: CircleShape,
  session: Extract<PointerSession, { kind: "resize-circle" }>,
  viewBox: ViewBox,
): CircleShape {
  const resized = resizeCircleFromHandle(
    session.startCenter,
    session.handle,
    session.currentWorld,
  );
  const r = clampCircleRadiusToViewBox(
    resized.cx,
    resized.cy,
    resized.r,
    viewBox,
  );
  return applyShapePatch(shape, { r }) as CircleShape;
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
    {
      kind:
        | "move"
        | "move-line-end"
        | "move-cubic-handle"
        | "resize-rect"
        | "resize-circle";
    }
  >,
  viewBox: ViewBox,
  doc?: VectorDoc,
): Shape {
  if (session.kind === "move") {
    if (!doc) return shape;
    return applyMovePreview(shape, session, doc);
  }
  if (session.kind === "resize-rect") {
    if (shape.type !== "rect") return shape;
    return applyResizeRectPreview(shape, session, viewBox);
  }
  if (session.kind === "resize-circle") {
    if (shape.type !== "circle") return shape;
    return applyResizeCirclePreview(shape, session, viewBox);
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

function isMutateSession(
  session: PointerSession,
): session is Extract<
  PointerSession,
  {
    kind:
      | "move"
      | "move-line-end"
      | "move-cubic-handle"
      | "resize-rect"
      | "resize-circle";
  }
> {
  return (
    session.kind === "move" ||
    session.kind === "move-line-end" ||
    session.kind === "move-cubic-handle" ||
    session.kind === "resize-rect" ||
    session.kind === "resize-circle"
  );
}

function sessionTargetsShape(
  session: Extract<PointerSession, { kind: "move" }>,
  shapeId: string,
): boolean {
  return session.shapeIds.includes(shapeId);
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
    session.kind === "create-text" ||
    session.kind === "create-cubic"
  ) {
    return doc;
  }

  if (session.kind === "move") {
    const { dx, dy } = resolvedMoveDelta(doc, session);
    if (dx === 0 && dy === 0) return doc;

    return {
      ...doc,
      shapes: doc.shapes.map((shape) => {
        if (!sessionTargetsShape(session, shape.id) || shape.locked) {
          return shape;
        }

        const start = session.startByShapeId[shape.id];
        if (!start) return shape;

        return shapeAfterMoveStart(shape, start, dx, dy, doc.viewBox);
      }),
    };
  }

  return {
    ...doc,
    shapes: doc.shapes.map((shape) => {
      if (shape.id !== session.shapeId || shape.locked) return shape;

      if (isMutateSession(session)) {
        return shapeAfterPointerSession(shape, session, doc.viewBox);
      }

      return shape;
    }),
  };
}
