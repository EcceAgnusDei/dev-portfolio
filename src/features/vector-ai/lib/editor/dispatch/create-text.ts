import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import { clampPointToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";
import {
  VECTOR_AI_DEFAULT_FONT_FAMILY,
  VECTOR_AI_DEFAULT_FONT_SIZE,
  VECTOR_AI_DEFAULT_TEXT_STYLE,
} from "@/features/vector-ai/lib/vector-ai-config";

export function commitCreateText(
  session: Extract<PointerSession, { kind: "create-text" }>,
  viewBox: ViewBox,
): EditorAction[] {
  const point = clampPointToViewBox(session.startWorld, viewBox);
  const id = createShapeId();

  return [
    {
      type: "SHAPE_ADD",
      shape: {
        id,
        type: "text",
        transform: { x: point.x, y: point.y },
        content: "",
        fontSize: VECTOR_AI_DEFAULT_FONT_SIZE,
        fontFamily: VECTOR_AI_DEFAULT_FONT_FAMILY,
        style: VECTOR_AI_DEFAULT_TEXT_STYLE,
      },
    },
    { type: "SELECTION_SET", ids: [id] },
    { type: "TOOL_SET", tool: "select" },
  ];
}
