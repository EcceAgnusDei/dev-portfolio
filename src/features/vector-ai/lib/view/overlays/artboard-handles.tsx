import type { PointerEvent } from "react";

import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import {
  VIEWBOX_RESIZE_HANDLES,
  viewBoxHandleWorldPoint,
} from "@/features/vector-ai/lib/editor/geometry/resize-viewbox";
import type { ViewBoxResizeHandle } from "@/features/vector-ai/lib/editor/session/types";
import {
  VECTOR_AI_SELECTION_OUTLINE_DASHARRAY,
  VECTOR_AI_SELECTION_OUTLINE_STROKE_WIDTH,
} from "@/features/vector-ai/lib/vector-ai-config";
import { SelectionResizeHandle } from "@/features/vector-ai/lib/view/overlays/selection-resize-handle";

const HANDLE_CURSOR: Record<ViewBoxResizeHandle, string> = {
  n: "ns-resize",
  e: "ew-resize",
  s: "ns-resize",
  w: "ew-resize",
};

export type ArtboardHandlesProps = {
  viewBox: ViewBox;
  onViewBoxHandlePointerDown?: (
    handle: ViewBoxResizeHandle,
    event: PointerEvent,
  ) => void;
};

export function ArtboardHandles({
  viewBox,
  onViewBoxHandlePointerDown,
}: ArtboardHandlesProps) {
  const { x, y, w, h } = viewBox;

  return (
    <g data-artboard-handles>
      <rect
        data-artboard-outline
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={VECTOR_AI_SELECTION_OUTLINE_STROKE_WIDTH}
        strokeDasharray={VECTOR_AI_SELECTION_OUTLINE_DASHARRAY}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {onViewBoxHandlePointerDown
        ? VIEWBOX_RESIZE_HANDLES.map((handle) => {
            const point = viewBoxHandleWorldPoint(viewBox, handle);
            return (
              <SelectionResizeHandle
                key={handle}
                cx={point.x}
                cy={point.y}
                cursor={HANDLE_CURSOR[handle]}
                dataAttrs={{ "data-viewbox-handle": handle }}
                onPointerDown={(event) => {
                  onViewBoxHandlePointerDown(handle, event);
                }}
              />
            );
          })
        : null}
    </g>
  );
}
