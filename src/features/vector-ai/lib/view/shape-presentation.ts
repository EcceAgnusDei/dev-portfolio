import type { Shape, ViewBox } from "@/features/vector-ai/lib/document/types";
import { segmentsToPathD } from "@/features/vector-ai/lib/view/segments-to-path-d";
import { styleToSvgProps } from "@/features/vector-ai/lib/view/style-to-svg-props";
import {
  buildSvgTransform,
  hasTransformExtras,
} from "@/features/vector-ai/lib/view/transform-to-svg";

export type SvgPrimitiveTag = "rect" | "circle" | "line" | "path" | "text";

export type ShapeLayer = {
  tag: SvgPrimitiveTag;
  attrs: Record<string, string | number>;
};

export type ShapePresentation = ShapeLayer & {
  groupTransform?: string;
  textContent?: string;
};

export function viewBoxToAttr(viewBox: ViewBox): string {
  return `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;
}

export function presentationFromShape(shape: Shape): ShapePresentation {
  const style = styleToSvgProps(shape.style);
  const local = hasTransformExtras(shape.transform);
  const groupTransform = local
    ? buildSvgTransform(shape.transform)
    : undefined;

  switch (shape.type) {
    case "rect":
      return {
        tag: "rect",
        attrs: {
          x: local ? 0 : shape.transform.x,
          y: local ? 0 : shape.transform.y,
          width: shape.w,
          height: shape.h,
          ...(shape.rx != null ? { rx: shape.rx } : {}),
          ...style,
        },
        groupTransform,
      };
    case "circle":
      return {
        tag: "circle",
        attrs: {
          cx: local ? 0 : shape.transform.x,
          cy: local ? 0 : shape.transform.y,
          r: shape.r,
          ...style,
        },
        groupTransform,
      };
    case "line": {
      const { transform, x2, y2 } = shape;
      return {
        tag: "line",
        attrs: {
          x1: local ? 0 : transform.x,
          y1: local ? 0 : transform.y,
          x2: local ? x2 - transform.x : x2,
          y2: local ? y2 - transform.y : y2,
          ...style,
        },
        groupTransform,
      };
    }
    case "path":
      return {
        tag: "path",
        attrs: {
          d: segmentsToPathD(shape.segments),
          ...style,
        },
        groupTransform: buildSvgTransform(shape.transform),
      };
    case "text":
      return {
        tag: "text",
        attrs: {
          x: local ? 0 : shape.transform.x,
          y: local ? 0 : shape.transform.y,
          fontSize: shape.fontSize,
          fontFamily: shape.fontFamily,
          dominantBaseline: "hanging",
          textAnchor: "middle",
          ...style,
        },
        textContent: shape.content,
        groupTransform,
      };
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}
