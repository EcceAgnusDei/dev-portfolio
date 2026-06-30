"use client";

import {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { VectorAiPromptPanel } from "@/features/vector-ai/components/vector-ai-prompt-panel";
import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import { VectorEditorToolbar } from "@/features/vector-ai/components/vector-editor-toolbar";
import {
  planDrawingLoad,
  saveDrawingFromDoc,
} from "@/features/vector-ai/lib/drawing-persistence";
import { runVectorAiSubmit } from "@/features/vector-ai/lib/editor/ai/run-vector-ai-submit";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import {
  canRedo,
  canUndo,
  getShapeById,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import { createInitialEditorState } from "@/features/vector-ai/lib/editor/core/state";
import {
  commitViewBoxSizeActions,
  parseViewBoxDimensionInput,
} from "@/features/vector-ai/lib/editor/dispatch/commit-viewbox";
import { useVectorInteraction } from "@/features/vector-ai/lib/editor/use-vector-interaction";
import {
  buildSvgDownloadFilename,
  downloadSvgFile,
} from "@/features/vector-ai/lib/view/download-svg-file";
import {
  canStepDisplayZoomIn,
  canStepDisplayZoomOut,
  stepDisplayZoom,
} from "@/features/vector-ai/lib/view/display-zoom";
import { serializeToSvg } from "@/features/vector-ai/lib/view/serialize-to-svg";
import {
  getVectorDrawingsStoreServerSnapshot,
  getVectorDrawingsStoreSnapshot,
  subscribeVectorDrawingsStore,
} from "@/features/vector-ai/lib/vector-drawing-storage";
import {
  VECTOR_AI_DEFAULT_FONT_SIZE,
  VECTOR_AI_DEFAULT_VIEWBOX,
  VECTOR_AI_VIEWBOX_DISPLAY_REM_RATIO,
} from "@/features/vector-ai/lib/vector-ai-config";
import { cn } from "@/lib/utils";

type Notice = {
  variant: "alert" | "info";
  text: string;
};

export function VectorAiDemoClient() {
  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    createInitialEditorState,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null);
  const [drawingName, setDrawingName] = useState("");
  const [viewBoxWidthDraft, setViewBoxWidthDraft] = useState(() =>
    String(VECTOR_AI_DEFAULT_VIEWBOX.w),
  );
  const [viewBoxHeightDraft, setViewBoxHeightDraft] = useState(() =>
    String(VECTOR_AI_DEFAULT_VIEWBOX.h),
  );
  const [viewBoxHandlesVisible, setViewBoxHandlesVisible] = useState(false);
  const [displayZoom, setDisplayZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiRequestIdRef = useRef(0);
  const interaction = useVectorInteraction({
    state,
    dispatch,
    svgRef,
    viewBoxHandlesVisible,
    aiPending,
  });
  const savedDrawings = useSyncExternalStore(
    subscribeVectorDrawingsStore,
    getVectorDrawingsStoreSnapshot,
    getVectorDrawingsStoreServerSnapshot,
  );

  const { clearTextEditSession } = interaction;

  const selectedId = state.selection.ids[0] ?? null;

  const selectedTextShape = useMemo(() => {
    if (!selectedId) return undefined;
    const shape = getShapeById(state.doc, selectedId);
    return shape?.type === "text" ? shape : undefined;
  }, [selectedId, state.doc]);

  const fontSizeFallback =
    interaction.editingTextShape?.fontSize ??
    selectedTextShape?.fontSize ??
    VECTOR_AI_DEFAULT_FONT_SIZE;

  const fontSizeDraft =
    interaction.textEditFontSizeDraft ??
    String(fontSizeFallback ?? VECTOR_AI_DEFAULT_FONT_SIZE);

  const handleViewBoxDimensionsOpenChange = useCallback(
    (open: boolean, opening = false) => {
      setViewBoxHandlesVisible(open);
      if (opening) {
        setViewBoxWidthDraft(String(state.doc.viewBox.w));
        setViewBoxHeightDraft(String(state.doc.viewBox.h));
      }
    },
    [state.doc.viewBox.h, state.doc.viewBox.w],
  );

  const handleViewBoxOk = useCallback(() => {
    const { w: currentW, h: currentH } = state.doc.viewBox;
    const w = parseViewBoxDimensionInput(viewBoxWidthDraft, currentW);
    const h = parseViewBoxDimensionInput(viewBoxHeightDraft, currentH);
    const actions = commitViewBoxSizeActions(state.doc.viewBox, {
      widthDraft: viewBoxWidthDraft,
      heightDraft: viewBoxHeightDraft,
    });
    for (const action of actions) {
      dispatch(action);
    }
    setViewBoxWidthDraft(String(w));
    setViewBoxHeightDraft(String(h));
  }, [state.doc.viewBox, viewBoxHeightDraft, viewBoxWidthDraft]);

  const handleZoomIn = useCallback(() => {
    setDisplayZoom((current) => stepDisplayZoom(current, "in"));
  }, []);

  const handleZoomOut = useCallback(() => {
    setDisplayZoom((current) => stepDisplayZoom(current, "out"));
  }, []);

  const handleZoomReset = useCallback(() => {
    setDisplayZoom(1);
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const showAlert = useCallback((text: string) => {
    setNotice({ variant: "alert", text });
  }, []);

  const showInfo = useCallback((text: string) => {
    setNotice({ variant: "info", text });
  }, []);

  const handleExportSvg = useCallback(async () => {
    const svg = serializeToSvg(state.doc);
    try {
      await navigator.clipboard.writeText(svg);
      showInfo("SVG copié dans le presse-papiers.");
    } catch {
      showAlert("Impossible de copier le SVG.");
    }
  }, [showAlert, showInfo, state.doc]);

  const handleDownloadSvg = useCallback(() => {
    const { viewBox } = state.doc;
    const svg = serializeToSvg(state.doc, {
      width: viewBox.w,
      height: viewBox.h,
    });
    downloadSvgFile(svg, buildSvgDownloadFilename(drawingName));
    showInfo("SVG téléchargé.");
  }, [drawingName, showInfo, state.doc]);

  const handleSaveDrawing = useCallback(() => {
    const result = saveDrawingFromDoc({
      doc: state.doc,
      activeDrawingId,
      drawingName,
    });
    if (!result.ok) {
      showAlert(result.error);
      return;
    }

    setActiveDrawingId(result.id);
    setDrawingName(result.name);
    showInfo("Dessin enregistré.");
  }, [activeDrawingId, drawingName, showAlert, showInfo, state.doc]);

  const handleActiveDrawingChange = useCallback(
    (id: string | null) => {
      const plan = planDrawingLoad(id);
      if (!plan.ok) {
        showAlert(plan.error);
        setActiveDrawingId(null);
        setDrawingName("");
        return;
      }

      clearTextEditSession();
      dispatch({ type: "EDITOR_LOAD", doc: plan.doc });
      setActiveDrawingId(plan.activeDrawingId);
      setDrawingName(plan.drawingName);
      setDisplayZoom(1);
      clearNotice();
    },
    [clearNotice, clearTextEditSession, showAlert],
  );

  const handleCancelAi = useCallback(() => {
    aiAbortRef.current?.abort();
  }, []);

  const handleSubmitAi = useCallback(async () => {
    if (aiPending) return;

    clearNotice();
    const requestId = ++aiRequestIdRef.current;
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiPending(true);

    try {
      const result = await runVectorAiSubmit({
        doc: state.doc,
        prompt: aiPrompt,
        signal: controller.signal,
        shouldCancel: () =>
          controller.signal.aborted || requestId !== aiRequestIdRef.current,
      });

      if (requestId !== aiRequestIdRef.current) return;

      if (!result.ok) {
        if ("aborted" in result) {
          showInfo("Requête annulée.");
          return;
        }
        showAlert(result.error);
        return;
      }

      if (result.docChanged) {
        dispatch({ type: "DOC_SET", doc: result.doc, recordHistory: true });
      }

      showInfo(result.userMessage);
    } finally {
      if (requestId === aiRequestIdRef.current) {
        setAiPending(false);
        aiAbortRef.current = null;
      }
    }
  }, [aiPending, aiPrompt, clearNotice, showAlert, showInfo, state.doc]);

  const statusText =
    notice?.text ??
    (aiPending
      ? "Modification en cours…"
      : state.selection.ids.length > 0
        ? `Sélection : ${state.selection.ids.join(", ")}`
        : "Aucune sélection");

  const { w: viewBoxW, h: viewBoxH } = interaction.displayDoc.viewBox;
  const canvasDisplaySize = useMemo(() => {
    const w = viewBoxW > 0 ? viewBoxW : VECTOR_AI_DEFAULT_VIEWBOX.w;
    const h = viewBoxH > 0 ? viewBoxH : VECTOR_AI_DEFAULT_VIEWBOX.h;
    const ratio = VECTOR_AI_VIEWBOX_DISPLAY_REM_RATIO * displayZoom;
    return {
      width: `${w * ratio}rem`,
      height: `${h * ratio}rem`,
    };
  }, [displayZoom, viewBoxH, viewBoxW]);

  return (
    <div className="flex flex-col gap-4">
      <VectorEditorToolbar
        activeTool={state.tool}
        onToolChange={interaction.setTool}
        canUndo={canUndo(state)}
        canRedo={canRedo(state)}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        onExportSvg={() => void handleExportSvg()}
        onDownloadSvg={handleDownloadSvg}
        savedDrawings={savedDrawings}
        activeDrawingId={activeDrawingId}
        onActiveDrawingChange={handleActiveDrawingChange}
        drawingName={drawingName}
        onDrawingNameChange={setDrawingName}
        onSaveDrawing={handleSaveDrawing}
        saveDrawingDisabled={aiPending}
        fontSizeDraft={fontSizeDraft}
        fontSizeFallback={fontSizeFallback}
        fontSizeEnabled={
          !aiPending && interaction.editingTextShape !== undefined
        }
        onFontSizeDraftChange={interaction.setTextEditFontSizeDraft}
        onFontSizeBlur={interaction.commitTextEditOnFontSizeBlur}
        canDelete={!aiPending && interaction.canDeleteSelectedShape}
        onDelete={interaction.deleteSelectedShape}
        canReorder={!aiPending && interaction.canReorderSelectedShapes}
        zOrderAvailability={interaction.zOrderAvailability}
        onZOrderCommand={interaction.reorderSelectedShapes}
        styleControl={interaction.styleControl}
        styleControlsEnabled={!aiPending}
        onStylePatch={interaction.applyStyleControlPatch}
        viewBoxWidthDraft={viewBoxWidthDraft}
        viewBoxHeightDraft={viewBoxHeightDraft}
        onViewBoxWidthDraftChange={setViewBoxWidthDraft}
        onViewBoxHeightDraftChange={setViewBoxHeightDraft}
        onViewBoxOk={handleViewBoxOk}
        onViewBoxDimensionsOpenChange={handleViewBoxDimensionsOpenChange}
        viewBoxControlsDisabled={aiPending}
        displayZoom={displayZoom}
        canZoomIn={canStepDisplayZoomIn(displayZoom)}
        canZoomOut={canStepDisplayZoomOut(displayZoom)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        displayZoomControlsDisabled={aiPending}
      />
      <VectorAiPromptPanel
        aiPrompt={aiPrompt}
        onAiPromptChange={(value) => {
          clearNotice();
          setAiPrompt(value);
        }}
        onSubmitAi={() => void handleSubmitAi()}
        onCancelAi={handleCancelAi}
        aiPending={aiPending}
      />
      <p
        className={cn(
          "text-sm",
          notice?.variant === "alert"
            ? "text-destructive"
            : "text-muted-foreground",
          !notice &&
            state.selection.ids.length === 0 &&
            !aiPending &&
            "opacity-80",
        )}
        role={notice?.variant === "alert" ? "alert" : "status"}
        aria-live="polite"
      >
        {statusText}
      </p>
      <div className="mx-auto max-w-full overflow-auto">
        <div
          className={cn(
            "mx-auto",
            aiPending && "pointer-events-none opacity-60",
          )}
          style={canvasDisplaySize}
        >
          <VectorCanvasInteractive
            svgRef={svgRef}
            interaction={interaction}
            doc={state.doc}
            selectedIds={state.selection.ids}
            viewBoxHandlesVisible={viewBoxHandlesVisible}
          />
        </div>
      </div>
    </div>
  );
}
