import type { Shape, ShapeBase } from "@/features/vector-ai/lib/document/types";
import type { ShapePatch } from "@/features/vector-ai/lib/editor/core/state";

function patchShapeBase(shape: ShapeBase, patch: ShapePatch): ShapeBase {
  return {
    ...shape,
    transform: patch.transform
      ? { ...shape.transform, ...patch.transform }
      : shape.transform,
    style: patch.style ? { ...shape.style, ...patch.style } : shape.style,
    ...(patch.locked !== undefined ? { locked: patch.locked } : {}),
    ...(patch.name !== undefined ? { name: patch.name } : {}),
  };
}

export function applyShapePatch(shape: Shape, patch: ShapePatch): Shape {
  if (shape.type === "rect") {
    return {
      ...patchShapeBase(shape, patch),
      type: "rect",
      w: patch.w ?? shape.w,
      h: patch.h ?? shape.h,
      ...(patch.rx !== undefined ? { rx: patch.rx } : shape.rx !== undefined ? { rx: shape.rx } : {}),
    };
  }

  if (shape.type === "circle") {
    return {
      ...patchShapeBase(shape, patch),
      type: "circle",
      r: patch.r ?? shape.r,
    };
  }

  if (shape.type === "line") {
    return {
      ...patchShapeBase(shape, patch),
      type: "line",
      x2: patch.x2 ?? shape.x2,
      y2: patch.y2 ?? shape.y2,
    };
  }

  if (shape.type === "path") {
    return {
      ...patchShapeBase(shape, patch),
      type: "path",
      segments: patch.segments ?? shape.segments,
    };
  }

  if (shape.type === "text") {
    return {
      ...patchShapeBase(shape, patch),
      type: "text",
      content: patch.content ?? shape.content,
      fontSize: patch.fontSize ?? shape.fontSize,
      fontFamily: patch.fontFamily ?? shape.fontFamily,
    };
  }

  const _exhaustive: never = shape;
  return _exhaustive;
}

export function shapePatchFromMove(before: Shape, after: Shape): ShapePatch {
  const patch: ShapePatch = {};

  if (
    before.transform.x !== after.transform.x ||
    before.transform.y !== after.transform.y
  ) {
    patch.transform = { x: after.transform.x, y: after.transform.y };
  }

  if (before.type === "rect" && after.type === "rect") {
    if (before.w !== after.w) patch.w = after.w;
    if (before.h !== after.h) patch.h = after.h;
  }

  if (before.type === "circle" && after.type === "circle") {
    if (before.r !== after.r) patch.r = after.r;
  }

  if (before.type === "line" && after.type === "line") {
    if (before.x2 !== after.x2) patch.x2 = after.x2;
    if (before.y2 !== after.y2) patch.y2 = after.y2;
  }

  if (before.type === "path" && after.type === "path") {
    if (JSON.stringify(before.segments) !== JSON.stringify(after.segments)) {
      patch.segments = after.segments;
    }
  }

  return patch;
}

export function hasShapePatch(patch: ShapePatch): boolean {
  return (
    patch.transform != null ||
    patch.style != null ||
    patch.locked != null ||
    patch.name != null ||
    patch.w != null ||
    patch.h != null ||
    patch.rx != null ||
    patch.r != null ||
    patch.x2 != null ||
    patch.y2 != null ||
    patch.segments != null ||
    patch.content != null ||
    patch.fontSize != null ||
    patch.fontFamily != null
  );
}
