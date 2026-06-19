import type {
  TextShape,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import {
  createInitialDraftStyle,
  styleForNewShape,
  type DraftStyle,
} from "@/features/vector-ai/lib/editor/core/draft-style";
import { clampPointToViewBox } from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  VECTOR_AI_DEFAULT_FONT_FAMILY,
  VECTOR_AI_DEFAULT_FONT_SIZE,
} from "@/features/vector-ai/lib/vector-ai-config";

export function buildTextShape(
  id: string,
  point: WorldPoint,
  content: string,
  fontSize: number = VECTOR_AI_DEFAULT_FONT_SIZE,
  draftStyle: DraftStyle = createInitialDraftStyle(),
): TextShape {
  return {
    id,
    type: "text",
    transform: { x: point.x, y: point.y },
    content,
    fontSize,
    fontFamily: VECTOR_AI_DEFAULT_FONT_FAMILY,
    style: styleForNewShape("text", draftStyle),
  };
}

export function clampTextPlacement(
  world: WorldPoint,
  viewBox: ViewBox,
): WorldPoint {
  return clampPointToViewBox(world, viewBox);
}
