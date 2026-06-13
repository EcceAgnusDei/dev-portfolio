"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import type {
  TextShape,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import {
  commitTextEditActions,
  type TextEditCommit,
} from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import { clampTextPlacement } from "@/features/vector-ai/lib/editor/dispatch/create-text";
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
  handleCircleHandlePointerDown,
  handleCubicHandlePointerDown,
  handleLineEndPointerDown,
  handleRectHandlePointerDown,
  handleShapePointerDown,
  shapePointerEventsForTool,
  shouldCapturePointerForSession,
  shouldCommitSessionOnPointerUp,
  updateSessionPointerWorld,
} from "@/features/vector-ai/lib/editor/pointer/handlers";
import type { CubicHandle } from "@/features/vector-ai/lib/document/types";
import { VECTOR_AI_DEFAULT_FONT_SIZE, VECTOR_AI_TEXT_DOUBLE_CLICK_MS } from "@/features/vector-ai/lib/vector-ai-config";
import type {
  CircleResizeHandle,
  LineEnd,
  RectResizeHandle,
} from "@/features/vector-ai/lib/editor/session/types";
import {
  IDLE_POINTER_SESSION,
  type PointerSession,
} from "@/features/vector-ai/lib/editor/session/types";
import {
  beginTextEditSession,
  commitFontSizeFromTextEditSession,
  textEditPreviewFontSize,
  textShapeForEditSession,
  updateTextEditFontSizeDraft,
  type TextEditSession,
} from "@/features/vector-ai/lib/editor/session/text-edit-session";
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
  editingTextId: string | null;
  editingTextShape: TextShape | undefined;
  textEditFontSizeDraft: string | null;
  setTextEditFontSizeDraft: (value: string) => void;
  textEditPreviewFontSize: number | undefined;
  commitTextEdit: (input: TextEditCommit) => void;
  cancelTextEdit: () => void;
  shapePointerEvents: "auto" | "none";
  onSvgPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerCancel: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onShapePointerDown: (shapeId: string, event: ReactPointerEvent) => void;
  onShapeDoubleClick: (shapeId: string, event: ReactMouseEvent) => void;
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
  onRectHandlePointerDown: (
    shapeId: string,
    handle: RectResizeHandle,
    event: ReactPointerEvent,
  ) => void;
  onCircleHandlePointerDown: (
    shapeId: string,
    handle: CircleResizeHandle,
    event: ReactPointerEvent,
  ) => void;
};

