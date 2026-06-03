import type { LineShape, Transform } from "@/features/vector-ai/lib/document/types";

export type WorldPoint = {
  x: number;
  y: number;
};

export type LineEnd = "start" | "end";

export function lineEndWorldPoint(shape: LineShape, end: LineEnd): WorldPoint {
  if (end === "start") {
    return { x: shape.transform.x, y: shape.transform.y };
  }
  return { x: shape.x2, y: shape.y2 };
}

export type PointerSession =
  | { kind: "idle" }
  | {
      kind: "move";
      pointerId: number;
      shapeId: string;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
      startTransform: Pick<Transform, "x" | "y">;
      startX2?: number;
      startY2?: number;
    }
  | {
      kind: "move-line-end";
      pointerId: number;
      shapeId: string;
      end: LineEnd;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
      startTransform: Pick<Transform, "x" | "y">;
      startX2: number;
      startY2: number;
    }
  | {
      kind: "create-rect";
      pointerId: number;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
    };

export const IDLE_POINTER_SESSION: PointerSession = { kind: "idle" };

export type RectPreview = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function rectPreviewFromSession(
  session: Extract<PointerSession, { kind: "create-rect" }>,
): RectPreview {
  const { startWorld, currentWorld } = session;
  return {
    x: Math.min(startWorld.x, currentWorld.x),
    y: Math.min(startWorld.y, currentWorld.y),
    w: Math.abs(currentWorld.x - startWorld.x),
    h: Math.abs(currentWorld.y - startWorld.y),
  };
}
