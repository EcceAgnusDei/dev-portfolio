import type { PointerEvent } from "react";

import type { LineShape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import {
  lineEndWorldPoint,
  type LineEnd,
} from "@/features/vector-ai/lib/editor/session/types";
import { VECTOR_AI_LINE_HANDLE_RADIUS } from "@/features/vector-ai/lib/vector-ai-config";

export type SelectionLineHandlesProps = {
  doc: VectorDoc;
  selectedIds: string[];
  onLineEndPointerDown?: (
    shapeId: string,
    end: LineEnd,
    event: PointerEvent,
  ) => void;
};

function selectedLines(
  doc: VectorDoc,
  selectedIds: string[],
): LineShape[] {
  const selected = new Set(selectedIds);
  const out: LineShape[] = [];
  for (const shape of doc.shapes) {
    if (shape.type === "line" && selected.has(shape.id)) {
      out.push(shape);
    }
  }
  return out;
}

export function SelectionLineHandles({
  doc,
  selectedIds,
  onLineEndPointerDown,
}: SelectionLineHandlesProps) {
  if (!onLineEndPointerDown) return null;

  const lines = selectedLines(doc, selectedIds);
  if (lines.length === 0) return null;

  const r = VECTOR_AI_LINE_HANDLE_RADIUS;

  return (
    <>
      {lines.map((line) => {
        const ends: LineEnd[] = ["start", "end"];
        return ends.map((end) => {
          const point = lineEndWorldPoint(line, end);
          return (
            <circle
              key={`${line.id}-${end}`}
              cx={point.x}
              cy={point.y}
              r={r}
              fill="transparent"
              stroke="none"
              data-line-handle={end}
              data-shape-id={line.id}
              style={{ cursor: end === "start" ? "nwse-resize" : "nesw-resize" }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onLineEndPointerDown(line.id, end, event);
              }}
            />
          );
        });
      })}
    </>
  );
}
