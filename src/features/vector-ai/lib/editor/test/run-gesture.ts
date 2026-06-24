import type { CubicHandle } from "@/features/vector-ai/lib/document/types";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import type {
  EditorAction,
  EditorState,
  EditorTool,
} from "@/features/vector-ai/lib/editor/core/state";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  commitSession,
  editorInteractionStateFromEditor,
  getDisplayDoc,
  getPreviews,
  handleBackgroundPointerDown,
  handleCircleHandlePointerDown,
  handleCubicHandlePointerDown,
  handleLineEndPointerDown,
  handleRectHandlePointerDown,
  handleShapePointerDown,
  shouldCommitSessionOnPointerUp,
  updateSessionPointerWorld,
} from "@/features/vector-ai/lib/editor/pointer/handlers";
import type { ToolPreviews } from "@/features/vector-ai/lib/editor/preview/overlays";
import type {
  CircleResizeHandle,
  LineEnd,
  PointerSession,
  RectResizeHandle,
} from "@/features/vector-ai/lib/editor/session/types";
import { IDLE_POINTER_SESSION } from "@/features/vector-ai/lib/editor/session/types";
import { cancelCubicSessionForToolChange } from "@/features/vector-ai/lib/editor/session/session-mutations";
import { deleteShapeActions } from "@/features/vector-ai/lib/editor/dispatch/delete-shape";
import {
  reorderShapeActions,
  type ZOrderCommand,
} from "@/features/vector-ai/lib/editor/dispatch/reorder-shapes";

export type GestureStep =
  | { type: "background-down"; world: WorldPoint; pointerId?: number }
  | {
      type: "shape-down";
      shapeId: string;
      world: WorldPoint;
      pointerId?: number;
      additive?: boolean;
    }
  | {
      type: "line-end-down";
      shapeId: string;
      end: LineEnd;
      world: WorldPoint;
      pointerId?: number;
    }
  | {
      type: "cubic-handle-down";
      shapeId: string;
      handle: CubicHandle;
      world: WorldPoint;
      pointerId?: number;
    }
  | {
      type: "rect-handle-down";
      shapeId: string;
      handle: RectResizeHandle;
      world: WorldPoint;
      pointerId?: number;
    }
  | {
      type: "circle-handle-down";
      shapeId: string;
      handle: CircleResizeHandle;
      world: WorldPoint;
      pointerId?: number;
    }
  | { type: "move"; world: WorldPoint; pointerId?: number }
  | { type: "up"; pointerId?: number }
  | { type: "tool-set"; tool: EditorTool }
  | { type: "cancel-session" }
  | { type: "pointer-cancel"; pointerId?: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "delete-selected" }
  | { type: "reorder-selected"; command: ZOrderCommand };

export type GestureStepSnapshot = {
  session: PointerSession;
  displayDoc: VectorDoc;
  previews: ToolPreviews;
  stepActions: EditorAction[];
};

export type RunGestureResult = {
  state: EditorState;
  session: PointerSession;
  allActions: EditorAction[];
  snapshots: GestureStepSnapshot[];
};

function applyActions(
  state: EditorState,
  actions: EditorAction[],
): EditorState {
  return actions.reduce((s, action) => editorReducer(s, action), state);
}

const DEFAULT_POINTER_ID = 1;

function pointerIdFromStep(step: GestureStep): number {
  if (
    step.type === "undo" ||
    step.type === "redo" ||
    step.type === "tool-set" ||
    step.type === "cancel-session" ||
    step.type === "delete-selected" ||
    step.type === "reorder-selected"
  ) {
    return DEFAULT_POINTER_ID;
  }
  return step.pointerId ?? DEFAULT_POINTER_ID;
}

