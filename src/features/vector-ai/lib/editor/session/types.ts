import type {
  CubicCreateStep,
  CubicHandle,
  CubicWorldPoints,
  LineShape,
  Transform,
} from "@/features/vector-ai/lib/document/types";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";

export type { WorldPoint };

export type { CubicHandle };

export type LineEnd = "start" | "end";

export type RectResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export type CircleResizeHandle = "n" | "e" | "s" | "w";

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
      kind: "move-cubic-handle";
      pointerId: number;
      shapeId: string;
      handle: CubicHandle;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
      startPoints: CubicWorldPoints;
    }
  | {
      kind: "resize-rect";
      pointerId: number;
      shapeId: string;
      handle: RectResizeHandle;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
      startBounds: { x: number; y: number; w: number; h: number };
    }
  | {
      kind: "resize-circle";
      pointerId: number;
      shapeId: string;
      handle: CircleResizeHandle;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
      startCenter: WorldPoint;
      startR: number;
    }
  | {
      kind: "create-rect";
      pointerId: number;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
    }
  | {
      kind: "create-circle";
      pointerId: number;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
    }
  | {
      kind: "create-line";
      pointerId: number;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
    }
  | {
      kind: "create-cubic";
      step: CubicCreateStep;
      placed: Partial<CubicWorldPoints>;
      hover: WorldPoint | null;
      pointerId: number;
    };

export const IDLE_POINTER_SESSION: PointerSession = { kind: "idle" };

export type CreateDragSession = Extract<
  PointerSession,
  { kind: "create-rect" | "create-circle" | "create-line" }
>;
