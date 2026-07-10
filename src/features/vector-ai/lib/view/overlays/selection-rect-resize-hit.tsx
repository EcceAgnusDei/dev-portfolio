import type { PointerEvent } from "react";

import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import type { ShapePointerRegion } from "@/features/vector-ai/lib/editor/use-vector-interaction";
import { rectResizeHitStrokeWidth } from "@/features/vector-ai/lib/editor/geometry/resize";
import { selectedShapeOfType } from "@/features/vector-ai/lib/view/overlays/selected-shape";
import {
  buildSvgTransform,
  hasTransformExtras,
} from "@/features/vector-ai/lib/view/transform-to-svg";

const RESIZE_CONTOUR_REGION: ShapePointerRegion = "resize-contour";

export type SelectionRectResizeHitProps = {
  doc: VectorDoc;
  selectedId: string | null;
  tolerance: number;
  onShapePointerDown?: (
    shapeId: string,
    event: PointerEvent,
    region?: ShapePointerRegion,
  ) => void;
  onShapePointerMove?: (
    shapeId: string,
    event: PointerEvent,
    region?: ShapePointerRegion,
  ) => void;
  onShapePointerLeave?: (event: PointerEvent) => void;
};

export function SelectionRectResizeHit({
  doc,
  selectedId,
  tolerance,
  onShapePointerDown,
  onShapePointerMove,
  onShapePointerLeave,
}: SelectionRectResizeHitProps) {
  if (!onShapePointerDown || tolerance <= 0) return null;

  const rect = selectedShapeOfType(doc, selectedId, "rect");
  if (!rect) return null;

  const strokeWidth = rectResizeHitStrokeWidth(tolerance);
  const local = hasTransformExtras(rect.transform);

  const hitRect = (
    <rect
      data-rect-resize-hit
      data-shape-id={rect.id}
      x={local ? 0 : rect.transform.x}
      y={local ? 0 : rect.transform.y}
      width={rect.w}
      height={rect.h}
      fill="none"
      stroke="transparent"
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
      pointerEvents="stroke"
      onPointerDown={(event) => {
        event.stopPropagation();
        onShapePointerDown(rect.id, event, RESIZE_CONTOUR_REGION);
      }}
      onPointerMove={
        onShapePointerMove
          ? (event) =>
              onShapePointerMove(rect.id, event, RESIZE_CONTOUR_REGION)
          : undefined
      }
      onPointerLeave={onShapePointerLeave}
    />
  );

  if (!local) return hitRect;

  return <g transform={buildSvgTransform(rect.transform)}>{hitRect}</g>;
}
