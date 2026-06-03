"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import type { RectShape, Shape, VectorDoc } from "@/features/vector-ai/lib/document/types";
import type { LineEnd } from "@/features/vector-ai/lib/editor/pointer/pointer-session";
import {
  shapeAfterPointerSession,
  docWithPointerPreview,
} from "@/features/vector-ai/lib/editor/pointer/doc-with-pointer-preview";
import {
  clampRectPreviewToViewBox,
} from "@/features/vector-ai/lib/editor/clamp-to-viewbox";
import {
  hasShapePatch,
  shapePatchFromMove,
} from "@/features/vector-ai/lib/editor/shape-patch";
import {
  IDLE_POINTER_SESSION,
  rectPreviewFromSession,
  type PointerSession,
  type RectPreview,
} from "@/features/vector-ai/lib/editor/pointer/pointer-session";
import { screenToWorld } from "@/features/vector-ai/lib/editor/pointer/screen-to-world";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/pointer/pointer-session";
import type { EditorAction, EditorState } from "@/features/vector-ai/lib/editor/state";

const MIN_RECT_SIZE = 2;

const DEFAULT_NEW_RECT_STYLE: RectShape["style"] = {
  fill: "#000000",
  stroke: "none",
};

function getShapeById(doc: VectorDoc, id: string): Shape | undefined {
  return doc.shapes.find((s) => s.id === id);
}

function worldFromEvent(
  svg: SVGSVGElement | null,
  event: ReactPointerEvent,
): WorldPoint | null {
  if (!svg) return null;
  return screenToWorld(svg, event.clientX, event.clientY);
}

function isCanvasBackgroundTarget(
  target: EventTarget | null,
  svg: SVGSVGElement | null,
): boolean {
  if (!(target instanceof Element)) return false;
  if (target.getAttribute("data-canvas-background") === "true") return true;
  if (svg && target === svg) return true;
  return false;
}

export type UseVectorPointerParams = {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  svgRef: RefObject<SVGSVGElement | null>;
};

export type UseVectorPointerResult = {
  displayDoc: VectorDoc;
  session: PointerSession;
  rectPreview: RectPreview | null;
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
};

