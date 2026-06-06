import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";
import { IDLE_POINTER_SESSION } from "@/features/vector-ai/lib/editor/session/types";

export function updateSessionPointerWorld(
  session: PointerSession,
  pointerId: number,
  world: WorldPoint,
): PointerSession {
  if (session.kind === "idle") return session;
  if (session.kind === "create-cubic") {
    return { ...session, hover: world };
  }
  if (session.pointerId !== pointerId) return session;
  return { ...session, currentWorld: world };
}

export function cancelCubicSessionForToolChange(
  session: PointerSession,
  nextTool: EditorTool,
): PointerSession {
  if (
    session.kind === "create-cubic" &&
    nextTool !== "cubic"
  ) {
    return IDLE_POINTER_SESSION;
  }
  return session;
}
