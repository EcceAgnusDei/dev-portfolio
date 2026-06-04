import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import type { LineShape } from "@/features/vector-ai/lib/document/types";
import { linePreviewFromDrag } from "@/features/vector-ai/lib/editor/geometry/line-preview";
import { clampLinePreviewToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { CreateDragSession } from "@/features/vector-ai/lib/editor/session/types";

const MIN_LINE_LENGTH = 2;

const DEFAULT_NEW_LINE_STYLE: LineShape["style"] = {
  fill: "none",
  stroke: "#000000",
  strokeWidth: 2,
};

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
  if (lineLength(preview) < MIN_LINE_LENGTH) return [];

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
        style: DEFAULT_NEW_LINE_STYLE,
      },
    },
    { type: "SELECTION_SET", ids: [id] },
    { type: "TOOL_SET", tool: "select" },
  ];
}