export function runGesture(
  initialState: EditorState,
  steps: GestureStep[],
): RunGestureResult {
  let editorState = initialState;
  let session: PointerSession = IDLE_POINTER_SESSION;
  const allActions: EditorAction[] = [];
  const snapshots: GestureStepSnapshot[] = [];

  for (const step of steps) {
    const pointerId = pointerIdFromStep(step);
    const interaction = editorInteractionStateFromEditor(editorState);
    let stepActions: EditorAction[] = [];

    switch (step.type) {
      case "background-down": {
        const result = handleBackgroundPointerDown(
          interaction,
          step.world,
          pointerId,
          session,
        );
        session = result.session;
        stepActions = result.actions;
        break;
      }
      case "shape-down": {
        const result = handleShapePointerDown(
          interaction,
          step.shapeId,
          step.world,
          pointerId,
          { additive: step.additive ?? false },
        );
        if (result) {
          session = result.session;
          stepActions = result.actions;
        }
        break;
      }
      case "line-end-down": {
        const result = handleLineEndPointerDown(
          interaction,
          step.shapeId,
          step.end,
          step.world,
          pointerId,
        );
        if (result) {
          session = result.session;
          stepActions = result.actions;
        }
        break;
      }
      case "cubic-handle-down": {
        const result = handleCubicHandlePointerDown(
          interaction,
          step.shapeId,
          step.handle,
          step.world,
          pointerId,
        );
        if (result) {
          session = result.session;
          stepActions = result.actions;
        }
        break;
      }
      case "rect-handle-down": {
        const result = handleRectHandlePointerDown(
          interaction,
          step.shapeId,
          step.handle,
          step.world,
          pointerId,
        );
        if (result) {
          session = result.session;
          stepActions = result.actions;
        }
        break;
      }
      case "circle-handle-down": {
        const result = handleCircleHandlePointerDown(
          interaction,
          step.shapeId,
          step.handle,
          step.world,
          pointerId,
        );
        if (result) {
          session = result.session;
          stepActions = result.actions;
        }
        break;
      }
      case "move":
        session = updateSessionPointerWorld(session, pointerId, step.world);
        break;
      case "up":
        if (session.kind === "create-text") {
          stepActions = [{ type: "TOOL_SET", tool: "select" }];
          session = IDLE_POINTER_SESSION;
          break;
        }
        if (shouldCommitSessionOnPointerUp(session)) {
          stepActions = commitSession(interaction, session);
          session = IDLE_POINTER_SESSION;
        }
        break;
      case "tool-set":
        session = cancelCubicSessionForToolChange(session, step.tool);
        stepActions = [{ type: "TOOL_SET", tool: step.tool }];
        break;
      case "cancel-session":
        session = IDLE_POINTER_SESSION;
        break;
      case "pointer-cancel":
        if (session.kind !== "idle" && session.pointerId === pointerId) {
          session = IDLE_POINTER_SESSION;
        }
        break;
      case "undo":
        stepActions = [{ type: "UNDO" }];
        break;
      case "redo":
        stepActions = [{ type: "REDO" }];
        break;
      case "delete-selected":
        if (editorState.tool === "select") {
          const actions = deleteShapeActions(
            editorState.doc,
            editorState.selection.ids,
          );
          if (actions.length > 0) {
            session = IDLE_POINTER_SESSION;
            stepActions = actions;
          }
        }
        break;
      case "reorder-selected":
        if (editorState.tool === "select") {
          const actions = reorderShapeActions(
            editorState.doc,
            editorState.selection.ids,
            step.command,
          );
          if (actions.length > 0) {
            session = IDLE_POINTER_SESSION;
            stepActions = actions;
          }
        }
        break;
    }

    allActions.push(...stepActions);
    editorState = applyActions(editorState, stepActions);

    snapshots.push({
      session,
      displayDoc: getDisplayDoc(
        editorInteractionStateFromEditor(editorState),
        session,
      ),
      previews: getPreviews(
        editorInteractionStateFromEditor(editorState),
        session,
      ),
      stepActions,
    });
  }

  return { state: editorState, session, allActions, snapshots };
}

export function lastSnapshot(result: RunGestureResult): GestureStepSnapshot {
  const snap = result.snapshots.at(-1);
  if (!snap) {
    throw new Error("runGesture: aucune étape exécutée.");
  }
  return snap;
}

export function actionsOfType(
  actions: EditorAction[],
  type: EditorAction["type"],
): EditorAction[] {
  return actions.filter((a) => a.type === type);
}

export function applyEditorActions(
  state: EditorState,
  actions: EditorAction[],
): EditorState {
  return applyActions(state, actions);
}
