import {
  resolveLineEndpointSnap,
  snapToleranceWorldForViewBox,
} from "@/features/vector-ai/lib/editor/geometry/snap";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { DraftStyle } from "@/features/vector-ai/lib/editor/core/draft-style";
import {
  resolveShapeClickSelection,
  movableSelectedIds,
} from "@/features/vector-ai/lib/editor/core/selection";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/editor-queries";
import type {
  EditorAction,
  EditorState,
  EditorTool,
} from "@/features/vector-ai/lib/editor/core/state";
import { commitPointerSession } from "@/features/vector-ai/lib/editor/dispatch/commit-pointer-session";
import { docWithPointerPreview } from "@/features/vector-ai/lib/editor/preview/doc";
import {
  getSessionPreviews,
  type ToolPreviews,
} from "@/features/vector-ai/lib/editor/preview/overlays";
import { advanceCreateCubicSession } from "@/features/vector-ai/lib/editor/session/advance-create-cubic";
import { beginCreateSession } from "@/features/vector-ai/lib/editor/session/begin-create";
import { beginCreateCubicSession } from "@/features/vector-ai/lib/editor/session/begin-create-cubic";
import { beginCreateTextSession } from "@/features/vector-ai/lib/editor/session/begin-create-text";
import {
  beginCircleResizeSession,
  beginCubicHandleMoveSession,
  beginLineEndMoveSession,
  beginMoveSession,
  beginRectResizeSession,
  beginViewBoxResizeSession,
} from "@/features/vector-ai/lib/editor/session/begin-mutate";
import {
  isOnCircleContour,
  resolveCircleResizeHandle,
  resolveRectResizeHandle,
} from "@/features/vector-ai/lib/editor/geometry/resize";
import type {
  CubicHandle,
  LineEnd,
  PointerSession,
  ViewBoxResizeHandle,
} from "@/features/vector-ai/lib/editor/session/types";
import { IDLE_POINTER_SESSION } from "@/features/vector-ai/lib/editor/session/types";
import { updateSessionPointerWorld } from "@/features/vector-ai/lib/editor/session/session-mutations";

export type EditorInteractionState = {
  doc: EditorState["doc"];
  tool: EditorTool;
  draftStyle: DraftStyle;
  selectionIds: string[];
  snapToleranceWorld: number; // pour l'aimantation à la création des lignes
};

export function shapePointerEventsForTool(tool: EditorTool): "auto" | "none" {
  return tool === "select" ? "auto" : "none";
}

export function shouldCapturePointerForSession(
  session: PointerSession,
): boolean {
  return (
    session.kind === "create-rect" ||
    session.kind === "create-circle" ||
    session.kind === "create-line" ||
    session.kind === "create-text" ||
    session.kind === "move" ||
    session.kind === "move-line-end" ||
    session.kind === "move-cubic-handle" ||
    session.kind === "resize-rect" ||
    session.kind === "resize-circle" ||
    session.kind === "resize-viewbox"
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
  return commitPointerSession(session, state.doc, state.draftStyle);
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
    return advanceCreateCubicSession(
      session,
      world,
      state.doc.viewBox,
      state.draftStyle,
    );
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
    const startWorld =
      state.tool === "line"
        ? resolveLineEndpointSnap(world, state.doc, state.snapToleranceWorld)
        : world;
    return {
      session: beginCreateSession(state.tool, startWorld, pointerId),
      actions: [],
    };
  }

  if (state.tool === "cubic") {
    return {
      session: beginCreateCubicSession(world, pointerId),
      actions: [],
    };
  }

  if (state.tool === "text") {
    return {
      session: beginCreateTextSession(world, pointerId),
      actions: [],
    };
  }

  return { session: IDLE_POINTER_SESSION, actions: [] };
}

export type ShapePointerDownOptions = {
  additive?: boolean;
};

function isSoleSelected(
  selectionIds: readonly string[],
  shapeId: string,
): boolean {
  return selectionIds.length === 1 && selectionIds[0] === shapeId;
}

export function handleShapePointerDown(
  state: EditorInteractionState,
  shapeId: string,
  world: WorldPoint,
  pointerId: number,
  options?: ShapePointerDownOptions,
): { session: PointerSession; actions: EditorAction[] } | null {
  if (state.tool !== "select") return null;

  const shape = getShapeById(state.doc, shapeId);
  if (!shape || shape.locked) return null;

  const wasSoleSelected = isSoleSelected(state.selectionIds, shapeId);
  const tolerance = state.snapToleranceWorld;

  if (wasSoleSelected && shape.type === "circle") {
    if (isOnCircleContour(shape, world, tolerance)) {
      const handle = resolveCircleResizeHandle(shape.transform, world);
      return {
        session: beginCircleResizeSession(shape, handle, world, pointerId),
        actions: [{ type: "SELECTION_SET", ids: [shapeId] }],
      };
    }
  }

  const nextIds = resolveShapeClickSelection(
    state.selectionIds,
    shapeId,
    options?.additive ? "toggle" : "replace",
  );
  const stillSelected = nextIds.includes(shapeId);
  const movableIds = movableSelectedIds(state.doc, nextIds);

  return {
    session:
      stillSelected && movableIds.length > 0
        ? beginMoveSession(state.doc, movableIds, world, pointerId)
        : IDLE_POINTER_SESSION,
    actions: [{ type: "SELECTION_SET", ids: nextIds }],
  };
}

export function handleRectResizePointerDown(
  state: EditorInteractionState,
  shapeId: string,
  world: WorldPoint,
  pointerId: number,
): { session: PointerSession; actions: EditorAction[] } | null {
  if (state.tool !== "select") return null;

  const shape = getShapeById(state.doc, shapeId);
  if (!shape || shape.locked || shape.type !== "rect") return null;

  const handle = resolveRectResizeHandle(
    {
      x: shape.transform.x,
      y: shape.transform.y,
      w: shape.w,
      h: shape.h,
    },
    world,
    state.snapToleranceWorld,
  );

  return {
    session: beginRectResizeSession(shape, handle, world, pointerId),
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

export function handleViewBoxHandlePointerDown(
  state: EditorInteractionState,
  handle: ViewBoxResizeHandle,
  world: WorldPoint,
  pointerId: number,
): { session: PointerSession; actions: EditorAction[] } {
  return {
    session: beginViewBoxResizeSession(
      state.doc.viewBox,
      handle,
      world,
      pointerId,
    ),
    actions: [],
  };
}

export function editorInteractionStateFromEditor(
  state: EditorState,
  viewportWidthPx?: number,
): EditorInteractionState {
  const width =
    viewportWidthPx != null && viewportWidthPx > 0
      ? viewportWidthPx
      : state.doc.viewBox.w;
  return {
    doc: state.doc,
    tool: state.tool,
    draftStyle: state.draftStyle,
    selectionIds: state.selection.ids,
    snapToleranceWorld: snapToleranceWorldForViewBox(state.doc.viewBox, width),
  };
}
