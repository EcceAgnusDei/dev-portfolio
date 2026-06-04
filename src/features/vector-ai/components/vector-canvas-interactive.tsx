"use client";

import { useRef } from "react";

import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/core/state";
import { useVectorInteraction } from "@/features/vector-ai/lib/editor/use-vector-interaction";
import { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";
import { cn } from "@/lib/utils";

export type VectorCanvasInteractiveProps = {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  className?: string;
};

export function VectorCanvasInteractive({
  state,
  dispatch,
  className,
}: VectorCanvasInteractiveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointer = useVectorInteraction({ state, dispatch, svgRef });

  return (
    <VectorCanvas
      ref={svgRef}
      doc={pointer.displayDoc}
      selectedIds={state.selection.ids}
      className={cn(className)}
      shapePointerEvents={pointer.shapePointerEvents}
      rectPreview={pointer.rectPreview}
      circlePreview={pointer.circlePreview}
      linePreview={pointer.linePreview}
      onPointerDown={pointer.onSvgPointerDown}
      onPointerMove={pointer.onSvgPointerMove}
      onPointerUp={pointer.onSvgPointerUp}
      onPointerCancel={pointer.onSvgPointerCancel}
      onShapePointerDown={pointer.onShapePointerDown}
      onLineEndPointerDown={pointer.onLineEndPointerDown}
    />
  );
}
