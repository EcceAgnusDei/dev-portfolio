import type { CirclePreview } from "@/features/vector-ai/lib/editor/preview/circle";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";

export function circlePreviewFromAnchorAndPoint(
  anchor: WorldPoint,
  point: WorldPoint,
): CirclePreview {
  const cx = (anchor.x + point.x) / 2;
  const cy = (anchor.y + point.y) / 2;
  const r = Math.hypot(point.x - anchor.x, point.y - anchor.y) / 2;
  return { cx, cy, r, anchorX: anchor.x, anchorY: anchor.y };
}