export function useVectorInteraction({
  state,
  dispatch,
  svgRef,
}: UseVectorInteractionParams): UseVectorInteractionResult {
  const [session, setSession] = useState<PointerSession>(IDLE_POINTER_SESSION);
  const [textEditSession, setTextEditSession] =
    useState<TextEditSession | null>(null);
  const lastTextPointerDownRef = useRef<{
    shapeId: string;
    time: number;
  } | null>(null);
  const pendingTextEditShapeIdRef = useRef<string | null>(null);
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
      if (current.pointerId !== event.pointerId) return;

      if (current.kind === "create-text") {
        releaseSvgPointer(svgRef.current, event.pointerId);
        const point = clampTextPlacement(
          current.startWorld,
          interactionState.doc.viewBox,
        );
        setTextEditSession(
          beginTextEditSession(
            createShapeId(),
            VECTOR_AI_DEFAULT_FONT_SIZE,
            point,
          ),
        );
        dispatch({ type: "TOOL_SET", tool: "select" });
        setSession(IDLE_POINTER_SESSION);
        return;
      }

      if (!shouldCommitSessionOnPointerUp(current)) return;

      releaseSvgPointer(svgRef.current, event.pointerId);
      const actions = commitSession(interactionState, current);
      dispatchActions(actions);
      setSession(IDLE_POINTER_SESSION);
    },
    [interactionState, dispatchActions, dispatch, svgRef],
  );

  const editingTextId = textEditSession?.shapeId ?? null;
  const textEditFontSizeDraft = textEditSession?.fontSizeDraft ?? null;

  const editingTextShape = useMemo((): TextShape | undefined => {
    if (!textEditSession) return undefined;
    return textShapeForEditSession(textEditSession, state.doc);
  }, [textEditSession, state.doc]);

  const setTextEditFontSizeDraft = useCallback((value: string) => {
    setTextEditSession((prev) =>
      prev ? updateTextEditFontSizeDraft(prev, value) : null,
    );
  }, []);

  const textEditPreviewFontSizeValue = useMemo(() => {
    if (!textEditSession || !editingTextShape) return undefined;
    return textEditPreviewFontSize(textEditSession, editingTextShape.fontSize);
  }, [textEditSession, editingTextShape]);

  const commitTextEdit = useCallback(
    (input: TextEditCommit) => {
      if (!textEditSession) return;

      const fallback = editingTextShape?.fontSize ?? 16;
      const fontSize = commitFontSizeFromTextEditSession(
        textEditSession,
        fallback,
      );

      dispatchActions(
        commitTextEditActions({
          shapeId: textEditSession.shapeId,
          input: {
            ...input,
            fontSize,
          },
          doc: state.doc,
          pendingWorld: textEditSession.world,
        }),
      );
      setTextEditSession(null);
    },
    [dispatchActions, textEditSession, editingTextShape?.fontSize, state.doc],
  );

  const cancelTextEdit = useCallback(() => {
    if (!textEditSession) return;
    const shape = getShapeById(state.doc, textEditSession.shapeId);
    if (shape?.type === "text" && shape.content.length === 0) {
      dispatchActions([{ type: "SHAPE_DELETE", id: textEditSession.shapeId }]);
    }
    setTextEditSession(null);
  }, [dispatchActions, textEditSession, state.doc]);

  const openTextEditor = useCallback(
    (shapeId: string) => {
      const shape = getShapeById(state.doc, shapeId);
      if (shape?.type !== "text") return;

      pendingTextEditShapeIdRef.current = null;
      lastTextPointerDownRef.current = null;
      setSession(IDLE_POINTER_SESSION);
      setTextEditSession(beginTextEditSession(shapeId, shape.fontSize));
      dispatch({ type: "SELECTION_SET", ids: [shapeId] });
    },
    [dispatch, state.doc],
  );

  const onShapeDoubleClick = useCallback(
    (shapeId: string, event: ReactMouseEvent) => {
      const shape = getShapeById(state.doc, shapeId);
      if (shape?.type !== "text" || state.tool !== "select") return;

      event.preventDefault();
      openTextEditor(shapeId);
    },
    [openTextEditor, state.doc, state.tool],
  );

  const onShapePointerDown = useCallback(
    (shapeId: string, event: ReactPointerEvent) => {
      const shape = getShapeById(state.doc, shapeId);
      if (shape?.type === "text" && state.tool === "select") {
        const now = event.timeStamp;
        const last = lastTextPointerDownRef.current;
        if (
          last?.shapeId === shapeId &&
          now - last.time <= VECTOR_AI_TEXT_DOUBLE_CLICK_MS
        ) {
          releaseSvgPointer(svgRef.current, event.pointerId);
          pendingTextEditShapeIdRef.current = shapeId;
          event.stopPropagation();
          lastTextPointerDownRef.current = null;
          return;
        }

        lastTextPointerDownRef.current = { shapeId, time: now };
      } else {
        lastTextPointerDownRef.current = null;
      }

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
    [interactionState, dispatchActions, state.doc, state.tool, svgRef],
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

  const onRectHandlePointerDown = useCallback(
    (shapeId: string, handle: RectResizeHandle, event: ReactPointerEvent) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const result = handleRectHandlePointerDown(
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

  const onCircleHandlePointerDown = useCallback(
    (shapeId: string, handle: CircleResizeHandle, event: ReactPointerEvent) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const result = handleCircleHandlePointerDown(
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
      const ignoreShapeHits =
        shapePointerEventsForTool(interactionState.tool) === "none";
      if (
        !isCanvasBackgroundTarget(event.target, svgRef.current, {
          ignoreShapeHits,
        })
      ) {
        return;
      }

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
      const pendingShapeId = pendingTextEditShapeIdRef.current;
      if (pendingShapeId) {
        pendingTextEditShapeIdRef.current = null;
        releaseSvgPointer(svgRef.current, event.pointerId);
        openTextEditor(pendingShapeId);
        return;
      }

      endSession(event);
    },
    [endSession, openTextEditor, svgRef],
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
    editingTextId,
    editingTextShape,
    textEditFontSizeDraft,
    setTextEditFontSizeDraft,
    textEditPreviewFontSize: textEditPreviewFontSizeValue,
    commitTextEdit,
    cancelTextEdit,
    shapePointerEvents: shapePointerEventsForTool(state.tool),
    onSvgPointerDown,
    onSvgPointerMove,
    onSvgPointerUp,
    onSvgPointerCancel,
    onShapePointerDown,
    onShapeDoubleClick,
    onLineEndPointerDown,
    onCubicHandlePointerDown,
    onRectHandlePointerDown,
    onCircleHandlePointerDown,
  };
}
