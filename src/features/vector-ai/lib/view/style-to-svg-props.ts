import type { ShapeStyle } from "@/features/vector-ai/lib/document/types";

export type SvgStyleProps = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

export function styleToSvgProps(style: ShapeStyle): SvgStyleProps {
  return {
    fill: style.fill ?? "none",
    stroke: style.stroke ?? "none",
    strokeWidth: style.strokeWidth ?? 1,
    ...(style.opacity != null ? { opacity: style.opacity } : {}),
  };
}
