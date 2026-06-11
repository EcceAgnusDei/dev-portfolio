"use client";

import { useRef, type RefObject } from "react";

import { TextEditOverlay } from "@/features/vector-ai/components/text-edit-overlay";
import type { UseVectorInteractionResult } from "@/features/vector-ai/lib/editor/use-vector-interaction";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";
import { cn } from "@/lib/utils";

export type VectorCanvasInteractiveProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  interaction: UseVectorInteractionResult;
  doc: VectorDoc;
  selectedId: string | null;
  className?: string;
};

export function VectorCanvasInteractive({
  svgRef,
  interaction,
  doc,
  selectedId,
  className,
}: VectorCanvasInteractiveProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      <VectorCanvas
        ref={svgRef}
        doc={interaction.displayDoc}
        selectedId={selectedId}
        className="h-full w-full"
        shapePointerEvents={interaction.shapePointerEvents}
        rectPreview={interaction.rectPreview}
        circlePreview={interaction.circlePreview}
        linePreview={interaction.linePreview}
        cubicPreview={interaction.cubicPreview}
        editingTextId={interaction.editingTextId}
        onPointerDown={interaction.onSvgPointerDown}
        onPointerMove={interaction.onSvgPointerMove}
        onPointerUp={interaction.onSvgPointerUp}
        onPointerCancel={interaction.onSvgPointerCancel}
        onShapePointerDown={interaction.onShapePointerDown}
        onShapeDoubleClick={interaction.onShapeDoubleClick}
        onLineEndPointerDown={interaction.onLineEndPointerDown}
        onCubicHandlePointerDown={interaction.onCubicHandlePointerDown}
        onRectHandlePointerDown={interaction.onRectHandlePointerDown}
        onCircleHandlePointerDown={interaction.onCircleHandlePointerDown}
      />
      {interaction.editingTextId ? (
        <TextEditOverlay
          key={interaction.editingTextId}
          svgRef={svgRef}
          containerRef={containerRef}
          doc={doc}
          shapeId={interaction.editingTextId}
          onCommit={interaction.commitTextEdit}
          onCancel={interaction.cancelTextEdit}
        />
      ) : null}
    </div>
  );
}
