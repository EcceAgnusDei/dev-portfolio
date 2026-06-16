"use client";

import { useCallback, useMemo, useReducer, useRef, useState } from "react";

import { VectorAiPromptPanel } from "@/features/vector-ai/components/vector-ai-prompt-panel";
import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import { VectorEditorToolbar } from "@/features/vector-ai/components/vector-editor-toolbar";
import { postVectorAiCommand } from "@/features/vector-ai/lib/ai/post-vector-ai-command";
import { isSameVectorDoc } from "@/features/vector-ai/lib/editor/core/doc-equality";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import {
  canRedo,
  canUndo,
  getShapeById,
} from "@/features/vector-ai/lib/editor/core/selectors";
import { createInitialEditorState } from "@/features/vector-ai/lib/editor/core/state";
import { useVectorInteraction } from "@/features/vector-ai/lib/editor/use-vector-interaction";
import { serializeToSvg } from "@/features/vector-ai/lib/view/serialize-to-svg";
import { VECTOR_AI_DEFAULT_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";
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
  const svgRef = useRef<SVGSVGElement>(null);
  const interaction = useVectorInteraction({ state, dispatch, svgRef });

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
    interaction.textEditFontSizeDraft ?? String(fontSizeFallback);

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

  const handleSubmitAi = useCallback(async () => {
    if (aiPending) return;

    clearNotice();
    setAiPending(true);

    const result = await postVectorAiCommand({
      prompt: aiPrompt,
      doc: state.doc,
    });

    setAiPending(false);

    if (!result.ok) {
      showAlert(result.error);
      return;
    }

    if (isSameVectorDoc(state.doc, result.doc)) {
      showInfo("L'IA n'a pas modifié le dessin.");
      return;
    }

    dispatch({ type: "DOC_SET", doc: result.doc, recordHistory: true });
    showInfo("Dessin modifié par l'IA.");
  }, [aiPending, aiPrompt, clearNotice, showAlert, showInfo, state.doc]);

  const statusText =
    notice?.text ??
    (aiPending
      ? "Modification en cours…"
      : state.selection.ids.length > 0
        ? `Sélection : ${state.selection.ids.join(", ")}`
        : "Aucune sélection");

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
        fontSizeDraft={fontSizeDraft}
        fontSizeFallback={fontSizeFallback}
        fontSizeEnabled={!aiPending && interaction.editingTextShape !== undefined}
        onFontSizeDraftChange={interaction.setTextEditFontSizeDraft}
        onFontSizeBlur={interaction.commitTextEditOnFontSizeBlur}
        canDelete={!aiPending && interaction.canDeleteSelectedShape}
        onDelete={interaction.deleteSelectedShape}
      />
      <VectorAiPromptPanel
        aiPrompt={aiPrompt}
        onAiPromptChange={(value) => {
          clearNotice();
          setAiPrompt(value);
        }}
        onSubmitAi={() => void handleSubmitAi()}
        aiPending={aiPending}
      />
      <div
        className={cn(
          "mx-auto aspect-[4/3] w-full max-w-3xl",
          aiPending && "pointer-events-none opacity-60",
        )}
      >
        <VectorCanvasInteractive
          svgRef={svgRef}
          interaction={interaction}
          doc={state.doc}
          selectedId={selectedId}
        />
      </div>
      <p
        className={cn(
          "text-sm",
          notice?.variant === "alert"
            ? "text-destructive"
            : "text-muted-foreground",
          !notice && state.selection.ids.length === 0 && !aiPending && "opacity-80",
        )}
        role={notice?.variant === "alert" ? "alert" : "status"}
        aria-live="polite"
      >
        {statusText}
      </p>
    </div>
  );
}
