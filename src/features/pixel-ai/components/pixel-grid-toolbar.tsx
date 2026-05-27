"use client";

import { Button } from "@/components/ui/button";
import { PIXEL_AI_PROMPT_MAX_LENGTH } from "@/features/pixel-ai/lib/pixel-ai-config";

import type { PixelDrawingListItem } from "@/features/pixel-ai/lib/pixel-drawing-storage";

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
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  savedDrawings: PixelDrawingListItem[];
  activeDrawingId: string | null;
  onActiveDrawingChange: (id: string | null) => void;
  drawingName: string;
  onDrawingNameChange: (value: string) => void;
  onSaveDrawing: () => void;
  onNewDrawing: () => void;
  onDeleteDrawing: () => void;
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  savedDrawings,
  activeDrawingId,
  onActiveDrawingChange,
  drawingName,
  onDrawingNameChange,
  onSaveDrawing,
  onNewDrawing,
  onDeleteDrawing,
}: PixelGridToolbarProps) {
  return (
    <div className="mx-auto flex w-full max-w-[min(64rem,100%)] flex-col gap-4">
      <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Commande IA</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-center">
          <textarea
            value={aiPrompt}
            onChange={(e) => onAiPromptChange(e.target.value)}
            placeholder="Que voulez-vous que je dessine?"
            aria-label="Commande pour modifier le dessin avec l'IA"
            rows={2}
            maxLength={PIXEL_AI_PROMPT_MAX_LENGTH}
            disabled={aiPending}
            className="min-h-16 w-full min-w-0 flex-1 resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm sm:max-w-xl"
          />
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              onClick={onSubmitAi}
              disabled={aiPending || !aiPrompt.trim()}
            >
              {aiPending ? "Envoi…" : "Envoyer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onUndo}
              disabled={aiPending || !canUndo}
              aria-label="Annuler la dernière modification IA"
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRedo}
              disabled={aiPending || !canRedo}
              aria-label="Rétablir la modification IA annulée"
            >
              Refaire
            </Button>
          </div>
        </div>
      </fieldset>
      <fieldset className="flex w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Vos dessins</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
            <span className="sr-only">Choisir un dessin</span>
            <select
              value={activeDrawingId ?? ""}
              onChange={(e) =>
                onActiveDrawingChange(e.target.value ? e.target.value : null)
              }
              disabled={aiPending}
              aria-label="Choisir un dessin enregistré"
              className="h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Brouillon (non enregistré)</option>
              {savedDrawings.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
            <span className="text-xs text-muted-foreground">Nom</span>
            <input
              type="text"
              value={drawingName}
              onChange={(e) => onDrawingNameChange(e.target.value)}
              placeholder="Nom du dessin"
              maxLength={100}
              disabled={aiPending}
              aria-label="Nom du dessin"
              className="h-8 w-full min-w-0"
            />
          </label>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveDrawing}
              disabled={aiPending}
            >
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onNewDrawing}
              disabled={aiPending}
            >
              Nouveau
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onDeleteDrawing}
              disabled={aiPending || activeDrawingId === null}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-2">
        <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="text-center text-sm font-medium">
            Taille de la grille (colonnes × lignes)
          </legend>
          <div className="flex flex-wrap items-end justify-center gap-2">
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
          <legend className="text-center text-sm font-medium">
            Taille des cellules (px)
          </legend>
          <div className="flex flex-wrap items-end justify-center gap-2">
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
    </div>
  );
}
