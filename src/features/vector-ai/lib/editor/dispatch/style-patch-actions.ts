import type {
  Shape,
  ShapeStyle,
} from "@/features/vector-ai/lib/document/types";
import type { DraftStyle } from "@/features/vector-ai/lib/editor/core/draft-style";
import {
  getEditableSelectedShape,
  resolveStyleControlsMode,
} from "@/features/vector-ai/lib/editor/core/selectors";
import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/core/state";
import { VECTOR_AI_INITIAL_DRAFT_STYLE } from "@/features/vector-ai/lib/vector-ai-config";

export type StylePatch = Partial<DraftStyle>;

function defaultStrokeWidth(shape: Shape): number {
  return shape.style.strokeWidth ?? VECTOR_AI_INITIAL_DRAFT_STYLE.strokeWidth;
}

function appendStrokePatch(
  result: Partial<ShapeStyle>,
  shape: Shape,
  patch: StylePatch,
): void {
  if (patch.stroke === undefined && patch.strokeWidth === undefined) return;

  const nextStroke = patch.stroke ?? shape.style.stroke ?? "none";

  if (patch.stroke !== undefined) {
    result.stroke = patch.stroke;
  }

  if (nextStroke === "none") return;

  if (patch.strokeWidth !== undefined) {
    result.strokeWidth = patch.strokeWidth;
    return;
  }

  if (patch.stroke !== undefined && shape.style.stroke === "none") {
    result.strokeWidth = defaultStrokeWidth(shape);
  }
}

function buildStylePatchForShape(
  shape: Shape,
  patch: StylePatch,
): Partial<ShapeStyle> | null {
  const result: Partial<ShapeStyle> = {};

  if (shape.type === "text") {
    if (patch.fill !== undefined) {
      result.fill = patch.fill;
    }
  } else if (shape.type === "line" || shape.type === "path") {
    appendStrokePatch(result, shape, patch);
  } else {
    if (patch.fill !== undefined) {
      result.fill = patch.fill;
    }
    appendStrokePatch(result, shape, patch);
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function applyStyleToSelectedShape(
  state: EditorState,
  patch: StylePatch,
): EditorAction[] {
  const shape = getEditableSelectedShape(state);
  if (!shape || shape.locked) return [];

  const stylePatch = buildStylePatchForShape(shape, patch);
  if (!stylePatch) return [];

  return [
    {
      type: "SHAPE_UPDATE",
      id: shape.id,
      patch: { style: stylePatch },
      recordHistory: true,
    },
  ];
}

export function styleControlPatchActions(
  state: EditorState,
  patch: StylePatch,
): EditorAction[] {
  if (resolveStyleControlsMode(state) === "selection") {
    return applyStyleToSelectedShape(state, patch);
  }
  return [{ type: "DRAFT_STYLE_SET", draftStyle: patch }];
}
