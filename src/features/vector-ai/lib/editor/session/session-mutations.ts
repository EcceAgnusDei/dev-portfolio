import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { resolveLineEndpointSnap } from "@/features/vector-ai/lib/editor/geometry/snap";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";
import { IDLE_POINTER_SESSION } from "@/features/vector-ai/lib/editor/session/types";

export type PointerSnapContext = {
  tool: EditorTool;
  doc: VectorDoc;
  snapToleranceWorld: number;
};

function snapWorldForCreateLine(
  world: WorldPoint,
  interaction: PointerSnapContext | undefined,
): WorldPoint {
  if (!interaction || interaction.tool !== "line") return world;
  return resolveLineEndpointSnap(
    world,
    interaction.doc,
    interaction.snapToleranceWorld,
  );
}

export function updateSessionPointerWorld(
  session: PointerSession,
  pointerId: number,
  world: WorldPoint,
  interaction?: PointerSnapContext,
): PointerSession {
  if (session.kind === "idle") return session;
  if (session.kind === "create-cubic") {
    return { ...session, hover: world };
  }
  if (session.pointerId !== pointerId) return session;
  if (session.kind === "create-line") {
    return {
      ...session,
      currentWorld: snapWorldForCreateLine(world, interaction),
    };
  }
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
