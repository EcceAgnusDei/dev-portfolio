import type { MouseEvent, PointerEvent, ReactElement } from "react";

import type { Shape } from "@/features/vector-ai/lib/document/types";
import { presentationFromShape } from "@/features/vector-ai/lib/view/shape-presentation";
import { presentationToReact } from "@/features/vector-ai/lib/view/presentation-to-react";

export type ShapeViewProps = {
  shape: Shape;
  hidden?: boolean;
  onPointerDown?: (event: PointerEvent) => void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
  onDoubleClick?: (event: MouseEvent) => void;
};

export function ShapeView({
  shape,
  hidden,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onDoubleClick,
}: ShapeViewProps): ReactElement | null {
  if (hidden && shape.type === "text") {
    return null;
  }
  const presentation = presentationFromShape(shape);
  return presentationToReact(presentation, {
    onPointerDown,
    onPointerMove,
    onPointerLeave,
    onDoubleClick,
  });
}
