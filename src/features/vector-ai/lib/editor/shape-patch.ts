import type { Shape } from "@/features/vector-ai/lib/document/types";
import type { ShapePatch } from "@/features/vector-ai/lib/editor/state";

export function applyShapePatch(shape: Shape, patch: ShapePatch): Shape {
  const next = {
    ...shape,
    ...patch,
    transform: patch.transform
      ? { ...shape.transform, ...patch.transform }
      : shape.transform,
    style: patch.style ? { ...shape.style, ...patch.style } : shape.style,
  };
  return next as Shape;
}
