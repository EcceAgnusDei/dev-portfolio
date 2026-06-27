import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import { resizeViewBoxFromHandle } from "@/features/vector-ai/lib/editor/geometry/resize-viewbox";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type {
  PointerSession,
  ViewBoxResizeHandle,
} from "@/features/vector-ai/lib/editor/session/types";
import { VECTOR_AI_MAX_VIEWBOX_DIMENSION } from "@/features/vector-ai/lib/vector-ai-config";

export function parseViewBoxDimensionInput(
  value: string,
  fallback: number,
): number {
  const trimmed = value.trim();
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(VECTOR_AI_MAX_VIEWBOX_DIMENSION, Math.round(n));
}

export type CommitViewBoxSizeInput = {
  widthDraft: string;
  heightDraft: string;
};

export function viewBoxSetActions(
  currentViewBox: ViewBox,
  nextViewBox: ViewBox,
): EditorAction[] {
  if (
    nextViewBox.x === currentViewBox.x &&
    nextViewBox.y === currentViewBox.y &&
    nextViewBox.w === currentViewBox.w &&
    nextViewBox.h === currentViewBox.h
  ) {
    return [];
  }

  return [{ type: "VIEWBOX_SET", viewBox: nextViewBox }];
}

export function commitViewBoxSizeActions(
  currentViewBox: ViewBox,
  input: CommitViewBoxSizeInput,
): EditorAction[] {
  const w = parseViewBoxDimensionInput(input.widthDraft, currentViewBox.w);
  const h = parseViewBoxDimensionInput(input.heightDraft, currentViewBox.h);

  return viewBoxSetActions(currentViewBox, { ...currentViewBox, w, h });
}

function commitViewBoxFromResizeSession(
  startViewBox: ViewBox,
  handle: ViewBoxResizeHandle,
  currentWorld: WorldPoint,
): ViewBox {
  const preview = resizeViewBoxFromHandle(startViewBox, handle, currentWorld);
  return {
    x: preview.x,
    y: preview.y,
    w: Math.round(preview.w),
    h: Math.round(preview.h),
  };
}

export function commitViewBoxResizeSession(
  session: Extract<PointerSession, { kind: "resize-viewbox" }>,
  currentViewBox: ViewBox,
): EditorAction[] {
  const viewBox = commitViewBoxFromResizeSession(
    session.startViewBox,
    session.handle,
    session.currentWorld,
  );

  return viewBoxSetActions(currentViewBox, viewBox);
}
