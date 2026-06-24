import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import type { DraftStyle } from "@/features/vector-ai/lib/editor/core/draft-style";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import { commitCreateCircle } from "@/features/vector-ai/lib/editor/dispatch/create-circle";
import { commitCreateLine } from "@/features/vector-ai/lib/editor/dispatch/create-line";
import { commitCreateRect } from "@/features/vector-ai/lib/editor/dispatch/create-rect";
import { commitMoveSession } from "@/features/vector-ai/lib/editor/dispatch/mutate-move";
import { commitMutateResize } from "@/features/vector-ai/lib/editor/dispatch/mutate-resize";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

export function commitPointerSession(
  session: PointerSession,
  doc: VectorDoc,
  draftStyle: DraftStyle,
): EditorAction[] {
  if (
    session.kind === "move" ||
    session.kind === "move-line-end" ||
    session.kind === "move-cubic-handle"
  ) {
    return commitMoveSession(session, doc);
  }

  if (session.kind === "resize-rect" || session.kind === "resize-circle") {
    return commitMutateResize(
      session,
      getShapeById(doc, session.shapeId),
      doc.viewBox,
    );
  }

  if (session.kind === "create-rect") {
    return commitCreateRect(session, doc.viewBox, draftStyle);
  }

  if (session.kind === "create-circle") {
    return commitCreateCircle(session, doc.viewBox, draftStyle);
  }

  if (session.kind === "create-line") {
    return commitCreateLine(session, doc.viewBox, draftStyle);
  }

  return [];
}
