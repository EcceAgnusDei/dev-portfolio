import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import {
  styleForNewShape,
  type DraftStyle,
} from "@/features/vector-ai/lib/editor/core/draft-style";
import { rectPreviewFromDrag } from "@/features/vector-ai/lib/editor/preview/rect";
import { clampRectPreviewToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { CreateDragSession } from "@/features/vector-ai/lib/editor/session/types";
import { VECTOR_AI_MIN_RECT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";

export function commitCreateRect(
  session: Extract<CreateDragSession, { kind: "create-rect" }>,
  viewBox: { x: number; y: number; w: number; h: number },
  draftStyle: DraftStyle,
): EditorAction[] {
  const preview = clampRectPreviewToViewBox(
    rectPreviewFromDrag(session.startWorld, session.currentWorld),
    viewBox,
  );
  if (
    preview.w < VECTOR_AI_MIN_RECT_SIZE ||
    preview.h < VECTOR_AI_MIN_RECT_SIZE
  ) {
    return [];
  }

  const id = createShapeId();
  return [
    {
      type: "SHAPE_ADD",
      shape: {
        id,
        type: "rect",
        transform: { x: preview.x, y: preview.y },
        w: preview.w,
        h: preview.h,
        style: styleForNewShape("rect", draftStyle),
      },
    },
    { type: "SELECTION_SET", ids: [id] },
    { type: "TOOL_SET", tool: "select" },
  ];
}
