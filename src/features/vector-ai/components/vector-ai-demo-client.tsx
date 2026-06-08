"use client";

import { useCallback, useReducer, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import { canRedo, canUndo } from "@/features/vector-ai/lib/editor/core/selectors";
import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import { useVectorInteraction } from "@/features/vector-ai/lib/editor/use-vector-interaction";
import { makeEditorWithSampleDoc } from "@/features/vector-ai/lib/editor/test/fixtures";
import { serializeToSvg } from "@/features/vector-ai/lib/view/serialize-to-svg";
import { cn } from "@/lib/utils";

const TOOLS: { id: EditorTool; label: string }[] = [
  { id: "select", label: "Sélection" },
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Cercle" },
  { id: "line", label: "Ligne" },
  { id: "cubic", label: "Courbe" },
];

export function VectorAiDemoClient() {
  const [state, dispatch] = useReducer(
    editorReducer,
    null,
    makeEditorWithSampleDoc,
  );
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const interaction = useVectorInteraction({ state, dispatch, svgRef });

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
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((tool) => (
          <Button
            key={tool.id}
            type="button"
            variant={state.tool === tool.id ? "default" : "outline"}
            size="sm"
            onClick={() => interaction.setTool(tool.id)}
          >
            {tool.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canUndo(state)}
          onClick={() => dispatch({ type: "UNDO" })}
        >
          Annuler
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canRedo(state)}
          onClick={() => dispatch({ type: "REDO" })}
        >
          Rétablir
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleExportSvg()}
        >
          Copier SVG
        </Button>
      </div>
      <div className="aspect-[4/3] w-full max-w-3xl">
        <VectorCanvasInteractive
          svgRef={svgRef}
          interaction={interaction}
          selectedId={state.selection.ids[0] ?? null}
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
