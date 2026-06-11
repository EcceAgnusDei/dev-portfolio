import type { MouseEvent, PointerEvent, ReactElement } from "react";

import type { Shape } from "@/features/vector-ai/lib/document/types";
import { presentationFromShape } from "@/features/vector-ai/lib/view/shape-presentation";
import { presentationToReact } from "@/features/vector-ai/lib/view/presentation-to-react";

export type ShapeViewProps = {
  shape: Shape;
  selected?: boolean;
  hidden?: boolean;
  onPointerDown?: (event: PointerEvent) => void;
  onDoubleClick?: (event: MouseEvent) => void;
};

export function ShapeView({
  shape,
  selected,
  hidden,
  onPointerDown,
  onDoubleClick,
}: ShapeViewProps): ReactElement | null {
  if (hidden && shape.type === "text") {
    return null;
  }
  const presentation = presentationFromShape(shape);
  return presentationToReact(presentation, {
    selected,
    onPointerDown,
    onDoubleClick,
  });
}
