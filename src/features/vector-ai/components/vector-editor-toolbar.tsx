"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import { cn } from "@/lib/utils";

export const VECTOR_EDITOR_TOOLS: { id: EditorTool; label: string }[] = [
  { id: "select", label: "Sélection" },
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Cercle" },
  { id: "line", label: "Ligne" },
  { id: "cubic", label: "Courbe" },
  { id: "text", label: "Texte" },
];

export type VectorEditorToolbarProps = {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExportSvg: () => void;
  contextProperties?: ReactNode;
  className?: string;
};

export function VectorEditorToolbar({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExportSvg,
  contextProperties = null,
  className,
}: VectorEditorToolbarProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3",
        className,
      )}
    >
      <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Outils</legend>
        <div className="-mx-1 flex min-w-0 w-full justify-center overflow-x-auto px-1 pb-1">
          <div className="flex min-w-min flex-nowrap items-center justify-center gap-2 sm:flex-wrap sm:overflow-visible">
            {VECTOR_EDITOR_TOOLS.map((tool) => (
              <Button
                key={tool.id}
                type="button"
                variant={activeTool === tool.id ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => onToolChange(tool.id)}
              >
                {tool.label}
              </Button>
            ))}
          </div>
        </div>
      </fieldset>

      {contextProperties ? (
        <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
          <legend className="text-center text-sm font-medium">Propriétés</legend>
          <div className="flex min-w-0 flex-wrap items-end justify-center gap-3">
            {contextProperties}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Document</legend>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canUndo}
            onClick={onUndo}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRedo}
            onClick={onRedo}
          >
            Rétablir
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onExportSvg}>
            Copier SVG
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
