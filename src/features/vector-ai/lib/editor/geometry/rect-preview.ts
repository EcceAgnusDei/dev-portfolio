import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";

export type RectPreview = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function rectPreviewFromDrag(
  startWorld: WorldPoint,
  currentWorld: WorldPoint,
): RectPreview {
  return {
    x: Math.min(startWorld.x, currentWorld.x),
    y: Math.min(startWorld.y, currentWorld.y),
    w: Math.abs(currentWorld.x - startWorld.x),
    h: Math.abs(currentWorld.y - startWorld.y),
  };
}
