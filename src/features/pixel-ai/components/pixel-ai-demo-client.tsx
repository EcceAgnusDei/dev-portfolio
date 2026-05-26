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

export function PixelAiDemoClient() {
  const gridRef = useRef<StaticGridHandle | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
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
    onApplyError: setNoticeMessage,
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

    recordBeforeAiModification();
    const loadError = loadPixelsOntoGrid(grid, { pixels: result.pixels });

    if (loadError) {
      discardLastUndoRecord();
      setNoticeMessage(loadError);
      return;
    }

    syncInputsFromGrid();
  };

  const handleActiveDrawingChange = (id: string | null) => {
    if (id === null) {
      setActiveDrawingId(null);
      setDrawingName("");
      clearHistory();
      setNoticeMessage(null);
      return;
    }

    const drawing = getPixelDrawing(id);
    if (!drawing) {
      setNoticeMessage("Ce dessin n’existe plus.");
      setActiveDrawingId(null);
      setDrawingName("");
      return;
    }

    const grid = gridRef.current;
    if (!grid) return;

    const loadError = loadPixelDrawingOntoGrid(grid, drawing);
    if (loadError) {
      setNoticeMessage(loadError);
      return;
    }

    setActiveDrawingId(id);
    setDrawingName(drawing.name);
    syncInputsFromGrid();
    clearHistory();
    setNoticeMessage(null);
  };

  const handleSaveDrawing = () => {
    const grid = gridRef.current;
    if (!grid) return;

    if (!drawingName.trim()) {
      setNoticeMessage("Le nom du dessin est requis.");
      return;
    }

    const id = activeDrawingId ?? crypto.randomUUID();
    const drawing = snapshotGridAsPixelDrawing(grid, id, drawingName);
    const saveError = savePixelDrawing(drawing);
    if (saveError) {
      setNoticeMessage(saveError);
      return;
    }

    setActiveDrawingId(id);
    setDrawingName(drawing.name);
    setNoticeMessage("Dessin enregistré.");
  };

  const handleNewDrawing = () => {
    const grid = gridRef.current;
    if (!grid) return;

    resetGridToNewDrawing(grid);
    setActiveDrawingId(null);
    setDrawingName("");
    syncInputsFromGrid();
    clearHistory();
    setNoticeMessage(null);
  };

  const handleDeleteDrawing = () => {
    if (activeDrawingId === null) return;

    const deleteError = deletePixelDrawing(activeDrawingId);
    if (deleteError) {
      setNoticeMessage(deleteError);
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
    setNoticeMessage("Dessin supprimé.");
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
      {noticeMessage ? (
        <p
          className="text-center text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {noticeMessage}
        </p>
      ) : null}
    </div>
  );
}
