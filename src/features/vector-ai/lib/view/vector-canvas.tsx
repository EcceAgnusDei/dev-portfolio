import { forwardRef, type PointerEvent } from "react";

import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import type { RectPreview } from "@/features/vector-ai/lib/editor/pointer/pointer-session";
import { viewBoxToAttr } from "@/features/vector-ai/lib/view/shape-presentation";
import { SelectionLineHandles } from "@/features/vector-ai/lib/editor/pointer/selection-line-handles";
import { ShapeView } from "@/features/vector-ai/lib/view/shape-view";
import type { LineEnd } from "@/features/vector-ai/lib/editor/pointer/pointer-session";
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
