import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/core/state";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  commitSession,
  editorInteractionStateFromEditor,
  getDisplayDoc,
  getPreviews,
  handleBackgroundPointerDown,
  handleLineEndPointerDown,
  handleShapePointerDown,
  updateSessionPointerWorld,
} from "@/features/vector-ai/lib/editor/pointer/handlers";
import type { ToolPreviews } from "@/features/vector-ai/lib/editor/preview/overlays";
import type { LineEnd, PointerSession } from "@/features/vector-ai/lib/editor/session/types";
import { IDLE_POINTER_SESSION } from "@/features/vector-ai/lib/editor/session/types";

export type GestureStep =
  | { type: "background-down"; world: WorldPoint; pointerId?: number }
  | { type: "shape-down"; shapeId: string; world: WorldPoint; pointerId?: number }
  | {
      type: "line-end-down";
      shapeId: string;
      end: LineEnd;
      world: WorldPoint;
      pointerId?: number;
    }
  | { type: "move"; world: WorldPoint; pointerId?: number }
  | { type: "up"; pointerId?: number }
  | { type: "undo" }
  | { type: "redo" };

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
  if (step.type === "undo" || step.type === "redo") {
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
      case "move":
        session = updateSessionPointerWorld(session, pointerId, step.world);
        break;
      case "up":
        stepActions = commitSession(interaction, session);
        session = IDLE_POINTER_SESSION;
        break;
      case "undo":
        stepActions = [{ type: "UNDO" }];
        break;
      case "redo":
        stepActions = [{ type: "REDO" }];
        break;
    }

    allActions.push(...stepActions);
    editorState = applyActions(editorState, stepActions);

    snapshots.push({
      session,
      displayDoc: getDisplayDoc(editorInteractionStateFromEditor(editorState), session),
      previews: getPreviews(editorInteractionStateFromEditor(editorState), session),
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
