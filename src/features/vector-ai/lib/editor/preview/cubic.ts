import type {
  CubicCreateStep,
  CubicWorldPoints,
  ViewBox,
} from "@/features/vector-ai/lib/document/types";
import { cubicWorldToLocalSegments } from "@/features/vector-ai/lib/editor/geometry/path-segments";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  clampCubicWorldPoints,
  clampPartialCubicWorld,
  clampPointToViewBox,
} from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import { segmentsToPathD } from "@/features/vector-ai/lib/view/segments-to-path-d";

export type CubicPreviewKind =
  | "anchor-p0"
  | "segment-p0-hover"
  | "segment-p0-c1-hover"
  | "curve-p0-c1-c2-hover"
  | "curve-complete";

export type CubicPathPreview = {
  transform: { x: number; y: number };
  d: string;
  kind: CubicPreviewKind;
};

export function cubicPreviewKindForStep(
  step: CubicCreateStep,
  hasHover: boolean,
): CubicPreviewKind {
  if (step === 1) return hasHover ? "anchor-p0" : "anchor-p0";
  if (step === 2) return "segment-p0-hover";
  if (step === 3) return "segment-p0-c1-hover";
  if (step === 4) return hasHover ? "curve-p0-c1-c2-hover" : "curve-complete";
  return "curve-complete";
}

export function cubicWorldForPreview(
  placed: Partial<CubicWorldPoints>,
  hover: WorldPoint | null,
  step: CubicCreateStep,
): CubicWorldPoints | null {
  if (!placed.p0) return null;
  if (step === 2) {
    if (!hover) return null;
    return {
      p0: placed.p0,
      c1: hover,
      c2: hover,
      p3: hover,
    };
  }
  if (step === 3) {
    if (!placed.c1 || !hover) return null;
    return {
      p0: placed.p0,
      c1: placed.c1,
      c2: hover,
      p3: hover,
    };
  }
  if (step === 4) {
    if (!placed.c1 || !placed.c2) return null;
    const p3 = hover ?? placed.p3;
    if (!p3) return null;
    return {
      p0: placed.p0,
      c1: placed.c1,
      c2: placed.c2,
      p3,
    };
  }
  return null;
}

export function cubicPathPreviewFromWorld(
  world: CubicWorldPoints,
  kind: CubicPreviewKind,
): CubicPathPreview {
  return {
    transform: { x: world.p0.x, y: world.p0.y },
    d: segmentsToPathD(cubicWorldToLocalSegments(world)),
    kind,
  };
}

export function cubicPathPreviewFromPlacement(
  placed: Partial<CubicWorldPoints>,
  hover: WorldPoint | null,
  step: CubicCreateStep,
  viewBox?: ViewBox,
): CubicPathPreview | null {
  const resolvedPlaced = viewBox ? clampPartialCubicWorld(placed, viewBox) : placed;
  const resolvedHover =
    hover && viewBox ? clampPointToViewBox(hover, viewBox) : hover;
  const world = cubicWorldForPreview(resolvedPlaced, resolvedHover, step);
  if (!world) return null;
  const clampedWorld = viewBox ? clampCubicWorldPoints(world, viewBox) : world;
  return cubicPathPreviewFromWorld(
    clampedWorld,
    cubicPreviewKindForStep(step, resolvedHover != null),
  );
}
