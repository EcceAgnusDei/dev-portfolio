import {
  VECTOR_AI_DISPLAY_ZOOM_INCREMENT,
  VECTOR_AI_MAX_DISPLAY_ZOOM,
  VECTOR_AI_MIN_DISPLAY_ZOOM,
} from "@/features/vector-ai/lib/vector-ai-config";

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
