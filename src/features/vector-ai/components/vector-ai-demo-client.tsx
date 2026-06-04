"use client";

import { useReducer } from "react";

import { Button } from "@/components/ui/button";
import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import { canRedo, canUndo } from "@/features/vector-ai/lib/editor/core/selectors";
import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import { makeEditorWithSampleDoc } from "@/features/vector-ai/lib/editor/test/fixtures";
import { cn } from "@/lib/utils";

const TOOLS: { id: EditorTool; label: string }[] = [
  { id: "select", label: "Sélection" },
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Cercle" },
  { id: "line", label: "Ligne" },
];

export function VectorAiDemoClient() {
  const [state, dispatch] = useReducer(
    editorReducer,
    null,
    makeEditorWithSampleDoc,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((tool) => (
          <Button
            key={tool.id}
            type="button"
            variant={state.tool === tool.id ? "default" : "outline"}
            size="sm"
            onClick={() => dispatch({ type: "TOOL_SET", tool: tool.id })}
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
      </div>
      <div className="aspect-[4/3] w-full max-w-3xl">
        <VectorCanvasInteractive state={state} dispatch={dispatch} />
      </div>
      <p
        className={cn(
          "text-muted-foreground text-sm",
          state.selection.ids.length === 0 && "opacity-80",
        )}
      >
        {state.selection.ids.length > 0
          ? `Sélection : ${state.selection.ids.join(", ")}`
          : "Aucune sélection"}
      </p>
    </div>
  );
}
