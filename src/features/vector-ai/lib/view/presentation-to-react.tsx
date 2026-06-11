import {
  createElement,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
} from "react";

import type {
  ShapeLayer,
  ShapePresentation,
} from "@/features/vector-ai/lib/view/shape-presentation";
import {
  estimateTextBounds,
  textRenderPosition,
} from "@/features/vector-ai/lib/editor/geometry/text-bounds";
import {
  VECTOR_AI_HIT_CIRCLE_PADDING,
  VECTOR_AI_HIT_LINE_STROKE_WIDTH,
} from "@/features/vector-ai/lib/vector-ai-config";
import type { TextShape } from "@/features/vector-ai/lib/document/types";
import {
  splitTextLines,
  textLineHeight,
} from "@/features/vector-ai/lib/editor/geometry/text-lines";

export type PresentationToReactOptions = {
  selected?: boolean;
  onPointerDown?: (event: PointerEvent) => void;
  onDoubleClick?: (event: MouseEvent) => void;
};

function selectionOutlineProps(selected: boolean | undefined) {
  if (!selected) return {};
  return {
    stroke: "var(--primary)",
    strokeWidth: 2,
    vectorEffect: "non-scaling-stroke" as const,
  };
}

function pointerTargetProps(
  onPointerDown?: (event: PointerEvent) => void,
  onDoubleClick?: (event: MouseEvent) => void,
) {
  if (!onPointerDown && !onDoubleClick) return {};
  return {
    ...(onPointerDown ? { onPointerDown } : {}),
    ...(onDoubleClick ? { onDoubleClick } : {}),
    style: { cursor: "move" },
  };
}

export function layerToReact(
  layer: ShapeLayer,
  extraAttrs?: Record<string, unknown>,
): ReactElement {
  return createElement(layer.tag, {
    ...layer.attrs,
    ...extraAttrs,
  });
}

function hitLayerFromPresentation(
  presentation: ShapePresentation,
): ShapeLayer | null {
  const visible: ShapeLayer = {
    tag: presentation.tag,
    attrs: presentation.attrs,
  };

  switch (presentation.tag) {
    case "line": {
      const strokeWidth = Number(presentation.attrs.strokeWidth ?? 2);
      const hitStroke = Math.max(
        VECTOR_AI_HIT_LINE_STROKE_WIDTH,
        strokeWidth + 8,
      );
      return {
        tag: "line",
        attrs: {
          ...visible.attrs,
          stroke: "transparent",
          fill: "none",
          strokeWidth: hitStroke,
        },
      };
    }
    case "circle": {
      const r = Number(visible.attrs.r);
      return {
        tag: "circle",
        attrs: {
          cx: visible.attrs.cx,
          cy: visible.attrs.cy,
          r: r + VECTOR_AI_HIT_CIRCLE_PADDING,
          fill: "transparent",
          stroke: "none",
        },
      };
    }
    case "path": {
      const strokeWidth = Number(presentation.attrs.strokeWidth ?? 2);
      const hitStroke = Math.max(
        VECTOR_AI_HIT_LINE_STROKE_WIDTH,
        strokeWidth + 8,
      );
      return {
        tag: "path",
        attrs: {
          ...visible.attrs,
          stroke: "transparent",
          fill: "none",
          strokeWidth: hitStroke,
        },
      };
    }
    case "text": {
      const bounds = estimateTextBounds({
        transform: {
          x: Number(visible.attrs.x),
          y: Number(visible.attrs.y),
        },
        content: presentation.textContent ?? "",
        fontSize: Number(presentation.attrs.fontSize ?? 16),
      } satisfies Pick<TextShape, "transform" | "content" | "fontSize">);
      return {
        tag: "rect",
        attrs: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.w,
          height: bounds.h,
          fill: "rgba(0,0,0,0.001)",
          stroke: "none",
          pointerEvents: "all",
        },
      };
    }
    default:
      return null;
  }
}

function textNodeFromPresentation(
  presentation: ShapePresentation,
  extraAttrs?: Record<string, unknown>,
): ReactElement {
  const fontSize = Number(presentation.attrs.fontSize ?? 16);
  const centerX = Number(presentation.attrs.x);
  const centerY = Number(presentation.attrs.y);
  const { x, y } = textRenderPosition({
    transform: { x: centerX, y: centerY },
    content: presentation.textContent ?? "",
    fontSize,
  });
  const lines = splitTextLines(presentation.textContent ?? "");
  const lineHeight = textLineHeight(fontSize);

  const { style: extraStyle, ...restExtraAttrs } = extraAttrs ?? {};

  return createElement(
    "text",
    {
      ...presentation.attrs,
      x,
      y,
      ...restExtraAttrs,
      style: { userSelect: "none", ...(extraStyle as object | undefined) },
    },
    ...lines.map((line, index) =>
      createElement(
        "tspan",
        {
          key: index,
          x,
          dy: index === 0 ? 0 : lineHeight,
          style: { userSelect: "none" },
        },
        line,
      ),
    ),
  );
}

export function presentationToReact(
  presentation: ShapePresentation,
  options?: PresentationToReactOptions,
): ReactElement {
  const { selected, onPointerDown, onDoubleClick } = options ?? {};
  const hit =
    onPointerDown != null || onDoubleClick != null
      ? hitLayerFromPresentation(presentation)
      : null;

  if (!hit) {
    const node =
      presentation.tag === "text"
        ? textNodeFromPresentation(presentation, {
            ...selectionOutlineProps(selected),
            ...pointerTargetProps(onPointerDown, onDoubleClick),
          })
        : layerToReact(
            { tag: presentation.tag, attrs: presentation.attrs },
            {
              ...selectionOutlineProps(selected),
              ...pointerTargetProps(onPointerDown, onDoubleClick),
            },
          );

    if (!presentation.groupTransform) return node;

    return createElement("g", { transform: presentation.groupTransform }, node);
  }

  const hitNode = layerToReact(hit, {
    pointerEvents:
      hit.tag === "line" || hit.tag === "path" ? "stroke" : undefined,
    ...pointerTargetProps(onPointerDown, onDoubleClick),
  });

  const visibleNode =
    presentation.tag === "text"
      ? textNodeFromPresentation(presentation, {
          ...selectionOutlineProps(selected),
          pointerEvents: "none",
        })
      : layerToReact(
          { tag: presentation.tag, attrs: presentation.attrs },
          {
            ...selectionOutlineProps(selected),
            pointerEvents: "none",
          },
        );

  const children = [hitNode, visibleNode];

  if (presentation.groupTransform) {
    return createElement(
      "g",
      { transform: presentation.groupTransform },
      ...children,
    );
  }

  return createElement("g", null, ...children);
}
