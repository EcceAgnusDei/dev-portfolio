"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";

import type {
  TextShape,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
import type { TextEditCommit } from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import { estimateTextBounds } from "@/features/vector-ai/lib/editor/geometry/text-bounds";
import {
  VECTOR_AI_DEFAULT_FONT_SIZE,
  VECTOR_AI_TEXT_DOUBLE_CLICK_MS,
  VECTOR_AI_TEXT_LINE_HEIGHT_FACTOR,
} from "@/features/vector-ai/lib/vector-ai-config";

export type TextEditForeignObjectProps = {
  doc: VectorDoc;
  shapeId: string;
  onCommit: (input: TextEditCommit) => void;
  onCancel: () => void;
};

const XHTML_ROOT_ATTRS = {
  xmlns: "http://www.w3.org/1999/xhtml",
} as { xmlns: string };

function readTextShape(doc: VectorDoc, shapeId: string): TextShape | null {
  const shape = getShapeById(doc, shapeId);
  if (!shape || shape.type !== "text") return null;
  return shape;
}

function textShapeFill(shape: TextShape): string {
  return shape.style.fill && shape.style.fill !== "none"
    ? shape.style.fill
    : "#000000";
}

function inPlaceTextEditStyle(shape: TextShape): CSSProperties {
  const fill = textShapeFill(shape);

  return {
    boxSizing: "border-box",
    display: "block",
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    color: fill,
    caretColor: fill,
    fontSize: shape.fontSize,
    fontFamily: shape.fontFamily,
    lineHeight: VECTOR_AI_TEXT_LINE_HEIGHT_FACTOR,
    textAlign: "center",
    whiteSpace: "pre",
    resize: "none",
    overflow: "hidden",
    outline: "none",
    appearance: "none",
  };
}

export function TextEditForeignObject({
  doc,
  shapeId,
  onCommit,
  onCancel,
}: TextEditForeignObjectProps) {
  const shape = readTextShape(doc, shapeId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(shape?.content ?? "");
  const suppressBlurUntilRef = useRef(0);
  const [draft, setDraft] = useState(shape?.content ?? "");

  const fontSize = shape?.fontSize ?? VECTOR_AI_DEFAULT_FONT_SIZE;

  const bounds = useMemo(() => {
    if (!shape) return null;
    return estimateTextBounds({
      transform: shape.transform,
      content: draft,
      fontSize,
    });
  }, [draft, fontSize, shape]);

  useEffect(() => {
    suppressBlurUntilRef.current =
      performance.now() + VECTOR_AI_TEXT_DOUBLE_CLICK_MS;

    const focusId = window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus({ preventScroll: true });
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    }, 0);

    return () => window.clearTimeout(focusId);
  }, [shapeId]);

  if (!shape || !bounds) return null;

  function commitEditor() {
    onCommit({ content: draftRef.current });
  }

  function commitOnBlur() {
    window.setTimeout(() => {
      if (performance.now() < suppressBlurUntilRef.current) return;
      if (document.activeElement === textareaRef.current) return;
      commitEditor();
    }, 0);
  }

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    draftRef.current = event.target.value;
    setDraft(event.target.value);
  }

  return (
    <g data-layer="text-edit" pointerEvents="auto">
      <foreignObject
        x={bounds.x}
        y={bounds.y}
        width={bounds.w}
        height={bounds.h}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          {...XHTML_ROOT_ATTRS}
          style={{
            width: "100%",
            height: "100%",
            margin: 0,
            padding: 0,
            overflow: "hidden",
            background: "transparent",
          }}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleDraftChange}
            onBlur={commitOnBlur}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
                return;
              }
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                commitEditor();
              }
            }}
            rows={1}
            wrap="off"
            className="select-text"
            aria-label="Édition du texte"
            style={inPlaceTextEditStyle(shape)}
          />
        </div>
      </foreignObject>
    </g>
  );
}
