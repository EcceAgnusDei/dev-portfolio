import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import type { CirclePreview } from "@/features/vector-ai/lib/editor/preview/circle";
import {
  cubicPathPreviewFromPlacement,
  type CubicPathPreview,
} from "@/features/vector-ai/lib/editor/preview/cubic";
import type { LinePreview } from "@/features/vector-ai/lib/editor/preview/line";
import type { RectPreview } from "@/features/vector-ai/lib/editor/preview/rect";
import { linePreviewFromDrag } from "@/features/vector-ai/lib/editor/preview/line";
import { rectPreviewFromDrag } from "@/features/vector-ai/lib/editor/preview/rect";
import {
  clampCirclePreviewFromAnchor,
  clampLinePreviewToViewBox,
  clampRectPreviewToViewBox,
} from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

export type ToolPreviews = {
  rect: RectPreview | null;
  circle: CirclePreview | null;
  line: LinePreview | null;
  cubic: CubicPathPreview | null;
};

export type { CirclePreview, CubicPathPreview, LinePreview, RectPreview };

export function getSessionPreviews(
  session: PointerSession,
  viewBox: ViewBox,
): ToolPreviews {
  const empty: ToolPreviews = {
    rect: null,
    circle: null,
    line: null,
    cubic: null,
  };

  if (session.kind === "create-rect") {
    return {
      ...empty,
      rect: clampRectPreviewToViewBox(
        rectPreviewFromDrag(session.startWorld, session.currentWorld),
        viewBox,
      ),
    };
  }

  if (session.kind === "create-circle") {
    return {
      ...empty,
      circle: clampCirclePreviewFromAnchor(
        session.startWorld,
        session.currentWorld,
        viewBox,
      ),
    };
  }

  if (session.kind === "create-line") {
    return {
      ...empty,
      line: clampLinePreviewToViewBox(
        linePreviewFromDrag(session.startWorld, session.currentWorld),
        viewBox,
      ),
    };
  }

  if (session.kind === "create-cubic") {
    return {
      ...empty,
      cubic: cubicPathPreviewFromPlacement(
        session.placed,
        session.hover,
        session.step,
        viewBox,
      ),
    };
  }

  return empty;
}
