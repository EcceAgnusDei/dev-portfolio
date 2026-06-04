import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import { commitCreateCircle } from "@/features/vector-ai/lib/editor/dispatch/create-circle";
import { commitCreateLine } from "@/features/vector-ai/lib/editor/dispatch/create-line";
import { commitCreateRect } from "@/features/vector-ai/lib/editor/dispatch/create-rect";
import { commitSelectMove } from "@/features/vector-ai/lib/editor/dispatch/select-move";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";

export function commitPointerSession(
  session: PointerSession,
  doc: VectorDoc,
): EditorAction[] {
  if (session.kind === "move" || session.kind === "move-line-end") {
    return commitSelectMove(
      session,
      getShapeById(doc, session.shapeId),
      doc.viewBox,
    );
  }

  if (session.kind === "create-rect") {
    return commitCreateRect(session, doc.viewBox);
  }

  if (session.kind === "create-circle") {
    return commitCreateCircle(session, doc.viewBox);
  }

  if (session.kind === "create-line") {
    return commitCreateLine(session, doc.viewBox);
  }

  return [];
}
