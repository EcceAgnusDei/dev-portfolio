import type { PointerEvent, ReactElement } from "react";

import {
  VECTOR_AI_SELECTION_HANDLE_RADIUS,
  VECTOR_AI_SELECTION_HANDLE_STROKE_WIDTH,
} from "@/features/vector-ai/lib/vector-ai-config";

export type SelectionResizeHandleProps = {
  cx: number;
  cy: number;
  cursor: string;
  dataAttrs: Record<string, string>;
  onPointerDown: (event: PointerEvent) => void;
};

export function SelectionResizeHandle({
  cx,
  cy,
  cursor,
  dataAttrs,
  onPointerDown,
}: SelectionResizeHandleProps): ReactElement {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={VECTOR_AI_SELECTION_HANDLE_RADIUS}
      fill="var(--background)"
      stroke="var(--primary)"
      strokeWidth={VECTOR_AI_SELECTION_HANDLE_STROKE_WIDTH}
      vectorEffect="non-scaling-stroke"
      style={{ cursor }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event);
      }}
      {...dataAttrs}
    />
  );
}
