import type { WorldPoint } from "@/features/vector-ai/lib/editor/pointer/pointer-session";

export function screenToWorld(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): WorldPoint | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const world = pt.matrixTransform(ctm.inverse());
  if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) return null;

  return { x: world.x, y: world.y };
}
