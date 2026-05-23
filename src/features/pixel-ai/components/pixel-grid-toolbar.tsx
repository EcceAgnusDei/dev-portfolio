"use client";

import { Button } from "@/components/ui/button";
import { PIXEL_AI_PROMPT_MAX_LENGTH } from "@/features/pixel-ai/lib/pixel-ai-config";

type PixelGridToolbarProps = {
  gridSizeInputs: { x: string; y: string };
  onGridSizeInputChange: (field: "x" | "y", value: string) => void;
  onApplyGridSize: () => void;
  cellSizeInput: string;
  onCellSizeInputChange: (value: string) => void;
  onApplyCellSize: () => void;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onSubmitAi: () => void;
  aiPending: boolean;
};

export function PixelGridToolbar({
  gridSizeInputs,
  onGridSizeInputChange,
  onApplyGridSize,
  cellSizeInput,
  onCellSizeInputChange,
  onApplyCellSize,
  aiPrompt,
  onAiPromptChange,
  onSubmitAi,
  aiPending,
}: PixelGridToolbarProps) {
  return (
    <div className="mx-auto flex w-full max-w-[min(64rem,100%)] flex-col gap-4">
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-2 lg:justify-start">
          <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="text-center text-sm font-medium lg:text-left">
              Taille de la grille (colonnes × lignes)
            </legend>
            <div className="flex flex-wrap items-end justify-center gap-2 lg:justify-start">
              <input
                min={1}
                type="number"
                value={gridSizeInputs.x}
                onChange={(e) => onGridSizeInputChange("x", e.target.value)}
                placeholder="Largeur (colonnes)"
                aria-label="Largeur de la grille en colonnes"
                className="w-20 shrink-0"
                disabled={aiPending}
              />
              <input
                min={1}
                type="number"
                value={gridSizeInputs.y}
                onChange={(e) => onGridSizeInputChange("y", e.target.value)}
                placeholder="Hauteur (lignes)"
                aria-label="Hauteur de la grille en lignes"
                className="w-20 shrink-0"
                disabled={aiPending}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onApplyGridSize}
                disabled={aiPending}
              >
                Ok
              </Button>
            </div>
          </fieldset>
          <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="text-center text-sm font-medium lg:text-left">
              Taille des cellules (px)
            </legend>
            <div className="flex flex-wrap items-end justify-center gap-2 lg:justify-start">
              <input
                min={1}
                type="number"
                value={cellSizeInput}
                onChange={(e) => onCellSizeInputChange(e.target.value)}
                aria-label="Taille d'une cellule en pixels"
                className="w-20 shrink-0"
                disabled={aiPending}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onApplyCellSize}
                disabled={aiPending}
              >
                Ok
              </Button>
            </div>
          </fieldset>
        </div>
        <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0 lg:max-w-md lg:flex-1">
          <legend className="text-center text-sm font-medium">
            Commande IA
          </legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={aiPrompt}
              onChange={(e) => onAiPromptChange(e.target.value)}
              placeholder="Que voulez-vous que je dessine?"
              aria-label="Commande pour modifier le dessin avec l'IA"
              rows={2}
              maxLength={PIXEL_AI_PROMPT_MAX_LENGTH}
              disabled={aiPending}
              className="min-h-16 w-full min-w-0 flex-1 resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
            <Button
              type="button"
              onClick={onSubmitAi}
              disabled={aiPending || !aiPrompt.trim()}
              className="shrink-0 sm:self-end"
            >
              {aiPending ? "Envoi…" : "Envoyer"}
            </Button>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
