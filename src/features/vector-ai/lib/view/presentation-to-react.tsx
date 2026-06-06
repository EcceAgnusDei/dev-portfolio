import {
  createElement,
  type PointerEvent,
  type ReactElement,
} from "react";

import type {
  ShapeLayer,
  ShapePresentation,
} from "@/features/vector-ai/lib/view/shape-presentation";
import {
  VECTOR_AI_HIT_CIRCLE_PADDING,
  VECTOR_AI_HIT_LINE_STROKE_WIDTH,
} from "@/features/vector-ai/lib/vector-ai-config";

export type PresentationToReactOptions = {
  selected?: boolean;
  onPointerDown?: (event: PointerEvent) => void;
};

function selectionOutlineProps(selected: boolean | undefined) {
  if (!selected) return {};
  return {
    stroke: "var(--primary)",
    strokeWidth: 2,
    vectorEffect: "non-scaling-stroke" as const,
  };
}

function pointerTargetProps(onPointerDown?: (event: PointerEvent) => void) {
  if (!onPointerDown) return {};
  return {
    onPointerDown,
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
    default:
      return null;
  }
}

export function presentationToReact(
  presentation: ShapePresentation,
  options?: PresentationToReactOptions,
): ReactElement {
  const { selected, onPointerDown } = options ?? {};
  const hit =
    onPointerDown != null ? hitLayerFromPresentation(presentation) : null;

  if (!hit) {
    const node = layerToReact(
      { tag: presentation.tag, attrs: presentation.attrs },
      {
        ...selectionOutlineProps(selected),
        ...pointerTargetProps(onPointerDown),
      },
    );

    if (!presentation.groupTransform) return node;

    return createElement(
      "g",
      { transform: presentation.groupTransform },
      node,
    );
  }

  const hitNode = layerToReact(hit, {
    pointerEvents:
      hit.tag === "line" || hit.tag === "path" ? "stroke" : undefined,
    ...pointerTargetProps(onPointerDown),
  });

  const visibleNode = layerToReact(
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
