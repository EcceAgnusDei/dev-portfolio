import type { PointerEvent } from "react";

import type {
  CubicHandle,
  CubicWorldPoints,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
import {
  cubicHandleWorldPoint,
  cubicWorldPointsFromPathShape,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import { selectedShapeOfType } from "@/features/vector-ai/lib/view/overlays/selected-shape";
import { SelectionResizeHandle } from "@/features/vector-ai/lib/view/overlays/selection-resize-handle";
import { VECTOR_AI_SELECTION_HANDLE_RADIUS } from "@/features/vector-ai/lib/vector-ai-config";

export type SelectionCubicHandlesProps = {
  doc: VectorDoc;
  selectedId: string | null;
  onCubicHandlePointerDown?: (
    shapeId: string,
    handle: CubicHandle,
    event: PointerEvent,
  ) => void;
};

const CUBIC_HANDLES: CubicHandle[] = ["p0", "c1", "c2", "p3"];

const HANDLE_CURSOR: Record<CubicHandle, string> = {
  p0: "nwse-resize",
  c1: "crosshair",
  c2: "crosshair",
  p3: "nesw-resize",
};

function isCubicEndpointHandle(handle: CubicHandle): boolean {
  return handle === "p0" || handle === "p3";
}

function guideLines(points: CubicWorldPoints) {
  return (
    <>
      <line
        x1={points.p0.x}
        y1={points.p0.y}
        x2={points.c1.x}
        y2={points.c1.y}
        stroke="var(--primary)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="3 2"
        opacity={0.6}
      />
      <line
        x1={points.p3.x}
        y1={points.p3.y}
        x2={points.c2.x}
        y2={points.c2.y}
        stroke="var(--primary)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="3 2"
        opacity={0.6}
      />
    </>
  );
}

export function SelectionCubicHandles({
  doc,
  selectedId,
  onCubicHandlePointerDown,
}: SelectionCubicHandlesProps) {
  if (!onCubicHandlePointerDown) return null;

  const path = selectedShapeOfType(doc, selectedId, "path");
  if (!path) return null;

  const points = cubicWorldPointsFromPathShape(path);
  if (!points) return null;

  return (
    <>
      <g pointerEvents="none">{guideLines(points)}</g>
      {CUBIC_HANDLES.map((handle) => {
        const point = cubicHandleWorldPoint(points, handle);

        if (isCubicEndpointHandle(handle)) {
          return (
            <circle
              key={`${path.id}-${handle}`}
              cx={point.x}
              cy={point.y}
              r={VECTOR_AI_SELECTION_HANDLE_RADIUS}
              fill="transparent"
              stroke="none"
              pointerEvents="all"
              style={{ cursor: HANDLE_CURSOR[handle] }}
              data-cubic-handle={handle}
              data-shape-id={path.id}
              onPointerDown={(event) => {
                event.stopPropagation();
                onCubicHandlePointerDown(path.id, handle, event);
              }}
            />
          );
        }

        return (
          <SelectionResizeHandle
            key={`${path.id}-${handle}`}
            cx={point.x}
            cy={point.y}
            cursor={HANDLE_CURSOR[handle]}
            dataAttrs={{
              "data-cubic-handle": handle,
              "data-shape-id": path.id,
            }}
            onPointerDown={(event) => {
              onCubicHandlePointerDown(path.id, handle, event);
            }}
          />
        );
      })}
    </>
  );
}
