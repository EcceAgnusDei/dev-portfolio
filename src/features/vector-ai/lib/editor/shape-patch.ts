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

export function shapePatchFromMove(before: Shape, after: Shape): ShapePatch {
  const patch: ShapePatch = {};

  if (
    before.transform.x !== after.transform.x ||
    before.transform.y !== after.transform.y
  ) {
    patch.transform = { x: after.transform.x, y: after.transform.y };
  }

  if (before.type === "line" && after.type === "line") {
    if (before.x2 !== after.x2) patch.x2 = after.x2;
    if (before.y2 !== after.y2) patch.y2 = after.y2;
  }

  return patch;
}

export function hasShapePatch(patch: ShapePatch): boolean {
  return patch.transform != null || patch.x2 != null || patch.y2 != null;
}
