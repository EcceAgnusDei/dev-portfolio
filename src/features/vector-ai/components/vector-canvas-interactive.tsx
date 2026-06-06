"use client";

import type { RefObject } from "react";

import type { UseVectorInteractionResult } from "@/features/vector-ai/lib/editor/use-vector-interaction";
import { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";
import { cn } from "@/lib/utils";

export type VectorCanvasInteractiveProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  interaction: UseVectorInteractionResult;
  selectedIds: string[];
  className?: string;
};

export function VectorCanvasInteractive({
  svgRef,
  interaction,
  selectedIds,
  className,
}: VectorCanvasInteractiveProps) {
  return (
    <VectorCanvas
      ref={svgRef}
      doc={interaction.displayDoc}
      selectedIds={selectedIds}
      className={cn(className)}
      shapePointerEvents={interaction.shapePointerEvents}
      rectPreview={interaction.rectPreview}
      circlePreview={interaction.circlePreview}
      linePreview={interaction.linePreview}
      cubicPreview={interaction.cubicPreview}
      onPointerDown={interaction.onSvgPointerDown}
      onPointerMove={interaction.onSvgPointerMove}
      onPointerUp={interaction.onSvgPointerUp}
      onPointerCancel={interaction.onSvgPointerCancel}
      onShapePointerDown={interaction.onShapePointerDown}
      onLineEndPointerDown={interaction.onLineEndPointerDown}
      onCubicHandlePointerDown={interaction.onCubicHandlePointerDown}
    />
  );
}
