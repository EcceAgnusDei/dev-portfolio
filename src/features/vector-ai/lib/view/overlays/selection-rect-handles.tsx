import type { PointerEvent } from "react";

import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { rectHandleWorldPoint } from "@/features/vector-ai/lib/editor/geometry/resize";
import type { RectResizeHandle } from "@/features/vector-ai/lib/editor/session/types";
import { selectedShapeOfType } from "@/features/vector-ai/lib/view/overlays/selected-shape";
import { SelectionResizeHandle } from "@/features/vector-ai/lib/view/overlays/selection-resize-handle";

const RECT_HANDLES: RectResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

const HANDLE_CURSOR: Record<RectResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

export type SelectionRectHandlesProps = {
  doc: VectorDoc;
  selectedId: string | null;
  onRectHandlePointerDown?: (
    shapeId: string,
    handle: RectResizeHandle,
    event: PointerEvent,
  ) => void;
};

export function SelectionRectHandles({
  doc,
  selectedId,
  onRectHandlePointerDown,
}: SelectionRectHandlesProps) {
  if (!onRectHandlePointerDown) return null;

  const rect = selectedShapeOfType(doc, selectedId, "rect");
  if (!rect) return null;

  return (
    <>
      {RECT_HANDLES.map((handle) => {
        const point = rectHandleWorldPoint(rect, handle);
        return (
          <SelectionResizeHandle
            key={`${rect.id}-${handle}`}
            cx={point.x}
            cy={point.y}
            cursor={HANDLE_CURSOR[handle]}
            dataAttrs={{
              "data-rect-handle": handle,
              "data-shape-id": rect.id,
            }}
            onPointerDown={(event) => {
              onRectHandlePointerDown(rect.id, handle, event);
            }}
          />
        );
      })}
    </>
  );
}
