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
import { getShapeById } from "@/features/vector-ai/lib/editor/core/editor-queries";
import {
  getStyleControlState,
  type StyleControlState,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import {
  styleControlPatchActions,
  textEditStylePatchActions,
  type StylePatch,
} from "@/features/vector-ai/lib/editor/dispatch/style-patch-actions";
import {
  commitTextEditActions,
  type TextEditCommit,
} from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import {
  canClearAllShapes,
  canDeleteSelectedShapes,
  clearAllShapesActions,
  deleteShapeActions,
} from "@/features/vector-ai/lib/editor/dispatch/delete-shape";
import {
  canReorderSelectedShapes,
  getZOrderAvailability,
  reorderShapeActions,
  type ZOrderAvailability,
  type ZOrderCommand,
} from "@/features/vector-ai/lib/editor/dispatch/reorder-shapes";
import { clampTextPlacement } from "@/features/vector-ai/lib/editor/dispatch/create-text";
import {
  cursorForRectResizeAtWorld,
  cursorForSelectedShapeAtWorld,
} from "@/features/vector-ai/lib/editor/geometry/resize";
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
  handleRectResizePointerDown,
  handleShapePointerDown,
  handleViewBoxHandlePointerDown,
  shapePointerEventsForTool,
  shouldCapturePointerForSession,
  shouldCommitSessionOnPointerUp,
  updateSessionPointerWorld,
} from "@/features/vector-ai/lib/editor/pointer/handlers";
import type { CubicHandle } from "@/features/vector-ai/lib/document/types";
import {
  VECTOR_AI_DEFAULT_FONT_SIZE,
  VECTOR_AI_TEXT_DOUBLE_CLICK_MS,
} from "@/features/vector-ai/lib/vector-ai-config";
import type {
  LineEnd,
  ViewBoxResizeHandle,
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
import {
  isTextEditLayerElement,
  isTextEditLayerFocused,
  isTextEditUiFocused,
} from "@/features/vector-ai/lib/editor/session/text-edit-focus";

function worldFromEvent(
  svg: SVGSVGElement | null,
  event: ReactPointerEvent,
): WorldPoint | null {
  if (!svg) return null;
  return screenToWorld(svg, event.clientX, event.clientY);
}

export type ShapePointerRegion = "body" | "resize-contour";

export type UseVectorInteractionParams = {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  svgRef: RefObject<SVGSVGElement | null>;
  viewBoxHandlesVisible?: boolean;
  aiPending?: boolean;
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
  registerTextEditDraftGetter: (getter: (() => string) | null) => void;
  commitTextEditOnFontSizeBlur: (
    fontSize: number,
    relatedTarget: EventTarget | null,
  ) => void;
  commitTextEdit: (input: TextEditCommit) => void;
  cancelTextEdit: () => void;
  clearTextEditSession: () => void;
  cancelPointerSession: () => void;
  canDeleteSelectedShape: boolean;
  deleteSelectedShape: () => void;
  canClearAllShapes: boolean;
  clearAllShapes: () => void;
  canReorderSelectedShapes: boolean;
  zOrderAvailability: ZOrderAvailability;
  reorderSelectedShapes: (command: ZOrderCommand) => void;
  styleControl: StyleControlState;
  applyStyleControlPatch: (patch: StylePatch) => void;
  shapePointerEvents: "auto" | "none";
  snapToleranceWorld: number;
  onSvgPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerCancel: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onShapePointerDown: (
    shapeId: string,
    event: ReactPointerEvent,
    region?: ShapePointerRegion,
  ) => void;
  onShapePointerMove: (
    shapeId: string,
    event: ReactPointerEvent,
    region?: ShapePointerRegion,
  ) => void;
  onShapePointerLeave: (event: ReactPointerEvent) => void;
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
  onViewBoxHandlePointerDown?: (
    handle: ViewBoxResizeHandle,
    event: ReactPointerEvent,
  ) => void;
};

export function useVectorInteraction({
  state,
  dispatch,
  svgRef,
  viewBoxHandlesVisible = false,
  aiPending = false,
}: UseVectorInteractionParams): UseVectorInteractionResult {
  const [session, setSession] = useState<PointerSession>(IDLE_POINTER_SESSION);
  const [textEditSession, setTextEditSession] =
    useState<TextEditSession | null>(null);
  const lastTextPointerDownRef = useRef<{
    shapeId: string;
    time: number;
  } | null>(null);
  const pendingTextEditShapeIdRef = useRef<string | null>(null);
  const textEditSessionRef = useRef(textEditSession);
  const textEditDraftGetterRef = useRef<(() => string) | null>(null);
  const sessionRef = useRef(session);
  useLayoutEffect(() => {
    textEditSessionRef.current = textEditSession;
  }, [textEditSession]);
  useLayoutEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const interactionState = useMemo(
    () => editorInteractionStateFromEditor(state),
    [state],
  );

  const interactionStateAtPointer = useCallback(() => {
    return editorInteractionStateFromEditor(
      state,
      svgRef.current?.clientWidth ?? undefined,
    );
  }, [state, svgRef]);

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

  const cancelPointerSession = useCallback(() => {
    const current = sessionRef.current;
    if (current.kind !== "idle") {
      releaseSvgPointer(svgRef.current, current.pointerId);
      setSession(IDLE_POINTER_SESSION);
    }
    lastTextPointerDownRef.current = null;
    pendingTextEditShapeIdRef.current = null;
  }, [svgRef]);

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
    return textShapeForEditSession(
      textEditSession,
      state.doc,
      state.draftStyle,
    );
  }, [textEditSession, state.doc, state.draftStyle]);

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
      const fontSize =
        input.fontSize ??
        commitFontSizeFromTextEditSession(textEditSession, fallback);

      dispatchActions(
        commitTextEditActions({
          shapeId: textEditSession.shapeId,
          input: {
            ...input,
            fontSize,
          },
          doc: state.doc,
          pendingWorld: textEditSession.world,
          draftStyle: state.draftStyle,
        }),
      );
      setTextEditSession(null);
    },
    [
      dispatchActions,
      textEditSession,
      editingTextShape?.fontSize,
      state.doc,
      state.draftStyle,
    ],
  );

  const registerTextEditDraftGetter = useCallback(
    (getter: (() => string) | null) => {
      textEditDraftGetterRef.current = getter;
    },
    [],
  );

  const commitTextEditOnFontSizeBlur = useCallback(
    (fontSize: number, relatedTarget: EventTarget | null) => {
      window.setTimeout(() => {
        const session = textEditSessionRef.current;
        if (!session) return;
        if (isTextEditLayerElement(relatedTarget)) return;
        if (isTextEditLayerFocused()) return;

        const getDraft = textEditDraftGetterRef.current;
        if (!getDraft) return;

        dispatchActions(
          commitTextEditActions({
            shapeId: session.shapeId,
            input: {
              content: getDraft(),
              fontSize,
            },
            doc: state.doc,
            pendingWorld: session.world,
            draftStyle: state.draftStyle,
          }),
        );
        setTextEditSession(null);
      }, 0);
    },
    [dispatchActions, state.doc, state.draftStyle],
  );

  const cancelTextEdit = useCallback(() => {
    if (!textEditSession) return;
    const shape = getShapeById(state.doc, textEditSession.shapeId);
    if (shape?.type === "text" && shape.content.length === 0) {
      dispatchActions(deleteShapeActions(state.doc, [textEditSession.shapeId]));
    }
    setTextEditSession(null);
  }, [dispatchActions, textEditSession, state.doc]);

  const clearTextEditSession = useCallback(() => {
    setTextEditSession(null);
    setSession(IDLE_POINTER_SESSION);
    pendingTextEditShapeIdRef.current = null;
    lastTextPointerDownRef.current = null;
  }, []);

  const canDeleteSelectedShape = useMemo(() => {
    if (state.tool !== "select") return false;
    if (textEditSession !== null) return false;
    return canDeleteSelectedShapes(state.doc, state.selection.ids);
  }, [state.tool, state.doc, textEditSession, state.selection.ids]);

  const deleteSelectedShape = useCallback(() => {
    if (state.tool !== "select") return;
    if (textEditSession !== null) return;
    if (isTextEditUiFocused()) return;
    if (!canDeleteSelectedShapes(state.doc, state.selection.ids)) return;

    if (sessionRef.current.kind !== "idle") {
      setSession(IDLE_POINTER_SESSION);
    }

    dispatchActions(deleteShapeActions(state.doc, state.selection.ids));
  }, [
    state.tool,
    state.doc,
    state.selection.ids,
    textEditSession,
    dispatchActions,
  ]);

  const canClearCanvas = useMemo(
    () => canClearAllShapes(state.doc),
    [state.doc],
  );

  const clearAllShapes = useCallback(() => {
    if (!canClearAllShapes(state.doc)) return;

    if (textEditSession !== null) {
      setTextEditSession(null);
    }

    if (sessionRef.current.kind !== "idle") {
      setSession(IDLE_POINTER_SESSION);
    }

    dispatchActions(clearAllShapesActions(state.doc));
  }, [state.doc, textEditSession, dispatchActions]);

  const canReorderSelected = useMemo(() => {
    if (state.tool !== "select") return false;
    if (textEditSession !== null) return false;
    return canReorderSelectedShapes(state.doc, state.selection.ids);
  }, [state.tool, state.doc, state.selection.ids, textEditSession]);

  const zOrderAvailability = useMemo(
    () => getZOrderAvailability(state.doc, state.selection.ids),
    [state.doc, state.selection.ids],
  );

  const reorderSelectedShapes = useCallback(
    (command: ZOrderCommand) => {
      if (state.tool !== "select") return;
      if (textEditSession !== null) return;
      if (isTextEditUiFocused()) return;

      if (sessionRef.current.kind !== "idle") {
        setSession(IDLE_POINTER_SESSION);
      }

      dispatchActions(
        reorderShapeActions(state.doc, state.selection.ids, command),
      );
    },
    [
      state.tool,
      state.doc,
      state.selection.ids,
      textEditSession,
      dispatchActions,
    ],
  );

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
    (
      shapeId: string,
      event: ReactPointerEvent,
      region: ShapePointerRegion = "body",
    ) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      if (region === "resize-contour") {
        const result = handleRectResizePointerDown(
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
        return;
      }

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

      const result = handleShapePointerDown(
        interactionState,
        shapeId,
        world,
        event.pointerId,
        { additive: event.ctrlKey || event.metaKey },
      );
      if (!result) return;

      event.stopPropagation();
      if (shouldCapturePointerForSession(result.session)) {
        captureSvgPointer(svgRef.current, event.pointerId);
      }
      dispatchActions(result.actions);
      setSession(result.session);
    },
    [interactionState, dispatchActions, state.doc, state.tool, svgRef],
  );

  const onShapePointerMove = useCallback(
    (
      shapeId: string,
      event: ReactPointerEvent,
      region: ShapePointerRegion = "body",
    ) => {
      if (state.tool !== "select") return;

      const shape = getShapeById(state.doc, shapeId);
      if (!shape) return;

      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const target = event.currentTarget as SVGElement;

      if (region === "resize-contour") {
        if (shape.type !== "rect") return;
        target.style.cursor = cursorForRectResizeAtWorld(
          {
            x: shape.transform.x,
            y: shape.transform.y,
            w: shape.w,
            h: shape.h,
          },
          world,
          interactionState.snapToleranceWorld,
        );
        return;
      }

      if (shape.type !== "circle") return;

      const isSoleSelected =
        state.selection.ids.length === 1 && state.selection.ids[0] === shapeId;
      if (!isSoleSelected) return;

      target.style.cursor = cursorForSelectedShapeAtWorld(
        shape,
        world,
        interactionState.snapToleranceWorld,
      );
    },
    [
      interactionState.snapToleranceWorld,
      state.doc,
      state.selection.ids,
      state.tool,
      svgRef,
    ],
  );

  const onShapePointerLeave = useCallback((event: ReactPointerEvent) => {
    (event.currentTarget as SVGElement).style.cursor = "";
  }, []);

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

  const onViewBoxHandlePointerDown = useCallback(
    (handle: ViewBoxResizeHandle, event: ReactPointerEvent) => {
      if (textEditSessionRef.current) return;

      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const result = handleViewBoxHandlePointerDown(
        interactionState,
        handle,
        world,
        event.pointerId,
      );

      event.stopPropagation();
      captureSvgPointer(svgRef.current, event.pointerId);
      dispatchActions(result.actions);
      setSession(result.session);
    },
    [interactionState, dispatchActions, svgRef],
  );

  const onSvgPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const interaction = interactionStateAtPointer();
      const ignoreShapeHits =
        shapePointerEventsForTool(interaction.tool) === "none";
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
        interaction,
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
    [interactionStateAtPointer, dispatchActions, svgRef],
  );

  const onSvgPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      const interaction = interactionStateAtPointer();
      setSession((prev) =>
        updateSessionPointerWorld(prev, event.pointerId, world, interaction),
      );
    },
    [interactionStateAtPointer, svgRef],
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
      if (event.key === "Escape") {
        if (sessionRef.current.kind === "create-cubic") {
          setSession(IDLE_POINTER_SESSION);
        }
        return;
      }

      if (event.key !== "Delete") return;

      if (state.tool !== "select") return;
      if (textEditSession !== null) return;
      if (isTextEditUiFocused()) return;
      if (!canDeleteSelectedShapes(state.doc, state.selection.ids)) return;

      if (sessionRef.current.kind !== "idle") {
        setSession(IDLE_POINTER_SESSION);
      }

      event.preventDefault();
      dispatchActions(deleteShapeActions(state.doc, state.selection.ids));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    state.tool,
    state.doc,
    state.selection.ids,
    textEditSession,
    dispatchActions,
  ]);

  const displayDoc = useMemo(
    () => getDisplayDoc(interactionState, session),
    [interactionState, session],
  );

  const previews = useMemo(
    () => getPreviews(interactionState, session),
    [interactionState, session],
  );

  const styleControl = useMemo(
    () => getStyleControlState(state, editingTextShape),
    [state, editingTextShape],
  );

  const applyStyleControlPatch = useCallback(
    (patch: StylePatch) => {
      if (textEditSession) {
        dispatchActions(
          textEditStylePatchActions(state, textEditSession.shapeId, patch),
        );
        return;
      }
      dispatchActions(styleControlPatchActions(state, patch));
    },
    [dispatchActions, state, textEditSession],
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
    registerTextEditDraftGetter,
    commitTextEditOnFontSizeBlur,
    commitTextEdit,
    cancelTextEdit,
    clearTextEditSession,
    cancelPointerSession,
    canDeleteSelectedShape,
    deleteSelectedShape,
    canClearAllShapes: canClearCanvas,
    clearAllShapes,
    canReorderSelectedShapes: canReorderSelected,
    zOrderAvailability,
    reorderSelectedShapes,
    styleControl,
    applyStyleControlPatch,
    shapePointerEvents:
      viewBoxHandlesVisible ||
      session.kind === "resize-viewbox" ||
      shapePointerEventsForTool(state.tool) === "none"
        ? "none"
        : "auto",
    snapToleranceWorld: interactionState.snapToleranceWorld,
    onSvgPointerDown,
    onSvgPointerMove,
    onSvgPointerUp,
    onSvgPointerCancel,
    onShapePointerDown,
    onShapePointerMove,
    onShapePointerLeave,
    onShapeDoubleClick,
    onLineEndPointerDown,
    onCubicHandlePointerDown,
    onViewBoxHandlePointerDown:
      (viewBoxHandlesVisible || session.kind === "resize-viewbox") && !aiPending
        ? onViewBoxHandlePointerDown
        : undefined,
  };
}
