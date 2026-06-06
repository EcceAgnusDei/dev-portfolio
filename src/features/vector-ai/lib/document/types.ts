import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";

export type VectorDocVersion = 1;

export type ViewBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Transform = {
  x: number;
  y: number;
  r?: number;
  sx?: number;
  sy?: number;
};

export type ShapeStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

export type ShapeType = "rect" | "circle" | "line" | "path";

export type ShapeBase = {
  id: string;
  type: ShapeType;
  transform: Transform;
  style: ShapeStyle;
  locked?: boolean;
  name?: string;
};

export type RectShape = ShapeBase & {
  type: "rect";
  w: number;
  h: number;
  rx?: number;
};

export type CircleShape = ShapeBase & {
  type: "circle";
  r: number;
};

export type LineShape = ShapeBase & {
  type: "line";
  x2: number;
  y2: number;
};

export type PathShape = ShapeBase & {
  type: "path";
  segments: PathSegmentLocal[];
};

export type Shape = RectShape | CircleShape | LineShape | PathShape;

export type VectorDoc = {
  version: VectorDocVersion;
  viewBox: ViewBox;
  shapes: Shape[];
};

export type CubicCreateStep = 1 | 2 | 3 | 4;

export const CUBIC_CREATE_STEPS = [1, 2, 3, 4] as const satisfies readonly CubicCreateStep[];

export type CubicHandle = "p0" | "c1" | "c2" | "p3";

export type CubicWorldPoints = {
  p0: WorldPoint;
  c1: WorldPoint;
  c2: WorldPoint;
  p3: WorldPoint;
};

export type MoveSegmentLocal = {
  t: "M";
  x: number;
  y: number;
};

export type CubicSegmentLocal = {
  t: "C";
  x: number;
  y: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
};

export type PathSegmentLocal = MoveSegmentLocal | CubicSegmentLocal;

export type CubicMvpPathSegments = [MoveSegmentLocal, CubicSegmentLocal];
