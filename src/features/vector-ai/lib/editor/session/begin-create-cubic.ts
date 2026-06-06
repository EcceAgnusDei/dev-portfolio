import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

export function beginCreateCubicSession(
  world: WorldPoint,
  pointerId: number,
): Extract<PointerSession, { kind: "create-cubic" }> {
  return {
    kind: "create-cubic",
    step: 2,
    placed: { p0: world },
    hover: null,
    pointerId,
  };
}
