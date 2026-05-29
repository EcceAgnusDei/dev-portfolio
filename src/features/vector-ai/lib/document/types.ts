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

export type ShapeType = "rect" | "circle" | "line";

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

export type Shape = RectShape | CircleShape | LineShape;

export type VectorDoc = {
  version: VectorDocVersion;
  viewBox: ViewBox;
  shapes: Shape[];
};
