import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

export function beginCreateTextSession(
  world: WorldPoint,
  pointerId: number,
): PointerSession {
  return {
    kind: "create-text",
    pointerId,
    startWorld: world,
    currentWorld: world,
  };
}
