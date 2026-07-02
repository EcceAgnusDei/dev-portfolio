import type { CSSProperties } from "react";

import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import {
  VECTOR_AI_DEFAULT_VIEWBOX,
  VECTOR_AI_DISPLAY_ZOOM_INCREMENT,
  VECTOR_AI_MAX_DISPLAY_ZOOM,
  VECTOR_AI_MIN_DISPLAY_ZOOM,
  VECTOR_AI_VIEWBOX_DISPLAY_REM_RATIO,
} from "@/features/vector-ai/lib/vector-ai-config";

function resolveViewBoxDimensions(viewBox: Pick<ViewBox, "w" | "h">) {
  return {
    w: viewBox.w > 0 ? viewBox.w : VECTOR_AI_DEFAULT_VIEWBOX.w,
    h: viewBox.h > 0 ? viewBox.h : VECTOR_AI_DEFAULT_VIEWBOX.h,
  };
}

export function getCanvasBaseRemSize(viewBox: Pick<ViewBox, "w" | "h">) {
  const { w, h } = resolveViewBoxDimensions(viewBox);
  const ratio = VECTOR_AI_VIEWBOX_DISPLAY_REM_RATIO;
  return {
    width: `${w * ratio}rem`,
    height: `${h * ratio}rem`,
  };
}

export function getCanvasDisplayZoomLayout(
  viewBox: Pick<ViewBox, "w" | "h">,
  displayZoom: number,
): {
  viewport: CSSProperties;
  scroll: CSSProperties;
  canvas: CSSProperties;
} {
  const { w, h } = resolveViewBoxDimensions(viewBox);
  const ratio = VECTOR_AI_VIEWBOX_DISPLAY_REM_RATIO;
  const base = getCanvasBaseRemSize(viewBox);
  return {
    viewport: base,
    scroll: {
      width: `${w * ratio * displayZoom}rem`,
      height: `${h * ratio * displayZoom}rem`,
    },
    canvas: {
      ...base,
      transform: displayZoom === 1 ? undefined : `scale(${displayZoom})`,
      transformOrigin: "top left",
    },
  };
}

export function clampDisplayZoom(zoom: number): number {
  return Math.min(
    VECTOR_AI_MAX_DISPLAY_ZOOM,
    Math.max(VECTOR_AI_MIN_DISPLAY_ZOOM, zoom),
  );
}

export function stepDisplayZoom(zoom: number, direction: "in" | "out"): number {
  const delta =
    direction === "in"
      ? VECTOR_AI_DISPLAY_ZOOM_INCREMENT
      : -VECTOR_AI_DISPLAY_ZOOM_INCREMENT;
  return clampDisplayZoom(zoom + delta);
}

export function formatDisplayZoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)} %`;
}

export function canStepDisplayZoomIn(zoom: number): boolean {
  return zoom + VECTOR_AI_DISPLAY_ZOOM_INCREMENT <= VECTOR_AI_MAX_DISPLAY_ZOOM;
}

export function canStepDisplayZoomOut(zoom: number): boolean {
  return zoom - VECTOR_AI_DISPLAY_ZOOM_INCREMENT >= VECTOR_AI_MIN_DISPLAY_ZOOM;
}
