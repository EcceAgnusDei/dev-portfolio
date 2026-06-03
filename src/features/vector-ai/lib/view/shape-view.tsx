import type { PointerEvent, ReactElement } from "react";

import type { Shape } from "@/features/vector-ai/lib/document/types";
import { presentationFromShape } from "@/features/vector-ai/lib/view/shape-presentation";
import { presentationToReact } from "@/features/vector-ai/lib/view/presentation-to-react";

export type ShapeViewProps = {
  shape: Shape;
  selected?: boolean;
  onPointerDown?: (event: PointerEvent) => void;
};

export function ShapeView({
  shape,
  selected,
  onPointerDown,
}: ShapeViewProps): ReactElement | null {
  const presentation = presentationFromShape(shape);
  return presentationToReact(presentation, { selected, onPointerDown });
}
