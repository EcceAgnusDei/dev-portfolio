import type { PointerEvent } from "react";

import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import {
  lineEndWorldPoint,
  type LineEnd,
} from "@/features/vector-ai/lib/editor/session/types";
import { selectedShapeOfType } from "@/features/vector-ai/lib/view/overlays/selected-shape";
import { SelectionResizeHandle } from "@/features/vector-ai/lib/view/overlays/selection-resize-handle";

export type SelectionLineHandlesProps = {
  doc: VectorDoc;
  selectedId: string | null;
  onLineEndPointerDown?: (
    shapeId: string,
    end: LineEnd,
    event: PointerEvent,
  ) => void;
};

export function SelectionLineHandles({
  doc,
  selectedId,
  onLineEndPointerDown,
}: SelectionLineHandlesProps) {
  if (!onLineEndPointerDown) return null;

  const line = selectedShapeOfType(doc, selectedId, "line");
  if (!line) return null;

  const ends: LineEnd[] = ["start", "end"];

  return (
    <>
      {ends.map((end) => {
        const point = lineEndWorldPoint(line, end);
        return (
          <SelectionResizeHandle
            key={`${line.id}-${end}`}
            cx={point.x}
            cy={point.y}
            cursor={end === "start" ? "nwse-resize" : "nesw-resize"}
            dataAttrs={{
              "data-line-handle": end,
              "data-shape-id": line.id,
            }}
            onPointerDown={(event) => {
              onLineEndPointerDown(line.id, end, event);
            }}
          />
        );
      })}
    </>
  );
}
