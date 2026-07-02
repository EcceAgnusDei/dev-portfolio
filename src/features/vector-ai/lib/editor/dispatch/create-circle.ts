import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import {
  styleForNewShape,
  type DraftStyle,
} from "@/features/vector-ai/lib/editor/core/draft-style";
import { clampCirclePreviewFromAnchor } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { CreateDragSession } from "@/features/vector-ai/lib/editor/session/types";
import { VECTOR_AI_MIN_CIRCLE_RADIUS } from "@/features/vector-ai/lib/vector-ai-config";

export function commitCreateCircle(
  session: Extract<CreateDragSession, { kind: "create-circle" }>,
  viewBox: { x: number; y: number; w: number; h: number },
  draftStyle: DraftStyle,
): EditorAction[] {
  const preview = clampCirclePreviewFromAnchor(
    session.startWorld,
    session.currentWorld,
    viewBox,
  );
  if (preview.r < VECTOR_AI_MIN_CIRCLE_RADIUS) return [];

  const id = createShapeId();
  return [
    {
      type: "SHAPE_ADD",
      shape: {
        id,
        type: "circle",
        transform: { x: preview.cx, y: preview.cy },
        r: preview.r,
        style: styleForNewShape("circle", draftStyle),
      },
    },
    { type: "SELECTION_SET", ids: [id] },
    { type: "TOOL_SET", tool: "select" },
  ];
}
