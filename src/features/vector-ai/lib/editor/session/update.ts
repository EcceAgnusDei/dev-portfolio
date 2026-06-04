import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

export function updateSessionPointerWorld(
  session: PointerSession,
  pointerId: number,
  world: WorldPoint,
): PointerSession {
  if (session.kind === "idle") return session;
  if (session.pointerId !== pointerId) return session;
  return { ...session, currentWorld: world };
}
