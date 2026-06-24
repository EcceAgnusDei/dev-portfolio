import type { Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import {
  hasShapePatch,
  shapePatchFromMove,
} from "@/features/vector-ai/lib/editor/core/shape-patch";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import {
  resolvedMoveDelta,
  shapeAfterMoveStart,
} from "@/features/vector-ai/lib/editor/geometry/group-move";
import { shapeAfterPointerSession } from "@/features/vector-ai/lib/editor/preview/doc";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

function commitHandleDrag(
  session: Extract<
    PointerSession,
    { kind: "move-line-end" | "move-cubic-handle" }
  >,
  shape: Shape | undefined,
  viewBox: VectorDoc["viewBox"],
): EditorAction[] {
  if (!shape || shape.locked) return [];
  if (session.kind === "move-line-end" && shape.type !== "line") return [];
  if (session.kind === "move-cubic-handle" && shape.type !== "path") return [];

  const after = shapeAfterPointerSession(shape, session, viewBox);
  const patch = shapePatchFromMove(shape, after);
  if (!hasShapePatch(patch)) return [];

  return [{ type: "SHAPE_UPDATE", id: session.shapeId, patch }];
}

function commitTranslateDrag(
  session: Extract<PointerSession, { kind: "move" }>,
  doc: VectorDoc,
): EditorAction[] {
  const { dx, dy } = resolvedMoveDelta(doc, session);
  if (dx === 0 && dy === 0) return [];

  const actions: EditorAction[] = [];

  for (const id of session.shapeIds) {
    const shape = getShapeById(doc, id);
    const start = session.startByShapeId[id];
    if (!shape || !start) continue;

    const after = shapeAfterMoveStart(shape, start, dx, dy, doc.viewBox);
    const patch = shapePatchFromMove(shape, after);
    if (!hasShapePatch(patch)) continue;

    actions.push({
      type: "SHAPE_UPDATE",
      id,
      patch,
      recordHistory: actions.length === 0 ? undefined : false,
    });
  }

  return actions;
}

export function commitMoveSession(
  session: Extract<
    PointerSession,
    { kind: "move" | "move-line-end" | "move-cubic-handle" }
  >,
  doc: VectorDoc,
): EditorAction[] {
  if (session.kind === "move") {
    return commitTranslateDrag(session, doc);
  }

  return commitHandleDrag(
    session,
    getShapeById(doc, session.shapeId),
    doc.viewBox,
  );
}
