import { forwardRef, type MouseEvent, type PointerEvent } from "react";

import type { TextShape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import type { CirclePreview } from "@/features/vector-ai/lib/editor/preview/circle";
import type { CubicPathPreview } from "@/features/vector-ai/lib/editor/preview/cubic";
import type { LinePreview } from "@/features/vector-ai/lib/editor/preview/line";
import type { RectPreview } from "@/features/vector-ai/lib/editor/preview/rect";
import type { LineEnd } from "@/features/vector-ai/lib/editor/session/types";
import type { CubicHandle } from "@/features/vector-ai/lib/document/types";
import { SelectionCircleHandles } from "@/features/vector-ai/lib/view/overlays/selection-circle-handles";
import { SelectionCubicHandles } from "@/features/vector-ai/lib/view/overlays/selection-cubic-handles";
import { SelectionLineHandles } from "@/features/vector-ai/lib/view/overlays/selection-line-handles";
import { SelectionRectHandles } from "@/features/vector-ai/lib/view/overlays/selection-rect-handles";
import type {
  CircleResizeHandle,
  RectResizeHandle,
} from "@/features/vector-ai/lib/editor/session/types";
import { TextEditForeignObject } from "@/features/vector-ai/components/text-edit-foreign-object";
import type { TextEditCommit } from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import { viewBoxToAttr } from "@/features/vector-ai/lib/view/shape-presentation";
import { ShapeView } from "@/features/vector-ai/lib/view/shape-view";
import { cn } from "@/lib/utils";

export type VectorCanvasTextEdit = {
  shape: TextShape;
  previewFontSize?: number;
  onCommit: (input: TextEditCommit) => void;
  onCancel: () => void;
};

export type VectorCanvasProps = {
  doc: VectorDoc;
  selectedId?: string | null;
  className?: string;
  "aria-label"?: string;
  shapePointerEvents?: "auto" | "none";
  onShapePointerDown?: (shapeId: string, event: PointerEvent) => void;
  onShapeDoubleClick?: (shapeId: string, event: MouseEvent) => void;
  onLineEndPointerDown?: (
    shapeId: string,
    end: LineEnd,
    event: PointerEvent,
  ) => void;
  onCubicHandlePointerDown?: (
    shapeId: string,
    handle: CubicHandle,
    event: PointerEvent,
  ) => void;
  onRectHandlePointerDown?: (
    shapeId: string,
    handle: RectResizeHandle,
    event: PointerEvent,
  ) => void;
  onCircleHandlePointerDown?: (
    shapeId: string,
    handle: CircleResizeHandle,
    event: PointerEvent,
  ) => void;
  onPointerDown?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel?: (event: PointerEvent<SVGSVGElement>) => void;
  rectPreview?: RectPreview | null;
  circlePreview?: CirclePreview | null;
  linePreview?: LinePreview | null;
  cubicPreview?: CubicPathPreview | null;
  editingTextId?: string | null;
  textEdit?: VectorCanvasTextEdit | null;
};

export const VectorCanvas = forwardRef<SVGSVGElement, VectorCanvasProps>(
  function VectorCanvas(
    {
      doc,
      selectedId = null,
      className,
      "aria-label": ariaLabel = "Zone de dessin vectoriel",
      shapePointerEvents = "auto",
      onShapePointerDown,
      onShapeDoubleClick,
      onLineEndPointerDown,
      onCubicHandlePointerDown,
      onRectHandlePointerDown,
      onCircleHandlePointerDown,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      rectPreview,
      circlePreview,
      linePreview,
      cubicPreview,
      editingTextId = null,
      textEdit = null,
    },
    ref,
  ) {
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
          interactive && "touch-none select-none",
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
              selected={shape.id === selectedId}
              hidden={shape.id === editingTextId}
              onPointerDown={
                shapePointerEvents === "auto" && onShapePointerDown
                  ? (event) => onShapePointerDown(shape.id, event)
                  : undefined
              }
              onDoubleClick={
                shapePointerEvents === "auto" && onShapeDoubleClick
                  ? (event) => onShapeDoubleClick(shape.id, event)
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
            {cubicPreview ? (
              <g
                transform={`translate(${cubicPreview.transform.x} ${cubicPreview.transform.y})`}
              >
                <path
                  d={cubicPreview.d}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="4 2"
                />
              </g>
            ) : null}
          </g>
          <g
            pointerEvents={
              onLineEndPointerDown ||
              onCubicHandlePointerDown ||
              onRectHandlePointerDown ||
              onCircleHandlePointerDown
                ? "auto"
                : "none"
            }
          >
            <SelectionLineHandles
              doc={doc}
              selectedId={selectedId}
              onLineEndPointerDown={onLineEndPointerDown}
            />
            <SelectionCubicHandles
              doc={doc}
              selectedId={selectedId}
              onCubicHandlePointerDown={onCubicHandlePointerDown}
            />
            <SelectionRectHandles
              doc={doc}
              selectedId={selectedId}
              onRectHandlePointerDown={onRectHandlePointerDown}
            />
            <SelectionCircleHandles
              doc={doc}
              selectedId={selectedId}
              onCircleHandlePointerDown={onCircleHandlePointerDown}
            />
          </g>
          {textEdit ? (
            <TextEditForeignObject
              key={textEdit.shape.id}
              shape={textEdit.shape}
              previewFontSize={textEdit.previewFontSize}
              onCommit={textEdit.onCommit}
              onCancel={textEdit.onCancel}
            />
          ) : null}
        </g>
      </svg>
    );
  },
);

VectorCanvas.displayName = "VectorCanvas";
