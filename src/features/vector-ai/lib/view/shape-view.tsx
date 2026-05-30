import type { ReactElement } from "react";

import type { Shape } from "@/features/vector-ai/lib/document/types";
import { presentationFromShape } from "@/features/vector-ai/lib/view/shape-presentation";
import { presentationToReact } from "@/features/vector-ai/lib/view/presentation-to-react";

export type ShapeViewProps = {
  shape: Shape;
  selected?: boolean;
};

function selectionOutlineProps(selected: boolean | undefined) {
  if (!selected) return {};
  return {
    stroke: "var(--primary)",
    strokeWidth: 2,
    vectorEffect: "non-scaling-stroke" as const,
  };
}

export function ShapeView({ shape, selected }: ShapeViewProps): ReactElement | null {
  const presentation = presentationFromShape(shape);
  return presentationToReact(
    presentation,
    selectionOutlineProps(selected),
  );
}
