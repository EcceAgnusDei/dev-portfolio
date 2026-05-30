import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { viewBoxToAttr } from "@/features/vector-ai/lib/view/shape-presentation";
import { ShapeView } from "@/features/vector-ai/lib/view/shape-view";
import { cn } from "@/lib/utils";

export type VectorCanvasProps = {
  doc: VectorDoc;
  selectedIds?: string[];
  className?: string;
  "aria-label"?: string;
};

export function VectorCanvas({
  doc,
  selectedIds = [],
  className,
  "aria-label": ariaLabel = "Zone de dessin vectoriel",
}: VectorCanvasProps) {
  const selected = new Set(selectedIds);
  const { viewBox } = doc;

  return (
    <svg
      viewBox={viewBoxToAttr(viewBox)}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block border border-border bg-background", className)}
      aria-label={ariaLabel}
      role="img"
    >
      <rect
        x={viewBox.x}
        y={viewBox.y}
        width={viewBox.w}
        height={viewBox.h}
        fill="var(--background)"
      />
      <g data-layer="content">
        {doc.shapes.map((shape) => (
          <ShapeView
            key={shape.id}
            shape={shape}
            selected={selected.has(shape.id)}
          />
        ))}
      </g>
      <g data-layer="overlay" pointerEvents="none" />
    </svg>
  );
}
