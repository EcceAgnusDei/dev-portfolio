"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";

import type {
  TextShape,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
import {
  isValidTextFontSizeInput,
  parseTextFontSizeInput,
  type TextEditCommit,
} from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import { getShapeById } from "@/features/vector-ai/lib/editor/core/selectors";
import { estimateTextBounds } from "@/features/vector-ai/lib/editor/geometry/text-bounds";
import { textLineHeight } from "@/features/vector-ai/lib/editor/geometry/text-lines";
import { worldToContainerOffset } from "@/features/vector-ai/lib/editor/geometry/screen-to-world";
import {
  VECTOR_AI_DEFAULT_FONT_SIZE,
  VECTOR_AI_HIT_TEXT_MIN_HEIGHT,
  VECTOR_AI_HIT_TEXT_MIN_WIDTH,
  VECTOR_AI_MAX_FONT_SIZE,
  VECTOR_AI_TEXT_DOUBLE_CLICK_MS,
} from "@/features/vector-ai/lib/vector-ai-config";

export type TextEditOverlayProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  doc: VectorDoc;
  shapeId: string;
  onCommit: (input: TextEditCommit) => void;
  onCancel: () => void;
};

function readTextShape(doc: VectorDoc, shapeId: string): TextShape | null {
  const shape = getShapeById(doc, shapeId);
  if (!shape || shape.type !== "text") return null;
  return shape;
}

function previewFontSizeFromDraft(
  fontSizeDraft: string,
  fallback: number,
): number {
  if (!isValidTextFontSizeInput(fontSizeDraft)) return fallback;
  return Number(fontSizeDraft);
}

function measureTextEditScreenPos(
  svgRef: RefObject<SVGSVGElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  doc: VectorDoc,
  shapeId: string,
  draft: string,
  fontSizeDraft: string,
): { left: number; top: number } | null {
  const svg = svgRef.current;
  const container = containerRef.current;
  const textShape = readTextShape(doc, shapeId);
  if (!svg || !container || !textShape) return null;

  const bounds = estimateTextBounds({
    transform: textShape.transform,
    content: draft,
    fontSize: previewFontSizeFromDraft(fontSizeDraft, textShape.fontSize),
  });
  return worldToContainerOffset(svg, container, { x: bounds.x, y: bounds.y });
}

export function TextEditOverlay({
  svgRef,
  containerRef,
  doc,
  shapeId,
  onCommit,
  onCancel,
}: TextEditOverlayProps) {
  const shape = readTextShape(doc, shapeId);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(shape?.content ?? "");
  const fontSizeDraftRef = useRef(
    String(shape?.fontSize ?? VECTOR_AI_DEFAULT_FONT_SIZE),
  );
  const suppressBlurUntilRef = useRef(0);
  const [draft, setDraft] = useState(shape?.content ?? "");
  const [fontSizeDraft, setFontSizeDraft] = useState(
    String(shape?.fontSize ?? VECTOR_AI_DEFAULT_FONT_SIZE),
  );
  const [layoutEpoch, setLayoutEpoch] = useState(0);

  const fallbackFontSize = shape?.fontSize ?? VECTOR_AI_DEFAULT_FONT_SIZE;
  const previewFontSize = previewFontSizeFromDraft(
    fontSizeDraft,
    fallbackFontSize,
  );
  const screenPos = measureTextEditScreenPos(
    svgRef,
    containerRef,
    doc,
    shapeId,
    draft,
    fontSizeDraft,
  );

  useLayoutEffect(() => {
    //sert à afficher l'éditeur de texte à la bonne position
    const frameId = requestAnimationFrame(() => {
      setLayoutEpoch((epoch) => epoch + 1);
    });
    return () => cancelAnimationFrame(frameId);
  }, [shapeId]);

  useLayoutEffect(() => {
    //sert à afficher l'éditeur de texte au bon endroit lorsque la fenêtre change
    const onLayoutChange = () => {
      setLayoutEpoch((epoch) => epoch + 1);
    };

    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [shapeId]);

  useEffect(() => {
    suppressBlurUntilRef.current =
      performance.now() + VECTOR_AI_TEXT_DOUBLE_CLICK_MS;

    const focusId = window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus({ preventScroll: true });
      textarea.select();
    }, 0);

    return () => window.clearTimeout(focusId);
  }, [shapeId]);

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    draftRef.current = event.target.value;
    setDraft(event.target.value);
  }

  function commitEditor() {
    onCommit({
      content: draftRef.current,
      fontSize: parseTextFontSizeInput(
        fontSizeDraftRef.current,
        fallbackFontSize,
      ),
    });
  }

  function commitOnBlur() {
    window.setTimeout(() => {
      if (performance.now() < suppressBlurUntilRef.current) return;
      const editor = editorRef.current;
      if (!editor || !editor.isConnected) return;
      if (editor.contains(document.activeElement)) return;
      commitEditor();
    }, 0);
  }

  function handleFontSizeChange(event: ChangeEvent<HTMLInputElement>) {
    fontSizeDraftRef.current = event.target.value;
    setFontSizeDraft(event.target.value);
  }

  function normalizeFontSizeDraft() {
    const parsed = parseTextFontSizeInput(
      fontSizeDraftRef.current,
      fallbackFontSize,
    );
    const normalized = String(parsed);
    fontSizeDraftRef.current = normalized;
    setFontSizeDraft(normalized);
  }

  function handleFontSizeBlur() {
    normalizeFontSizeDraft();
    commitOnBlur();
  }

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !shape) return;

    textarea.style.width = "0px";
    textarea.style.height = "0px";
    textarea.style.width = `${Math.max(textarea.scrollWidth, VECTOR_AI_HIT_TEXT_MIN_WIDTH)}px`;
    textarea.style.height = `${Math.max(
      textarea.scrollHeight,
      Math.ceil(textLineHeight(previewFontSize)),
      VECTOR_AI_HIT_TEXT_MIN_HEIGHT,
    )}px`;
  }, [draft, layoutEpoch, previewFontSize, screenPos, shape]);

  if (!shape || !screenPos) return null;

  const fill =
    shape.style.fill && shape.style.fill !== "none"
      ? shape.style.fill
      : "#000000";

  const previewBounds = estimateTextBounds({
    transform: shape.transform,
    content: draft,
    fontSize: previewFontSize,
  });

  return (
    <div
      ref={editorRef}
      className="pointer-events-auto absolute z-10 flex flex-col gap-1"
      style={{
        left: `${screenPos.left}px`,
        top: `${screenPos.top}px`,
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      <input
        type="text"
        inputMode="decimal"
        value={fontSizeDraft}
        onChange={handleFontSizeChange}
        onBlur={handleFontSizeBlur}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            normalizeFontSizeDraft();
            textareaRef.current?.focus();
          }
        }}
        className="h-7 w-20 border border-primary bg-background/95 px-2 text-center text-sm outline-none select-text"
        aria-label="Taille de police"
        min={1}
        max={VECTOR_AI_MAX_FONT_SIZE}
      />
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={handleDraftChange}
        onBlur={commitOnBlur}
        onMouseDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
        }}
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
        className="resize-none overflow-hidden border border-primary bg-background/95 p-0 text-center leading-[1.2] whitespace-pre outline-none select-text"
        style={{
          color: fill,
          fontSize: `${previewFontSize}px`,
          fontFamily: shape.fontFamily,
          minWidth: `${previewBounds.w}px`,
        }}
        aria-label="Édition du texte"
      />
    </div>
  );
}
