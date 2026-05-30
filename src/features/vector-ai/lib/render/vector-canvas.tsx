import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { ShapeView } from "@/features/vector-ai/lib/render/shape-view";
import { cn } from "@/lib/utils";

export type VectorCanvasProps = {
  doc: VectorDoc;
  selectedIds?: string[];
  className?: string;
  "aria-label"?: string;
};

function viewBoxAttr(viewBox: VectorDoc["viewBox"]): string {
  return `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;
}

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
      viewBox={viewBoxAttr(viewBox)}
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
