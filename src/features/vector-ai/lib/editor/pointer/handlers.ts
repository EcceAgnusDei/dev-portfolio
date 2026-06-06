import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import type {
  EditorAction,
  EditorState,
  EditorTool,
} from "@/features/vector-ai/lib/editor/core/state";
import { commitPointerSession } from "@/features/vector-ai/lib/editor/dispatch/commit-session";
import { docWithPointerPreview } from "@/features/vector-ai/lib/editor/preview/doc";
import {
  getSessionPreviews,
  type ToolPreviews,
} from "@/features/vector-ai/lib/editor/preview/overlays";
import { advanceCreateCubicSession } from "@/features/vector-ai/lib/editor/session/advance-create-cubic";
import { beginCreateSession } from "@/features/vector-ai/lib/editor/session/begin-create";
import { beginCreateCubicSession } from "@/features/vector-ai/lib/editor/session/begin-create-cubic";
import {
  beginCubicHandleMoveSession,
  beginLineEndMoveSession,
  beginMoveSession,
} from "@/features/vector-ai/lib/editor/session/begin-select";
import type {
  CubicHandle,
  LineEnd,
  PointerSession,
} from "@/features/vector-ai/lib/editor/session/types";
import {
  IDLE_POINTER_SESSION,
} from "@/features/vector-ai/lib/editor/session/types";
import { updateSessionPointerWorld } from "@/features/vector-ai/lib/editor/session/session-mutations";

export type EditorInteractionState = {
  doc: EditorState["doc"];
  tool: EditorTool;
};

export function shapePointerEventsForTool(tool: EditorTool): "auto" | "none" {
  return tool === "select" ? "auto" : "none";
}

export function shouldCapturePointerForSession(session: PointerSession): boolean {
  return (
    session.kind === "create-rect" ||
    session.kind === "create-circle" ||
    session.kind === "create-line" ||
    session.kind === "move" ||
    session.kind === "move-line-end" ||
    session.kind === "move-cubic-handle"
  );
}

export function shouldCommitSessionOnPointerUp(
  session: PointerSession,
): boolean {
  return shouldCapturePointerForSession(session);
}

export function getDisplayDoc(
  state: EditorInteractionState,
  session: PointerSession,
) {
  return docWithPointerPreview(state.doc, session);
}

export function getPreviews(
  state: EditorInteractionState,
  session: PointerSession,
): ToolPreviews {
  return getSessionPreviews(session, state.doc.viewBox);
}

export function commitSession(
  state: EditorInteractionState,
  session: PointerSession,
): EditorAction[] {
  return commitPointerSession(session, state.doc);
}

export { updateSessionPointerWorld };

export function handleBackgroundPointerDown(
  state: EditorInteractionState,
  world: WorldPoint,
  pointerId: number,
  session: PointerSession = IDLE_POINTER_SESSION,
): { session: PointerSession; actions: EditorAction[] } {
  if (session.kind === "create-cubic") {
    if (state.tool !== "cubic") {
      return { session: IDLE_POINTER_SESSION, actions: [] };
    }
    return advanceCreateCubicSession(session, world, state.doc.viewBox);
  }

  if (state.tool === "select") {
    return {
      session: IDLE_POINTER_SESSION,
      actions: [{ type: "SELECTION_SET", ids: [] }],
    };
  }

  if (
    state.tool === "rect" ||
    state.tool === "circle" ||
    state.tool === "line"
  ) {
    return {
      session: beginCreateSession(state.tool, world, pointerId),
      actions: [],
    };
  }

  if (state.tool === "cubic") {
    return {
      session: beginCreateCubicSession(world, pointerId),
      actions: [],
    };
  }

  return { session: IDLE_POINTER_SESSION, actions: [] };
}

export function handleShapePointerDown(
  state: EditorInteractionState,
  shapeId: string,
  world: WorldPoint,
  pointerId: number,
): { session: PointerSession; actions: EditorAction[] } | null {
  if (state.tool !== "select") return null;

  const shape = getShapeById(state.doc, shapeId);
  if (!shape || shape.locked) return null;

  return {
    session: beginMoveSession(shape, world, pointerId),
    actions: [{ type: "SELECTION_SET", ids: [shapeId] }],
  };
}

export function handleLineEndPointerDown(
  state: EditorInteractionState,
  shapeId: string,
  end: LineEnd,
  world: WorldPoint,
  pointerId: number,
): { session: PointerSession; actions: EditorAction[] } | null {
  if (state.tool !== "select") return null;

  const shape = getShapeById(state.doc, shapeId);
  if (!shape || shape.locked || shape.type !== "line") return null;

  return {
    session: beginLineEndMoveSession(shape, end, world, pointerId),
    actions: [{ type: "SELECTION_SET", ids: [shapeId] }],
  };
}

export function handleCubicHandlePointerDown(
  state: EditorInteractionState,
  shapeId: string,
  handle: CubicHandle,
  world: WorldPoint,
  pointerId: number,
): { session: PointerSession; actions: EditorAction[] } | null {
  if (state.tool !== "select") return null;

  const shape = getShapeById(state.doc, shapeId);
  if (!shape || shape.locked || shape.type !== "path") return null;

  const session = beginCubicHandleMoveSession(shape, handle, world, pointerId);
  if (!session) return null;

  return {
    session,
    actions: [{ type: "SELECTION_SET", ids: [shapeId] }],
  };
}

export function editorInteractionStateFromEditor(
  state: EditorState,
): EditorInteractionState {
  return { doc: state.doc, tool: state.tool };
}
