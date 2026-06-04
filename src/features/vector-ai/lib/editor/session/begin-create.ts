import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

export type CreateTool = Extract<EditorTool, "rect" | "circle" | "line">;

export function beginCreateSession(
  tool: CreateTool,
  world: WorldPoint,
  pointerId: number,
): PointerSession {
  const kind =
    tool === "rect"
      ? "create-rect"
      : tool === "circle"
        ? "create-circle"
        : "create-line";
  return {
    kind,
    pointerId,
    startWorld: world,
    currentWorld: world,
  };
}
