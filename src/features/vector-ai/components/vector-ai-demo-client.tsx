"use client";

import { useCallback, useMemo, useReducer, useRef, useState } from "react";

import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import { VectorEditorToolbar } from "@/features/vector-ai/components/vector-editor-toolbar";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import {
  canRedo,
  canUndo,
  getShapeById,
} from "@/features/vector-ai/lib/editor/core/selectors";
import { useVectorInteraction } from "@/features/vector-ai/lib/editor/use-vector-interaction";
import { makeEditorWithSampleDoc } from "@/features/vector-ai/lib/editor/test/fixtures";
import { serializeToSvg } from "@/features/vector-ai/lib/view/serialize-to-svg";
import { VECTOR_AI_DEFAULT_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";
import { cn } from "@/lib/utils";

export function VectorAiDemoClient() {
  const [state, dispatch] = useReducer(
    editorReducer,
    null,
    makeEditorWithSampleDoc,
  );
  const [exportNotice, setExportNotice] = useState<string | null>(null);
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

  const handleExportSvg = useCallback(async () => {
    const svg = serializeToSvg(state.doc);
    try {
      await navigator.clipboard.writeText(svg);
      setExportNotice("SVG copié dans le presse-papiers.");
    } catch {
      setExportNotice("Impossible de copier le SVG.");
    }
  }, [state.doc]);

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
        fontSizeEnabled={interaction.editingTextShape !== undefined}
        onFontSizeDraftChange={interaction.setTextEditFontSizeDraft}
        onFontSizeBlur={interaction.commitTextEditOnFontSizeBlur}
        canDelete={interaction.canDeleteSelectedShape}
        onDelete={interaction.deleteSelectedShape}
      />
      <div className="mx-auto aspect-[4/3] w-full max-w-3xl">
        <VectorCanvasInteractive
          svgRef={svgRef}
          interaction={interaction}
          doc={state.doc}
          selectedId={selectedId}
        />
      </div>
      <p
        className={cn(
          "text-muted-foreground text-sm",
          state.selection.ids.length === 0 && !exportNotice && "opacity-80",
        )}
      >
        {exportNotice ??
          (state.selection.ids.length > 0
            ? `Sélection : ${state.selection.ids.join(", ")}`
            : "Aucune sélection")}
      </p>
    </div>
  );
}
