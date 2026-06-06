"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { screenToWorld } from "@/features/vector-ai/lib/editor/geometry/screen-to-world";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { CirclePreview } from "@/features/vector-ai/lib/editor/preview/circle";
import type { CubicPathPreview } from "@/features/vector-ai/lib/editor/preview/cubic";
import type { LinePreview } from "@/features/vector-ai/lib/editor/preview/line";
import type { RectPreview } from "@/features/vector-ai/lib/editor/preview/rect";
import type {
  EditorAction,
  EditorState,
  EditorTool,
} from "@/features/vector-ai/lib/editor/core/state";
import { isCanvasBackgroundTarget } from "@/features/vector-ai/lib/editor/pointer/canvas-target";
import {
  captureSvgPointer,
  releaseSvgPointer,
} from "@/features/vector-ai/lib/editor/pointer/capture";
import {
  commitSession,
  editorInteractionStateFromEditor,
  getDisplayDoc,
  getPreviews,
  handleBackgroundPointerDown,
  handleCubicHandlePointerDown,
  handleLineEndPointerDown,
  handleShapePointerDown,
  shapePointerEventsForTool,
  shouldCapturePointerForSession,
  shouldCommitSessionOnPointerUp,
  updateSessionPointerWorld,
} from "@/features/vector-ai/lib/editor/pointer/handlers";
import type { CubicHandle } from "@/features/vector-ai/lib/document/types";
import type { LineEnd } from "@/features/vector-ai/lib/editor/session/types";
import {
  IDLE_POINTER_SESSION,
  type PointerSession,
} from "@/features/vector-ai/lib/editor/session/types";
import { cancelCubicSessionForToolChange } from "@/features/vector-ai/lib/editor/session/session-mutations";

function worldFromEvent(
  svg: SVGSVGElement | null,
  event: ReactPointerEvent,
): WorldPoint | null {
  if (!svg) return null;
  return screenToWorld(svg, event.clientX, event.clientY);
}

export type UseVectorInteractionParams = {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  svgRef: RefObject<SVGSVGElement | null>;
};

export type UseVectorInteractionResult = {
  displayDoc: VectorDoc;
  session: PointerSession;
  setTool: (tool: EditorTool) => void;
  rectPreview: RectPreview | null;
  circlePreview: CirclePreview | null;
  linePreview: LinePreview | null;
  cubicPreview: CubicPathPreview | null;
  shapePointerEvents: "auto" | "none";
  onSvgPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerCancel: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onShapePointerDown: (shapeId: string, event: ReactPointerEvent) => void;
  onLineEndPointerDown: (
    shapeId: string,
    end: LineEnd,
    event: ReactPointerEvent,
  ) => void;
  onCubicHandlePointerDown: (
    shapeId: string,
    handle: CubicHandle,
    event: ReactPointerEvent,
  ) => void;
};

export function useVectorInteraction({
  state,
  dispatch,
  svgRef,
}: UseVectorInteractionParams): UseVectorInteractionResult {
  const [session, setSession] = useState<PointerSession>(IDLE_POINTER_SESSION);
  const sessionRef = useRef(session);
  useLayoutEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const interactionState = useMemo(
    () => editorInteractionStateFromEditor(state),
    [state],
  );

  const setTool = useCallback(
    (tool: EditorTool) => {
      if (tool === state.tool) return;
      setSession((prev) => cancelCubicSessionForToolChange(prev, tool));
      dispatch({ type: "TOOL_SET", tool });
    },
    [dispatch, state.tool],
  );

  const dispatchActions = useCallback(
    (actions: EditorAction[]) => {
      for (const action of actions) {
        dispatch(action);
      }
    },
    [dispatch],
  );

  const endSession = useCallback(
    (event: ReactPointerEvent) => {
      const current = sessionRef.current;
      if (current.kind === "idle") return;
      if (!shouldCommitSessionOnPointerUp(current)) return;
      if (current.pointerId !== event.pointerId) return;

      releaseSvgPointer(svgRef.current, event.pointerId);
      dispatchActions(commitSession(interactionState, current));
      setSession(IDLE_POINTER_SESSION);
    },
    [interactionState, dispatchActions, svgRef],
  );

  const onShapePointerDown = useCallback(
    (shapeId: string, event: ReactPointerEvent) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const result = handleShapePointerDown(
        interactionState,
        shapeId,
        world,
        event.pointerId,
      );
      if (!result) return;

      event.stopPropagation();
      captureSvgPointer(svgRef.current, event.pointerId);
      dispatchActions(result.actions);
      setSession(result.session);
    },
    [interactionState, dispatchActions, svgRef],
  );

  const onLineEndPointerDown = useCallback(
    (shapeId: string, end: LineEnd, event: ReactPointerEvent) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const result = handleLineEndPointerDown(
        interactionState,
        shapeId,
        end,
        world,
        event.pointerId,
      );
      if (!result) return;

      event.stopPropagation();
      captureSvgPointer(svgRef.current, event.pointerId);
      dispatchActions(result.actions);
      setSession(result.session);
    },
    [interactionState, dispatchActions, svgRef],
  );

  const onCubicHandlePointerDown = useCallback(
    (shapeId: string, handle: CubicHandle, event: ReactPointerEvent) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const result = handleCubicHandlePointerDown(
        interactionState,
        shapeId,
        handle,
        world,
        event.pointerId,
      );
      if (!result) return;

      event.stopPropagation();
      captureSvgPointer(svgRef.current, event.pointerId);
      dispatchActions(result.actions);
      setSession(result.session);
    },
    [interactionState, dispatchActions, svgRef],
  );

  const onSvgPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!isCanvasBackgroundTarget(event.target, svgRef.current)) return;

      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const result = handleBackgroundPointerDown(
        interactionState,
        world,
        event.pointerId,
        sessionRef.current,
      );

      if (shouldCapturePointerForSession(result.session)) {
        captureSvgPointer(svgRef.current, event.pointerId);
      }

      dispatchActions(result.actions);
      setSession(result.session);
    },
    [interactionState, dispatchActions, svgRef],
  );

  const onSvgPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      setSession((prev) =>
        updateSessionPointerWorld(prev, event.pointerId, world),
      );
    },
    [svgRef],
  );

  const onSvgPointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      endSession(event);
    },
    [endSession],
  );

  const onSvgPointerCancel = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const current = sessionRef.current;
      if (current.kind === "idle") return;
      if (current.pointerId !== event.pointerId) return;

      releaseSvgPointer(svgRef.current, event.pointerId);
      setSession(IDLE_POINTER_SESSION);
    },
    [svgRef],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sessionRef.current.kind !== "create-cubic") return;
      setSession(IDLE_POINTER_SESSION);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const displayDoc = useMemo(
    () => getDisplayDoc(interactionState, session),
    [interactionState, session],
  );

  const previews = useMemo(
    () => getPreviews(interactionState, session),
    [interactionState, session],
  );

  return {
    displayDoc,
    session,
    setTool,
    rectPreview: previews.rect,
    circlePreview: previews.circle,
    linePreview: previews.line,
    cubicPreview: previews.cubic,
    shapePointerEvents: shapePointerEventsForTool(state.tool),
    onSvgPointerDown,
    onSvgPointerMove,
    onSvgPointerUp,
    onSvgPointerCancel,
    onShapePointerDown,
    onLineEndPointerDown,
    onCubicHandlePointerDown,
  };
}
