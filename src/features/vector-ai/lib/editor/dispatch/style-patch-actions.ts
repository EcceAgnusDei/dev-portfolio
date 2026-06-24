import type {
  Shape,
  ShapeStyle,
} from "@/features/vector-ai/lib/document/types";
import type { DraftStyle } from "@/features/vector-ai/lib/editor/core/draft-style";
import {
  getSelectedShapes,
  getShapeById,
  resolveStyleControlsMode,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
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
  if (state.tool !== "select") return [];

  const actions: EditorAction[] = [];
  for (const shape of getSelectedShapes(state)) {
    if (shape.locked) continue;

    const stylePatch = buildStylePatchForShape(shape, patch);
    if (!stylePatch) continue;

    actions.push({
      type: "SHAPE_UPDATE",
      id: shape.id,
      patch: { style: stylePatch },
      recordHistory: actions.length === 0 ? undefined : false,
    });
  }
  return actions;
}

export function textEditStylePatchActions(
  state: EditorState,
  shapeId: string,
  patch: StylePatch,
): EditorAction[] {
  const existing = getShapeById(state.doc, shapeId);
  if (existing?.type === "text") {
    return applyStyleToSelectedShape(
      {
        ...state,
        tool: "select",
        selection: { ids: [shapeId] },
      },
      patch,
    );
  }

  if (patch.fill !== undefined) {
    return [{ type: "DRAFT_STYLE_SET", draftStyle: { fill: patch.fill } }];
  }

  return [];
}

export function styleControlPatchActions(
  state: EditorState,
  patch: StylePatch,
): EditorAction[] {
  const mode = resolveStyleControlsMode(state);
  if (mode === "selection") {
    return applyStyleToSelectedShape(state, patch);
  }
  if (mode === "draft") {
    return [{ type: "DRAFT_STYLE_SET", draftStyle: patch }];
  }
  return [];
}
