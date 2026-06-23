import type { Shape } from "@/features/vector-ai/lib/document/types";
import {
  VECTOR_AI_SELECTION_OUTLINE_OFFSET,
  VECTOR_AI_SELECTION_OUTLINE_STROKE_WIDTH,
} from "@/features/vector-ai/lib/vector-ai-config";
import { strokeContourHalfWidth } from "@/features/vector-ai/lib/view/overlays/stroke-contour-outline";

function shapeStrokeOutset(shape: Shape): number {
  if (shape.type === "text") return 0;
  if (shape.style.stroke === "none" || shape.style.stroke == null) return 0;
  return (shape.style.strokeWidth ?? 0) / 2;
}

export function selectionOutlinePad(shape: Shape): number {
  return (
    VECTOR_AI_SELECTION_OUTLINE_OFFSET +
    VECTOR_AI_SELECTION_OUTLINE_STROKE_WIDTH / 2 +
    shapeStrokeOutset(shape)
  );
}

export function selectionStrokeContourHalfWidth(
  shape: Shape,
): number {
  if (shape.type !== "line" && shape.type !== "path") return 0;
  return (
    strokeContourHalfWidth(shape) +
    VECTOR_AI_SELECTION_OUTLINE_OFFSET +
    VECTOR_AI_SELECTION_OUTLINE_STROKE_WIDTH / 2
  );
}