export function useVectorPointer({
  state,
  dispatch,
  svgRef,
}: UseVectorPointerParams): UseVectorPointerResult {
  const [session, setSession] = useState<PointerSession>(IDLE_POINTER_SESSION);
  const sessionRef = useRef(session);
  useLayoutEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const capturePointer = useCallback((event: ReactPointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      svg.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }, [svgRef]);

  const releasePointer = useCallback((event: ReactPointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (svg.hasPointerCapture(event.pointerId)) {
        svg.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* ignore */
    }
  }, [svgRef]);

  const commitSession = useCallback(
    (ended: PointerSession) => {
      if (ended.kind === "move" || ended.kind === "move-line-end") {
        const shape = getShapeById(state.doc, ended.shapeId);
        if (!shape || shape.locked) return;
        if (ended.kind === "move-line-end" && shape.type !== "line") return;

        const after = shapeAfterPointerSession(
          shape,
          ended,
          state.doc.viewBox,
        );
        const patch = shapePatchFromMove(shape, after);
        if (!hasShapePatch(patch)) return;

        dispatch({
          type: "SHAPE_UPDATE",
          id: ended.shapeId,
          patch,
        });
        return;
      }

      if (ended.kind === "create-rect") {
        const preview = clampRectPreviewToViewBox(
          rectPreviewFromSession(ended),
          state.doc.viewBox,
        );
        if (preview.w < MIN_RECT_SIZE || preview.h < MIN_RECT_SIZE) return;

        const id = createShapeId();
        dispatch({
          type: "SHAPE_ADD",
          shape: {
            id,
            type: "rect",
            transform: { x: preview.x, y: preview.y },
            w: preview.w,
            h: preview.h,
            style: DEFAULT_NEW_RECT_STYLE,
          },
        });
        dispatch({ type: "SELECTION_SET", ids: [id] });
        dispatch({ type: "TOOL_SET", tool: "select" });
      }
    },
    [dispatch, state.doc],
  );

  const endSession = useCallback(
    (event: ReactPointerEvent) => {
      const current = sessionRef.current;
      if (current.kind === "idle") return;
      if (current.pointerId !== event.pointerId) return;

      releasePointer(event);
      commitSession(current);
      setSession(IDLE_POINTER_SESSION);
    },
    [commitSession, releasePointer],
  );

  const updateSessionWorld = useCallback(
    (event: ReactPointerEvent, world: WorldPoint) => {
      const current = sessionRef.current;
      if (current.kind === "idle") return;
      if (current.pointerId !== event.pointerId) return;

      setSession({
        ...current,
        currentWorld: world,
      });
    },
    [],
  );

  const onShapePointerDown = useCallback(
    (shapeId: string, event: ReactPointerEvent) => {
      if (state.tool !== "select") return;

      const shape = getShapeById(state.doc, shapeId);
      if (!shape || shape.locked) return;

      event.stopPropagation();
      capturePointer(event);

      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      dispatch({ type: "SELECTION_SET", ids: [shapeId] });
      setSession({
        kind: "move",
        pointerId: event.pointerId,
        shapeId,
        startWorld: world,
        currentWorld: world,
        startTransform: { x: shape.transform.x, y: shape.transform.y },
        ...(shape.type === "line"
          ? { startX2: shape.x2, startY2: shape.y2 }
          : {}),
      });
    },
    [capturePointer, dispatch, state.doc, state.tool, svgRef],
  );

  const onLineEndPointerDown = useCallback(
    (shapeId: string, end: LineEnd, event: ReactPointerEvent) => {
      if (state.tool !== "select") return;

      const shape = getShapeById(state.doc, shapeId);
      if (!shape || shape.locked || shape.type !== "line") return;

      event.stopPropagation();
      capturePointer(event);

      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      dispatch({ type: "SELECTION_SET", ids: [shapeId] });
      setSession({
        kind: "move-line-end",
        pointerId: event.pointerId,
        shapeId,
        end,
        startWorld: world,
        currentWorld: world,
        startTransform: { x: shape.transform.x, y: shape.transform.y },
        startX2: shape.x2,
        startY2: shape.y2,
      });
    },
    [capturePointer, dispatch, state.doc, state.tool, svgRef],
  );

  const onSvgPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!isCanvasBackgroundTarget(event.target, svgRef.current)) return;

      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;

      if (state.tool === "select") {
        dispatch({ type: "SELECTION_SET", ids: [] });
        return;
      }

      if (state.tool === "rect") {
        capturePointer(event);
        setSession({
          kind: "create-rect",
          pointerId: event.pointerId,
          startWorld: world,
          currentWorld: world,
        });
      }
    },
    [capturePointer, dispatch, state.tool, svgRef],
  );

  const onSvgPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const world = worldFromEvent(svgRef.current, event);
      if (!world) return;
      updateSessionWorld(event, world);
    },
    [svgRef, updateSessionWorld],
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

      releasePointer(event);
      setSession(IDLE_POINTER_SESSION);
    },
    [releasePointer],
  );

  const displayDoc = useMemo(
    () => docWithPointerPreview(state.doc, session),
    [state.doc, session],
  );

  const rectPreview =
    session.kind === "create-rect"
      ? clampRectPreviewToViewBox(
          rectPreviewFromSession(session),
          state.doc.viewBox,
        )
      : null;

  const shapePointerEvents = state.tool === "select" ? "auto" : "none";

  return {
    displayDoc,
    session,
    rectPreview,
    shapePointerEvents,
    onSvgPointerDown,
    onSvgPointerMove,
    onSvgPointerUp,
    onSvgPointerCancel,
    onShapePointerDown,
    onLineEndPointerDown,
  };
}
