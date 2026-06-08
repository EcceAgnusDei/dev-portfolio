import type { Shape } from "@/features/vector-ai/lib/document/types";
import {
  hasShapePatch,
  shapePatchFromMove,
} from "@/features/vector-ai/lib/editor/core/shape-patch";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import { shapeAfterPointerSession } from "@/features/vector-ai/lib/editor/preview/doc";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";
import {
  VECTOR_AI_MIN_CIRCLE_RADIUS,
  VECTOR_AI_MIN_RECT_SIZE,
} from "@/features/vector-ai/lib/vector-ai-config";

export function commitMutateResize(
  session: Extract<
    PointerSession,
    { kind: "resize-rect" | "resize-circle" }
  >,
  shape: Shape | undefined,
  viewBox: { x: number; y: number; w: number; h: number },
): EditorAction[] {
  if (!shape || shape.locked) return [];
  if (session.kind === "resize-rect" && shape.type !== "rect") return [];
  if (session.kind === "resize-circle" && shape.type !== "circle") return [];

  const after = shapeAfterPointerSession(shape, session, viewBox);

  if (after.type === "rect") {
    if (
      after.w < VECTOR_AI_MIN_RECT_SIZE ||
      after.h < VECTOR_AI_MIN_RECT_SIZE
    ) {
      return [];
    }
  }

  if (after.type === "circle") {
    if (after.r < VECTOR_AI_MIN_CIRCLE_RADIUS) return [];
  }

  const patch = shapePatchFromMove(shape, after);
  if (!hasShapePatch(patch)) return [];

  return [{ type: "SHAPE_UPDATE", id: session.shapeId, patch }];
}
