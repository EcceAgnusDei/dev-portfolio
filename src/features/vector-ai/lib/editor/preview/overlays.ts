import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import type { CirclePreview } from "@/features/vector-ai/lib/editor/geometry/circle-preview";
import type { LinePreview } from "@/features/vector-ai/lib/editor/geometry/line-preview";
import type { RectPreview } from "@/features/vector-ai/lib/editor/geometry/rect-preview";
import { rectPreviewFromDrag } from "@/features/vector-ai/lib/editor/geometry/rect-preview";
import { linePreviewFromDrag } from "@/features/vector-ai/lib/editor/geometry/line-preview";
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
};

export type { CirclePreview, LinePreview, RectPreview };

export function getSessionPreviews(
  session: PointerSession,
  viewBox: ViewBox,
): ToolPreviews {
  const empty: ToolPreviews = { rect: null, circle: null, line: null };

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

  return empty;
}
