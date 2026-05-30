import type { ReactElement } from "react";

import type { Shape } from "@/features/vector-ai/lib/document/types";
import { styleToSvgProps } from "@/features/vector-ai/lib/render/style-to-svg-props";
import {
  buildSvgTransform,
  hasTransformExtras,
} from "@/features/vector-ai/lib/render/transform-to-svg";

export type ShapeViewProps = {
  shape: Shape;
  selected?: boolean;
};

function selectionOutlineProps(selected: boolean | undefined) {
  if (!selected) return {};
  return {
    stroke: "var(--primary)",
    strokeWidth: 2,
    vectorEffect: "non-scaling-stroke" as const,
  };
}

function wrapShape(shape: Shape, node: ReactElement): ReactElement {
  if (!hasTransformExtras(shape.transform)) return node;
  return <g transform={buildSvgTransform(shape.transform)}>{node}</g>;
}

function RectView({ shape, selected }: { shape: Extract<Shape, { type: "rect" }>; selected?: boolean }) {
  const { transform, w, h, rx, style } = shape;
  const local = hasTransformExtras(transform);
  const svgStyle = styleToSvgProps(style);
  const outline = selectionOutlineProps(selected);

  const rect = (
    <rect
      x={local ? 0 : transform.x}
      y={local ? 0 : transform.y}
      width={w}
      height={h}
      rx={rx}
      {...svgStyle}
      {...outline}
    />
  );

  return wrapShape(shape, rect);
}

function CircleView({
  shape,
  selected,
}: {
  shape: Extract<Shape, { type: "circle" }>;
  selected?: boolean;
}) {
  const { transform, r, style } = shape;
  const local = hasTransformExtras(transform);
  const svgStyle = styleToSvgProps(style);
  const outline = selectionOutlineProps(selected);

  const circle = (
    <circle
      cx={local ? 0 : transform.x}
      cy={local ? 0 : transform.y}
      r={r}
      {...svgStyle}
      {...outline}
    />
  );

  return wrapShape(shape, circle);
}

function LineView({ shape, selected }: { shape: Extract<Shape, { type: "line" }>; selected?: boolean }) {
  const { transform, x2, y2, style } = shape;
  const local = hasTransformExtras(transform);
  const svgStyle = styleToSvgProps(style);
  const outline = selectionOutlineProps(selected);

  const line = (
    <line
      x1={local ? 0 : transform.x}
      y1={local ? 0 : transform.y}
      x2={local ? x2 - transform.x : x2}
      y2={local ? y2 - transform.y : y2}
      {...svgStyle}
      {...outline}
    />
  );

  return wrapShape(shape, line);
}

export function ShapeView({ shape, selected }: ShapeViewProps) {
  switch (shape.type) {
    case "rect":
      return <RectView shape={shape} selected={selected} />;
    case "circle":
      return <CircleView shape={shape} selected={selected} />;
    case "line":
      return <LineView shape={shape} selected={selected} />;
    default:
      return null;
  }
}
