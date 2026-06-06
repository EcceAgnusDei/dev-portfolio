import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import { linePreviewFromDrag } from "@/features/vector-ai/lib/editor/preview/line";
import { clampLinePreviewToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { CreateDragSession } from "@/features/vector-ai/lib/editor/session/types";
import {
  VECTOR_AI_DEFAULT_LINE_STYLE,
  VECTOR_AI_MIN_LINE_LENGTH,
} from "@/features/vector-ai/lib/vector-ai-config";

function lineLength(preview: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): number {
  return Math.hypot(preview.x2 - preview.x1, preview.y2 - preview.y1);
}

export function commitCreateLine(
  session: Extract<CreateDragSession, { kind: "create-line" }>,
  viewBox: { x: number; y: number; w: number; h: number },
): EditorAction[] {
  const preview = clampLinePreviewToViewBox(
    linePreviewFromDrag(session.startWorld, session.currentWorld),
    viewBox,
  );
  if (lineLength(preview) < VECTOR_AI_MIN_LINE_LENGTH) return [];

  const id = createShapeId();
  return [
    {
      type: "SHAPE_ADD",
      shape: {
        id,
        type: "line",
        transform: { x: preview.x1, y: preview.y1 },
        x2: preview.x2,
        y2: preview.y2,
        style: VECTOR_AI_DEFAULT_LINE_STYLE,
      },
    },
    { type: "SELECTION_SET", ids: [id] },
    { type: "TOOL_SET", tool: "select" },
  ];
}
