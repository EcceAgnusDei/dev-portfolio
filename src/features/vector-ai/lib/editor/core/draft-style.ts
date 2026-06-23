import type { ShapeStyle, ShapeType } from "@/features/vector-ai/lib/document/types";
import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import { VECTOR_AI_INITIAL_DRAFT_STYLE } from "@/features/vector-ai/lib/vector-ai-config";

export type DraftStyle = {
  fill: string;
  stroke: string;
  strokeWidth: number;
};

export type StyleControlVisibility = {
  fill: boolean;
  stroke: boolean;
  strokeWidth: boolean;
};

export type StyleControlContext =
  | { tool: EditorTool }
  | { selectedTypes: ShapeType[] };

const FILL_CAPABLE_TYPES = new Set<ShapeType>(["rect", "circle", "text"]);
const STROKE_CAPABLE_TYPES = new Set<ShapeType>([
  "rect",
  "circle",
  "line",
  "path",
]);

function strokeStyleFromDraft(
  draft: DraftStyle,
): Pick<ShapeStyle, "stroke" | "strokeWidth"> {
  if (draft.stroke === "none") {
    return { stroke: "none" };
  }
  return { stroke: draft.stroke, strokeWidth: draft.strokeWidth };
}

export function createInitialDraftStyle(): DraftStyle {
  return { ...VECTOR_AI_INITIAL_DRAFT_STYLE };
}

export function shapeStyleToDraftStyle(style: ShapeStyle): DraftStyle {
  return {
    fill: style.fill ?? "none",
    stroke: style.stroke ?? "none",
    strokeWidth: style.strokeWidth ?? VECTOR_AI_INITIAL_DRAFT_STYLE.strokeWidth,
  };
}

export function styleForNewShape(tool: EditorTool, draft: DraftStyle): ShapeStyle {
  if (tool === "text") {
    return { fill: draft.fill };
  }

  if (tool === "line" || tool === "cubic") {
    return {
      fill: "none",
      ...strokeStyleFromDraft(draft),
    };
  }

  return {
    fill: draft.fill,
    ...strokeStyleFromDraft(draft),
  };
}

function visibilityForTool(tool: EditorTool): StyleControlVisibility {
  if (tool === "line" || tool === "cubic") {
    return { fill: false, stroke: true, strokeWidth: true };
  }
  if (tool === "text") {
    return { fill: true, stroke: false, strokeWidth: false };
  }
  return { fill: true, stroke: true, strokeWidth: true };
}

function visibilityForSelectedTypes(types: ShapeType[]): StyleControlVisibility {
  return {
    fill: types.some((type) => FILL_CAPABLE_TYPES.has(type)),
    stroke: types.some((type) => STROKE_CAPABLE_TYPES.has(type)),
    strokeWidth: types.some((type) => STROKE_CAPABLE_TYPES.has(type)),
  };
}

export function getStyleControlVisibility(
  context: StyleControlContext,
): StyleControlVisibility {
  if ("selectedTypes" in context) {
    return visibilityForSelectedTypes(context.selectedTypes);
  }
  if (context.tool === "select") {
    return { fill: false, stroke: false, strokeWidth: false };
  }
  return visibilityForTool(context.tool);
}
