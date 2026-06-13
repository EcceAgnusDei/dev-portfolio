import type { TextShape, ViewBox } from "@/features/vector-ai/lib/document/types";
import { clampPointToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  VECTOR_AI_DEFAULT_FONT_FAMILY,
  VECTOR_AI_DEFAULT_FONT_SIZE,
  VECTOR_AI_DEFAULT_TEXT_STYLE,
} from "@/features/vector-ai/lib/vector-ai-config";

export function buildTextShape(
  id: string,
  point: WorldPoint,
  content: string,
  fontSize: number = VECTOR_AI_DEFAULT_FONT_SIZE,
): TextShape {
  return {
    id,
    type: "text",
    transform: { x: point.x, y: point.y },
    content,
    fontSize,
    fontFamily: VECTOR_AI_DEFAULT_FONT_FAMILY,
    style: VECTOR_AI_DEFAULT_TEXT_STYLE,
  };
}

export function clampTextPlacement(
  world: WorldPoint,
  viewBox: ViewBox,
): WorldPoint {
  return clampPointToViewBox(world, viewBox);
}
