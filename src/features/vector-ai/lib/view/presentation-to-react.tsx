import { createElement, type ReactElement } from "react";

import type { ShapePresentation } from "@/features/vector-ai/lib/view/shape-presentation";

export function presentationToReact(
  presentation: ShapePresentation,
  extraAttrs?: Record<string, unknown>,
): ReactElement {
  const node = createElement(presentation.tag, {
    ...presentation.attrs,
    ...extraAttrs,
  });

  if (!presentation.groupTransform) return node;

  return createElement(
    "g",
    { transform: presentation.groupTransform },
    node,
  );
}
