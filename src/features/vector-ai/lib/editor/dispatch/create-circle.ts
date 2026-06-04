import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import type { CircleShape } from "@/features/vector-ai/lib/document/types";
import { clampCirclePreviewFromAnchor } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { CreateDragSession } from "@/features/vector-ai/lib/editor/session/types";

const MIN_CIRCLE_RADIUS = 1;

const DEFAULT_NEW_CIRCLE_STYLE: CircleShape["style"] = {
  fill: "none",
  stroke: "#000000",
  strokeWidth: 2,
};

export function commitCreateCircle(
  session: Extract<CreateDragSession, { kind: "create-circle" }>,
  viewBox: { x: number; y: number; w: number; h: number },
): EditorAction[] {
  const preview = clampCirclePreviewFromAnchor(
    session.startWorld,
    session.currentWorld,
    viewBox,
  );
  if (preview.r < MIN_CIRCLE_RADIUS) return [];

  const id = createShapeId();
  return [
    {
      type: "SHAPE_ADD",
      shape: {
        id,
        type: "circle",
        transform: { x: preview.cx, y: preview.cy },
        r: preview.r,
        style: DEFAULT_NEW_CIRCLE_STYLE,
      },
    },
    { type: "SELECTION_SET", ids: [id] },
    { type: "TOOL_SET", tool: "select" },
  ];
}
