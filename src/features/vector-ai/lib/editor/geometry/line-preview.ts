import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";

export type LinePreview = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function linePreviewFromDrag(
  startWorld: WorldPoint,
  currentWorld: WorldPoint,
): LinePreview {
  return {
    x1: startWorld.x,
    y1: startWorld.y,
    x2: currentWorld.x,
    y2: currentWorld.y,
  };
}
