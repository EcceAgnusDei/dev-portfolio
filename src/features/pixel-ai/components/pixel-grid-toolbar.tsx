"use client";

import { Button } from "@/components/ui/button";

type PixelGridToolbarProps = {
  gridSizeInputs: { x: string; y: string };
  onGridSizeInputChange: (field: "x" | "y", value: string) => void;
  onApplyGridSize: () => void;
  cellSizeInput: string;
  onCellSizeInputChange: (value: string) => void;
  onApplyCellSize: () => void;
};

export function PixelGridToolbar({
  gridSizeInputs,
  onGridSizeInputChange,
  onApplyGridSize,
  cellSizeInput,
  onCellSizeInputChange,
  onApplyCellSize,
}: PixelGridToolbarProps) {
  return (
    <div className="mx-auto flex w-full max-w-[min(28rem,100%)] flex-col items-center gap-4 md:max-w-[min(48rem,100%)]">
      <div className="flex w-full flex-wrap items-end justify-center gap-x-4 gap-y-2">
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
            />
            <input
              min={1}
              type="number"
              value={gridSizeInputs.y}
              onChange={(e) => onGridSizeInputChange("y", e.target.value)}
              placeholder="Hauteur (lignes)"
              aria-label="Hauteur de la grille en lignes"
              className="w-20 shrink-0"
            />
            <Button type="button" variant="secondary" onClick={onApplyGridSize}>
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
            />
            <Button type="button" variant="secondary" onClick={onApplyCellSize}>
              Ok
            </Button>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
