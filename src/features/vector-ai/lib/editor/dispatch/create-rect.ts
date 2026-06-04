import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import type { RectShape } from "@/features/vector-ai/lib/document/types";
import { rectPreviewFromDrag } from "@/features/vector-ai/lib/editor/geometry/rect-preview";
import { clampRectPreviewToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { CreateDragSession } from "@/features/vector-ai/lib/editor/session/types";

const MIN_RECT_SIZE = 2;

const DEFAULT_NEW_RECT_STYLE: RectShape["style"] = {
  fill: "#000000",
  stroke: "none",
};

export function commitCreateRect(
  session: Extract<CreateDragSession, { kind: "create-rect" }>,
  viewBox: { x: number; y: number; w: number; h: number },
): EditorAction[] {
  const preview = clampRectPreviewToViewBox(
    rectPreviewFromDrag(session.startWorld, session.currentWorld),
    viewBox,
  );
  if (preview.w < MIN_RECT_SIZE || preview.h < MIN_RECT_SIZE) return [];

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
        style: DEFAULT_NEW_RECT_STYLE,
      },
    },
    { type: "SELECTION_SET", ids: [id] },
    { type: "TOOL_SET", tool: "select" },
  ];
}
