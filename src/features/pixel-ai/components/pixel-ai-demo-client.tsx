"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  StaticGridCanvas,
  type StaticGridHandle,
} from "@/features/pixel-ai/components/static-grid-canvas";
import { PixelGridToolbar } from "@/features/pixel-ai/components/pixel-grid-toolbar";
import { loadPixelsOntoGrid } from "@/features/pixel-ai/lib/apply-grid-snapshot";
import { MAX_GRID_CELLS } from "@/features/pixel-ai/lib/grid-limits";
import {
  deletePixelDrawing,
  getPixelDrawing,
  getPixelDrawingsStoreServerSnapshot,
  getPixelDrawingsStoreSnapshot,
  subscribePixelDrawingsStore,
  loadPixelDrawingOntoGrid,
  resetGridToNewDrawing,
  savePixelDrawing,
  snapshotGridAsPixelDrawing,
} from "@/features/pixel-ai/lib/pixel-drawing-storage";
import { postPixelAiCommand } from "@/features/pixel-ai/lib/post-pixel-ai-command";
import { usePixelAiHistory } from "@/features/pixel-ai/use-pixel-ai-history";
import { cn } from "@/lib/utils";

type Notice = {
  text: string;
  variant: "alert" | "info";
};

export function PixelAiDemoClient() {
  const gridRef = useRef<StaticGridHandle | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [gridSizeInputs, setGridSizeInputs] = useState({ x: "", y: "" });
  const [cellSizeInput, setCellSizeInput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const savedDrawings = useSyncExternalStore(
    subscribePixelDrawingsStore,
    getPixelDrawingsStoreSnapshot,
    getPixelDrawingsStoreServerSnapshot,
  );
  const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null);
  const [drawingName, setDrawingName] = useState("");

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

  const showAlert = useCallback((text: string) => {
    setNotice({ text, variant: "alert" });
  }, []);

  const showInfo = useCallback((text: string) => {
    setNotice({ text, variant: "info" });
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const {
    canUndo,
    canRedo,
    clearHistory,
    recordBeforeAiModification,
    discardLastUndoRecord,
    undo,
    redo,
  } = usePixelAiHistory({
    getGrid: () => gridRef.current,
    syncInputsFromGrid,
    onApplyError: showAlert,
  });

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
      clearNotice();
    } else {
      showAlert(
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
      showAlert("Entrez une valeur entière supérieure à 0.");
      syncInputsFromGrid();
      return;
    }
    if (!Number.isInteger(n)) {
      showAlert("La taille d'une cellule doit être un entier (en pixels).");
      syncInputsFromGrid();
      return;
    }
    if (n < 1) {
      showAlert("Entrez une valeur entière supérieure à 0.");
      syncInputsFromGrid();
      return;
    }

    grid.resize(`${n}px`);
    syncInputsFromGrid();
    clearNotice();
  };

  const handleSubmitAi = async () => {
    const grid = gridRef.current;
    if (!grid || aiPending) return;

    clearNotice();
    setAiPending(true);

    const result = await postPixelAiCommand({
      prompt: aiPrompt,
      gridSize: grid.gridSize,
      pixels: grid.getFilledCellsCoords(),
    });

    setAiPending(false);

    if (!result.ok) {
      showAlert(result.error);
      return;
    }

    recordBeforeAiModification();
    const loadError = loadPixelsOntoGrid(grid, { pixels: result.pixels });

    if (loadError) {
      discardLastUndoRecord();
      showAlert(loadError);
      return;
    }

    syncInputsFromGrid();
  };

  const handleActiveDrawingChange = (id: string | null) => {
    if (id === null) {
      setActiveDrawingId(null);
      setDrawingName("");
      clearHistory();
      clearNotice();
      return;
    }

    const drawing = getPixelDrawing(id);
    if (!drawing) {
      showAlert("Ce dessin n’existe plus.");
      setActiveDrawingId(null);
      setDrawingName("");
      return;
    }

    const grid = gridRef.current;
    if (!grid) return;

    const loadError = loadPixelDrawingOntoGrid(grid, drawing);
    if (loadError) {
      showAlert(loadError);
      return;
    }

    setActiveDrawingId(id);
    setDrawingName(drawing.name);
    syncInputsFromGrid();
    clearHistory();
    clearNotice();
  };

  const handleSaveDrawing = () => {
    const grid = gridRef.current;
    if (!grid) return;

    if (!drawingName.trim()) {
      showAlert("Le nom du dessin est requis.");
      return;
    }

    const id = activeDrawingId ?? crypto.randomUUID();
    const drawing = snapshotGridAsPixelDrawing(grid, id, drawingName);
    const saveError = savePixelDrawing(drawing);
    if (saveError) {
      showAlert(saveError);
      return;
    }

    setActiveDrawingId(id);
    setDrawingName(drawing.name);
    showInfo("Dessin enregistré.");
  };

  const handleNewDrawing = () => {
    const grid = gridRef.current;
    if (!grid) return;

    resetGridToNewDrawing(grid);
    setActiveDrawingId(null);
    setDrawingName("");
    syncInputsFromGrid();
    clearHistory();
    clearNotice();
  };

  const handleDeleteDrawing = () => {
    if (activeDrawingId === null) return;

    const deleteError = deletePixelDrawing(activeDrawingId);
    if (deleteError) {
      showAlert(deleteError);
      return;
    }

    const grid = gridRef.current;
    if (grid) {
      resetGridToNewDrawing(grid);
      syncInputsFromGrid();
    }

    setActiveDrawingId(null);
    setDrawingName("");
    clearHistory();
    showInfo("Dessin supprimé.");
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 [&_input]:h-8 [&_input]:rounded-md [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-2 [&_input]:py-1 [&_input]:text-sm [&_select]:h-8 [&_select]:rounded-md [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:px-2 [&_select]:text-sm">
      <section
        id="pixel-ai-grid"
        className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 bg-muted/20"
      >
        <div className="flex min-h-0 justify-center overflow-x-auto px-2 py-2">
          <StaticGridCanvas ref={gridRef} />
        </div>
      </section>
      {notice ? (
        <p
          className={cn(
            "px-2 text-center text-sm",
            notice.variant === "alert"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
          role={notice.variant === "alert" ? "alert" : "status"}
          aria-live="polite"
        >
          {notice.text}
        </p>
      ) : null}
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
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        savedDrawings={savedDrawings}
        activeDrawingId={activeDrawingId}
        onActiveDrawingChange={handleActiveDrawingChange}
        drawingName={drawingName}
        onDrawingNameChange={setDrawingName}
        onSaveDrawing={handleSaveDrawing}
        onNewDrawing={handleNewDrawing}
        onDeleteDrawing={handleDeleteDrawing}
      />
    </div>
  );
}
