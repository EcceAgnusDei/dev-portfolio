"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  StaticGridCanvas,
  type StaticGridHandle,
} from "@/features/pixel-ai/components/static-grid-canvas";
import { PixelGridToolbar } from "@/features/pixel-ai/components/pixel-grid-toolbar";
import { applyPixelsToGrid } from "@/features/pixel-ai/lib/apply-grid-snapshot";
import { MAX_GRID_CELLS } from "@/features/pixel-ai/lib/grid-limits";
import { postPixelAiCommand } from "@/features/pixel-ai/lib/post-pixel-ai-command";

export function PixelAiDemoClient() {
  const gridRef = useRef<StaticGridHandle | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [gridSizeInputs, setGridSizeInputs] = useState({ x: "", y: "" });
  const [cellSizeInput, setCellSizeInput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPending, setAiPending] = useState(false);

  const syncInputsFromGrid = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    setGridSizeInputs({
      x: `${grid.gridSize.x}`,
      y: `${grid.gridSize.y}`,
    });
    const raw = String(grid.cellSize).replace(/px$/i, "").trim();
    setCellSizeInput(raw);
  }, []);

  useLayoutEffect(() => {
    syncInputsFromGrid();
  }, [syncInputsFromGrid]);

  const handleApplyGridSize = () => {
    const grid = gridRef.current;
    if (!grid) return;

    const x = parseInt(gridSizeInputs.x, 10);
    const y = parseInt(gridSizeInputs.y, 10);
    const total = x * y;
    if (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 1 &&
      y >= 1 &&
      total <= MAX_GRID_CELLS
    ) {
      const filledBefore = grid.getFilledCellsCoords();
      grid.resize({ x, y });
      grid.applyFilledCells(filledBefore);
      syncInputsFromGrid();
      setNoticeMessage(null);
    } else {
      setNoticeMessage(
        `Largeur et hauteur entières ≥ 1, avec au plus ${MAX_GRID_CELLS.toLocaleString("fr-FR")} cellules au total (largeur × hauteur).`,
      );
    }
  };

  const handleApplyCellSize = () => {
    const grid = gridRef.current;
    if (!grid) return;

    const trimmed = cellSizeInput.trim();
    const n = Number(trimmed);

    if (!Number.isFinite(n)) {
      setNoticeMessage("Entrez une valeur entière supérieure à 0.");
      syncInputsFromGrid();
      return;
    }
    if (!Number.isInteger(n)) {
      setNoticeMessage(
        "La taille d'une cellule doit être un entier (en pixels).",
      );
      syncInputsFromGrid();
      return;
    }
    if (n < 1) {
      setNoticeMessage("Entrez une valeur entière supérieure à 0.");
      syncInputsFromGrid();
      return;
    }

    grid.resize(`${n}px`);
    syncInputsFromGrid();
    setNoticeMessage(null);
  };

  const handleSubmitAi = async () => {
    const grid = gridRef.current;
    if (!grid || aiPending) return;

    setNoticeMessage(null);
    setAiPending(true);

    const result = await postPixelAiCommand({
      prompt: aiPrompt,
      gridSize: grid.gridSize,
      pixels: grid.getFilledCellsCoords(),
    });

    setAiPending(false);

    if (!result.ok) {
      setNoticeMessage(result.error);
      return;
    }

    const applyError = applyPixelsToGrid(grid, result.pixels);

    if (applyError) {
      setNoticeMessage(applyError);
      return;
    }

    syncInputsFromGrid();
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 [&_input]:h-8 [&_input]:rounded-md [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-2 [&_input]:py-1 [&_input]:text-sm">
      <section
        id="pixel-ai-grid"
        className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 bg-muted/20"
      >
        <div className="flex min-h-0 justify-center overflow-x-auto px-2 py-2">
          <StaticGridCanvas ref={gridRef} />
        </div>
      </section>
      <PixelGridToolbar
        gridSizeInputs={gridSizeInputs}
        onGridSizeInputChange={(field, value) =>
          setGridSizeInputs((s) => ({ ...s, [field]: value }))
        }
        onApplyGridSize={handleApplyGridSize}
        cellSizeInput={cellSizeInput}
        onCellSizeInputChange={setCellSizeInput}
        onApplyCellSize={handleApplyCellSize}
        aiPrompt={aiPrompt}
        onAiPromptChange={setAiPrompt}
        onSubmitAi={() => void handleSubmitAi()}
        aiPending={aiPending}
      />
      {noticeMessage ? (
        <p
          className="text-center text-sm text-destructive"
          role="status"
          aria-live="polite"
        >
          {noticeMessage}
        </p>
      ) : null}
    </div>
  );
}
