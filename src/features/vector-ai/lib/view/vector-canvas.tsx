import { forwardRef, type PointerEvent } from "react";

import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import type { CirclePreview } from "@/features/vector-ai/lib/editor/geometry/circle-preview";
import type { LinePreview } from "@/features/vector-ai/lib/editor/geometry/line-preview";
import type { RectPreview } from "@/features/vector-ai/lib/editor/geometry/rect-preview";
import type { LineEnd } from "@/features/vector-ai/lib/editor/session/types";
import { SelectionLineHandles } from "@/features/vector-ai/lib/view/overlays/selection-line-handles";
import { viewBoxToAttr } from "@/features/vector-ai/lib/view/shape-presentation";
import { ShapeView } from "@/features/vector-ai/lib/view/shape-view";
import { cn } from "@/lib/utils";

export type VectorCanvasProps = {
  doc: VectorDoc;
  selectedIds?: string[];
  className?: string;
  "aria-label"?: string;
  shapePointerEvents?: "auto" | "none";
  onShapePointerDown?: (shapeId: string, event: PointerEvent) => void;
  onLineEndPointerDown?: (
    shapeId: string,
    end: LineEnd,
    event: PointerEvent,
  ) => void;
  onPointerDown?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel?: (event: PointerEvent<SVGSVGElement>) => void;
  rectPreview?: RectPreview | null;
  circlePreview?: CirclePreview | null;
  linePreview?: LinePreview | null;
};

export const VectorCanvas = forwardRef<SVGSVGElement, VectorCanvasProps>(
  function VectorCanvas(
    {
      doc,
      selectedIds = [],
      className,
      "aria-label": ariaLabel = "Zone de dessin vectoriel",
      shapePointerEvents = "auto",
      onShapePointerDown,
      onLineEndPointerDown,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      rectPreview,
      circlePreview,
      linePreview,
    },
    ref,
  ) {
    const selected = new Set(selectedIds);
    const { viewBox } = doc;
    const interactive = Boolean(onPointerDown);

    return (
      <svg
        ref={ref}
        viewBox={viewBoxToAttr(viewBox)}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "block border border-border bg-background",
          interactive && "touch-none",
          className,
        )}
        aria-label={ariaLabel}
        role="img"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <rect
          data-canvas-background="true"
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w}
          height={viewBox.h}
          fill="var(--background)"
        />
        <g data-layer="content" style={{ pointerEvents: shapePointerEvents }}>
          {doc.shapes.map((shape) => (
            <ShapeView
              key={shape.id}
              shape={shape}
              selected={selected.has(shape.id)}
              onPointerDown={
                onShapePointerDown
                  ? (event) => onShapePointerDown(shape.id, event)
                  : undefined
              }
            />
          ))}
        </g>
        <g data-layer="overlay">
          <g pointerEvents="none">
            {rectPreview && rectPreview.w > 0 && rectPreview.h > 0 ? (
              <rect
                x={rectPreview.x}
                y={rectPreview.y}
                width={rectPreview.w}
                height={rectPreview.h}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="4 2"
              />
            ) : null}
            {circlePreview && circlePreview.r > 0 ? (
              <>
                <circle
                  cx={circlePreview.cx}
                  cy={circlePreview.cy}
                  r={circlePreview.r}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="4 2"
                />
                <circle
                  cx={circlePreview.anchorX}
                  cy={circlePreview.anchorY}
                  r={3}
                  fill="var(--primary)"
                  stroke="none"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
            {linePreview ? (
              <line
                x1={linePreview.x1}
                y1={linePreview.y1}
                x2={linePreview.x2}
                y2={linePreview.y2}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="4 2"
              />
            ) : null}
          </g>
          <g pointerEvents={onLineEndPointerDown ? "auto" : "none"}>
            <SelectionLineHandles
              doc={doc}
              selectedIds={selectedIds}
              onLineEndPointerDown={onLineEndPointerDown}
            />
          </g>
        </g>
      </svg>
    );
  },
);

VectorCanvas.displayName = "VectorCanvas";
