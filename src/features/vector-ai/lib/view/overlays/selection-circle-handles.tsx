import type { PointerEvent } from "react";

import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { circleHandleWorldPoint } from "@/features/vector-ai/lib/editor/geometry/resize";
import type { CircleResizeHandle } from "@/features/vector-ai/lib/editor/session/types";
import { selectedShapeOfType } from "@/features/vector-ai/lib/view/overlays/selected-shape";
import { SelectionResizeHandle } from "@/features/vector-ai/lib/view/overlays/selection-resize-handle";

const CIRCLE_HANDLES: CircleResizeHandle[] = ["n", "e", "s", "w"];

const HANDLE_CURSOR: Record<CircleResizeHandle, string> = {
  n: "ns-resize",
  e: "ew-resize",
  s: "ns-resize",
  w: "ew-resize",
};

export type SelectionCircleHandlesProps = {
  doc: VectorDoc;
  selectedId: string | null;
  onCircleHandlePointerDown?: (
    shapeId: string,
    handle: CircleResizeHandle,
    event: PointerEvent,
  ) => void;
};

export function SelectionCircleHandles({
  doc,
  selectedId,
  onCircleHandlePointerDown,
}: SelectionCircleHandlesProps) {
  if (!onCircleHandlePointerDown) return null;

  const circle = selectedShapeOfType(doc, selectedId, "circle");
  if (!circle) return null;

  return (
    <>
      {CIRCLE_HANDLES.map((handle) => {
        const point = circleHandleWorldPoint(circle, handle);
        return (
          <SelectionResizeHandle
            key={`${circle.id}-${handle}`}
            cx={point.x}
            cy={point.y}
            cursor={HANDLE_CURSOR[handle]}
            dataAttrs={{
              "data-circle-handle": handle,
              "data-shape-id": circle.id,
            }}
            onPointerDown={(event) => {
              onCircleHandlePointerDown(circle.id, handle, event);
            }}
          />
        );
      })}
    </>
  );
}
