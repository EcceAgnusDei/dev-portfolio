"use client";

import { type ChangeEvent, type FocusEvent } from "react";

import { Button } from "@/components/ui/button";
import { VectorStyleControls } from "@/features/vector-ai/components/vector-style-controls";
import type { StyleControlState } from "@/features/vector-ai/lib/editor/core/selectors";
import type { StylePatch } from "@/features/vector-ai/lib/editor/dispatch/style-patch-actions";
import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import { parseTextFontSizeInput } from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import { VECTOR_AI_MAX_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";
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
  fontSizeDraft: string;
  fontSizeFallback: number;
  fontSizeEnabled: boolean;
  onFontSizeDraftChange: (value: string) => void;
  onFontSizeBlur?: (fontSize: number, relatedTarget: EventTarget | null) => void;
  canDelete: boolean;
  onDelete: () => void;
  styleControl: StyleControlState;
  styleControlsEnabled: boolean;
  onStylePatch: (patch: StylePatch) => void;
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
  fontSizeDraft,
  fontSizeFallback,
  fontSizeEnabled,
  onFontSizeDraftChange,
  onFontSizeBlur,
  canDelete,
  onDelete,
  styleControl,
  styleControlsEnabled,
  onStylePatch,
  className,
}: VectorEditorToolbarProps) {
  function handleFontSizeChange(event: ChangeEvent<HTMLInputElement>) {
    if (!fontSizeEnabled) return;
    onFontSizeDraftChange(event.target.value);
  }

  function handleFontSizeBlur(event: FocusEvent<HTMLInputElement>) {
    if (!fontSizeEnabled) return;
    const parsed = parseTextFontSizeInput(fontSizeDraft, fontSizeFallback);
    onFontSizeDraftChange(String(parsed));
    onFontSizeBlur?.(parsed, event.relatedTarget);
  }

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

      <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Propriétés</legend>
        <div className="flex min-w-0 flex-wrap items-end justify-center gap-3">
          <VectorStyleControls
            fill={styleControl.values.fill}
            stroke={styleControl.values.stroke}
            strokeWidth={styleControl.values.strokeWidth}
            visibility={styleControl.visibility}
            disabled={!styleControlsEnabled}
            onFillChange={(fill) => onStylePatch({ fill })}
            onStrokeChange={(stroke) => onStylePatch({ stroke })}
            onStrokeWidthChange={(strokeWidth) => onStylePatch({ strokeWidth })}
          />
          <label
            data-vector-text-edit-ui
            className={cn(
              "flex min-w-[5.5rem] flex-col gap-1 text-sm",
              !fontSizeEnabled && "opacity-50",
            )}
          >
            <span className="text-muted-foreground text-xs">Taille</span>
            <input
              type="text"
              inputMode="decimal"
              value={fontSizeDraft}
              onChange={handleFontSizeChange}
              onBlur={handleFontSizeBlur}
              disabled={!fontSizeEnabled}
              min={3}
              max={VECTOR_AI_MAX_FONT_SIZE}
              aria-label="Taille de police"
              className="h-8 rounded-md border border-border bg-background px-2 text-center text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canDelete}
            onClick={onDelete}
          >
            Supprimer
          </Button>
        </div>
      </fieldset>

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
