import type { PointerEvent } from "react";

import type {
  CubicHandle,
  CubicWorldPoints,
  PathShape,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
import {
  cubicHandleWorldPoint,
  cubicWorldPointsFromPathShape,
} from "@/features/vector-ai/lib/editor/geometry/path-segments";
import { VECTOR_AI_LINE_HANDLE_RADIUS } from "@/features/vector-ai/lib/vector-ai-config";

export type SelectionCubicHandlesProps = {
  doc: VectorDoc;
  selectedIds: string[];
  onCubicHandlePointerDown?: (
    shapeId: string,
    handle: CubicHandle,
    event: PointerEvent,
  ) => void;
};

const CUBIC_HANDLES: CubicHandle[] = ["p0", "c1", "c2", "p3"];

function selectedCubicPaths(
  doc: VectorDoc,
  selectedIds: string[],
): PathShape[] {
  const selected = new Set(selectedIds);
  const out: PathShape[] = [];
  for (const shape of doc.shapes) {
    if (shape.type !== "path" || !selected.has(shape.id)) continue;
    if (cubicWorldPointsFromPathShape(shape)) out.push(shape);
  }
  return out;
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

function handleFill(handle: CubicHandle): string {
  return handle === "c1" || handle === "c2"
    ? "var(--background)"
    : "var(--primary)";
}

function handleStroke(handle: CubicHandle): string {
  return handle === "c1" || handle === "c2" ? "var(--primary)" : "none";
}

export function SelectionCubicHandles({
  doc,
  selectedIds,
  onCubicHandlePointerDown,
}: SelectionCubicHandlesProps) {
  if (!onCubicHandlePointerDown) return null;

  const paths = selectedCubicPaths(doc, selectedIds);
  if (paths.length === 0) return null;

  const r = VECTOR_AI_LINE_HANDLE_RADIUS;

  return (
    <>
      <g pointerEvents="none">
        {paths.map((shape) => {
          const points = cubicWorldPointsFromPathShape(shape);
          if (!points) return null;
          return <g key={`${shape.id}-guides`}>{guideLines(points)}</g>;
        })}
      </g>
      {paths.map((shape) => {
        const points = cubicWorldPointsFromPathShape(shape);
        if (!points) return null;

        return CUBIC_HANDLES.map((handle) => {
          const point = cubicHandleWorldPoint(points, handle);
          return (
            <circle
              key={`${shape.id}-${handle}`}
              cx={point.x}
              cy={point.y}
              r={r}
              fill={handleFill(handle)}
              stroke={handleStroke(handle)}
              strokeWidth={handle === "c1" || handle === "c2" ? 1.5 : 0}
              vectorEffect="non-scaling-stroke"
              data-cubic-handle={handle}
              data-shape-id={shape.id}
              style={{ cursor: "crosshair" }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onCubicHandlePointerDown(shape.id, handle, event);
              }}
            />
          );
        });
      })}
    </>
  );
}
