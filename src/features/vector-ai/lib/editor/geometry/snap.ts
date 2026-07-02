import type {
  VectorDoc,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import { lineEndWorldPoint } from "@/features/vector-ai/lib/editor/session/types";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import { VECTOR_AI_SNAP_TOLERANCE_PX } from "@/features/vector-ai/lib/vector-ai-config";

export type SnapResult = {
  point: WorldPoint;
  snapped: boolean;
  target?: WorldPoint;
};

export function snapToleranceWorldForViewBox(
  viewBox: ViewBox,
  viewportWidthPx: number,
): number {
  const width = viewportWidthPx > 0 ? viewportWidthPx : viewBox.w;
  return VECTOR_AI_SNAP_TOLERANCE_PX * (viewBox.w / width);
}

export function collectLineEndpointTargets(doc: VectorDoc): WorldPoint[] {
  const targets: WorldPoint[] = [];

  for (const shape of doc.shapes) {
    if (shape.type !== "line") continue;
    targets.push(lineEndWorldPoint(shape, "start"));
    targets.push(lineEndWorldPoint(shape, "end"));
  }

  return targets;
}

function distanceSquared(a: WorldPoint, b: WorldPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function snapWorldPoint(
  point: WorldPoint,
  targets: WorldPoint[],
  toleranceWorld: number,
): SnapResult {
  if (targets.length === 0 || toleranceWorld <= 0) {
    return { point, snapped: false };
  }

  const toleranceSquared = toleranceWorld * toleranceWorld;
  let bestTarget: WorldPoint | undefined;
  let bestDistanceSquared = toleranceSquared;

  for (const target of targets) {
    const distance = distanceSquared(point, target);
    if (distance <= bestDistanceSquared) {
      bestDistanceSquared = distance;
      bestTarget = target;
    }
  }

  if (!bestTarget) {
    return { point, snapped: false };
  }

  return { point: bestTarget, snapped: true, target: bestTarget };
}

export function resolveLineEndpointSnap(
  point: WorldPoint,
  doc: VectorDoc,
  toleranceWorld: number,
): WorldPoint {
  const targets = collectLineEndpointTargets(doc);
  return snapWorldPoint(point, targets, toleranceWorld).point;
}
