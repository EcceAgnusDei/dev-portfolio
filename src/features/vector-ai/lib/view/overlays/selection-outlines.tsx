import type { ReactElement } from "react";

import type { Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import { estimateTextBounds } from "@/features/vector-ai/lib/editor/geometry/text-bounds";
import {
  selectionOutlinePad,
  selectionStrokeContourHalfWidth,
} from "@/features/vector-ai/lib/view/overlays/selection-outline-metrics";
import {
  lineStrokeContourPathD,
  pathStrokeContourPathD,
} from "@/features/vector-ai/lib/view/overlays/stroke-contour-outline";
import {
  VECTOR_AI_SELECTION_OUTLINE_DASHARRAY,
  VECTOR_AI_SELECTION_OUTLINE_STROKE_WIDTH,
} from "@/features/vector-ai/lib/vector-ai-config";
import {
  buildSvgTransform,
  hasTransformExtras,
} from "@/features/vector-ai/lib/view/transform-to-svg";

const OUTLINE_ATTRS = {
  fill: "none",
  stroke: "var(--primary)",
  strokeWidth: VECTOR_AI_SELECTION_OUTLINE_STROKE_WIDTH,
  strokeDasharray: VECTOR_AI_SELECTION_OUTLINE_DASHARRAY,
  vectorEffect: "non-scaling-stroke",
} as const;

function wrapInTransformGroup(
  shape: Shape,
  child: ReactElement,
): ReactElement {
  const local = hasTransformExtras(shape.transform);
  if (!local) return child;
  return (
    <g transform={buildSvgTransform(shape.transform)} data-selection-outline>
      {child}
    </g>
  );
}

function strokeContourPath(
  shape: Shape,
  d: string | null,
  local: boolean,
): ReactElement | null {
  if (!d) return null;
  return wrapInTransformGroup(
    shape,
    <path data-selection-outline={local ? undefined : true} d={d} {...OUTLINE_ATTRS} />,
  );
}

function SelectionOutline({ shape }: { shape: Shape }): ReactElement {
  const pad = selectionOutlinePad(shape);

  switch (shape.type) {
    case "rect": {
      const local = hasTransformExtras(shape.transform);
      const rect = (
        <rect
          data-selection-outline={local ? undefined : true}
          x={local ? -pad : shape.transform.x - pad}
          y={local ? -pad : shape.transform.y - pad}
          width={shape.w + 2 * pad}
          height={shape.h + 2 * pad}
          {...OUTLINE_ATTRS}
        />
      );
      return wrapInTransformGroup(shape, rect);
    }
    case "circle": {
      const local = hasTransformExtras(shape.transform);
      const circle = (
        <circle
          data-selection-outline={local ? undefined : true}
          cx={local ? 0 : shape.transform.x}
          cy={local ? 0 : shape.transform.y}
          r={shape.r + pad}
          {...OUTLINE_ATTRS}
        />
      );
      return wrapInTransformGroup(shape, circle);
    }
    case "line": {
      const local = hasTransformExtras(shape.transform);
      const x1 = local ? 0 : shape.transform.x;
      const y1 = local ? 0 : shape.transform.y;
      const x2 = local ? shape.x2 - shape.transform.x : shape.x2;
      const y2 = local ? shape.y2 - shape.transform.y : shape.y2;
      const d = lineStrokeContourPathD(
        x1,
        y1,
        x2,
        y2,
        selectionStrokeContourHalfWidth(shape),
      );
      const outline = strokeContourPath(shape, d, local);
      if (!outline) {
        return <g data-selection-outline />;
      }
      return outline;
    }
    case "path": {
      const d = pathStrokeContourPathD(
        shape.segments,
        selectionStrokeContourHalfWidth(shape),
      );
      if (!d) {
        return (
          <g
            transform={buildSvgTransform(shape.transform)}
            data-selection-outline
          />
        );
      }
      return (
        <g transform={buildSvgTransform(shape.transform)} data-selection-outline>
          <path d={d} {...OUTLINE_ATTRS} />
        </g>
      );
    }
    case "text": {
      const bounds = estimateTextBounds(shape);
      return (
        <rect
          data-selection-outline
          x={bounds.x - pad}
          y={bounds.y - pad}
          width={bounds.w + 2 * pad}
          height={bounds.h + 2 * pad}
          {...OUTLINE_ATTRS}
        />
      );
    }
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

export type SelectionOutlinesProps = {
  doc: VectorDoc;
  selectedIds: readonly string[];
};

export function SelectionOutlines({ doc, selectedIds }: SelectionOutlinesProps) {
  if (selectedIds.length === 0) return null;

  return (
    <g data-layer="selection-outlines" pointerEvents="none">
      {selectedIds.map((id) => {
        const shape = getShapeById(doc, id);
        if (!shape) return null;
        return <SelectionOutline key={id} shape={shape} />;
      })}
    </g>
  );
}
