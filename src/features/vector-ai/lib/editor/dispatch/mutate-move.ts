import type { Shape } from "@/features/vector-ai/lib/document/types";
import {
  hasShapePatch,
  shapePatchFromMove,
} from "@/features/vector-ai/lib/editor/core/shape-patch";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import { shapeAfterPointerSession } from "@/features/vector-ai/lib/editor/preview/doc";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

export function commitMutateMove(
  session: Extract<
    PointerSession,
    { kind: "move" | "move-line-end" | "move-cubic-handle" }
  >,
  shape: Shape | undefined,
  viewBox: { x: number; y: number; w: number; h: number },
): EditorAction[] {
  if (!shape || shape.locked) return [];
  if (session.kind === "move-line-end" && shape.type !== "line") return [];
  if (session.kind === "move-cubic-handle" && shape.type !== "path") return [];

  const after = shapeAfterPointerSession(shape, session, viewBox);
  const patch = shapePatchFromMove(shape, after);
  if (!hasShapePatch(patch)) return [];

  return [{ type: "SHAPE_UPDATE", id: session.shapeId, patch }];
}
