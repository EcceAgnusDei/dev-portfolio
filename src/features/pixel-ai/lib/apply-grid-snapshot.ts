import type { GridCoord } from "@/features/pixel-ai/lib/grid-coords";
import { MAX_GRID_CELLS } from "@/features/pixel-ai/lib/pixel-ai-config";

export const GRID_PATTERN_MARGIN = 10;

export type GridSnapshotTarget = {
  resize: (value: string | GridCoord) => void;
  applyFilledCells: (coords: GridCoord[]) => void;
  gridSize: GridCoord;
};

export type GridWithCellSize = GridSnapshotTarget & {
  cellSize: string;
};

export type LoadPixelsOntoGridInput = {
  pixels: GridCoord[];
  gridSize?: GridCoord;
  cellSize?: string;
};

export type GridStateSnapshot = {
  gridSize: GridCoord;
  cellSize: string;
  pixels: GridCoord[];
};

export type GridStateSource = GridWithCellSize & {
  getFilledCellsCoords: () => GridCoord[];
};

export function snapshotGridState(grid: GridStateSource): GridStateSnapshot {
  return {
    gridSize: { ...grid.gridSize },
    cellSize: grid.cellSize,
    pixels: grid.getFilledCellsCoords(),
  };
}

function coordsExceedGrid(coords: GridCoord[], gridSize: GridCoord): boolean {
  for (const c of coords) {
    if (c.x < 1 || c.x > gridSize.x || c.y < 1 || c.y > gridSize.y) return true;
  }
  return false;
}

function expandCoordsWithGridMargin(
  coords: GridCoord[],
  currentSize: GridCoord,
): { ok: true; coords: GridCoord[]; gridSize: GridCoord } | { ok: false; error: string } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of coords) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }

  const margin = GRID_PATTERN_MARGIN;
  const translateX = Math.max(0, margin + 1 - minX);
  const translateY = Math.max(0, margin + 1 - minY);
  const fitted = coords.map((c) => ({
    x: c.x + translateX,
    y: c.y + translateY,
  }));

  let fitMaxX = -Infinity;
  let fitMaxY = -Infinity;
  for (const c of fitted) {
    fitMaxX = Math.max(fitMaxX, c.x);
    fitMaxY = Math.max(fitMaxY, c.y);
  }

  const gridSize = {
    x: Math.max(currentSize.x, fitMaxX + margin),
    y: Math.max(currentSize.y, fitMaxY + margin),
  };
  const total = gridSize.x * gridSize.y;
  if (total > MAX_GRID_CELLS) {
    return {
      ok: false,
      error: `Impossible d’agrandir la grille : au plus ${MAX_GRID_CELLS.toLocaleString("fr-FR")} cellules (largeur × hauteur).`,
    };
  }

  return { ok: true, coords: fitted, gridSize };
}

function applyPixels(grid: GridSnapshotTarget, pixels: GridCoord[]): string | null {
  if (pixels.length === 0) {
    grid.applyFilledCells([]);
    return null;
  }

  const currentSize = grid.gridSize;

  if (!coordsExceedGrid(pixels, currentSize)) {
    grid.applyFilledCells(pixels);
    return null;
  }

  const expanded = expandCoordsWithGridMargin(pixels, currentSize);
  if (!expanded.ok) return expanded.error;

  if (
    expanded.gridSize.x !== currentSize.x ||
    expanded.gridSize.y !== currentSize.y
  ) {
    grid.resize(expanded.gridSize);
  }
  grid.applyFilledCells(expanded.coords);
  return null;
}

export function loadPixelsOntoGrid(
  grid: GridWithCellSize,
  input: LoadPixelsOntoGridInput,
): string | null {
  if (input.gridSize) {
    const target = input.gridSize;
    if (target.x !== grid.gridSize.x || target.y !== grid.gridSize.y) {
      grid.resize(target);
    }
  }

  const applyError = applyPixels(grid, input.pixels);
  if (applyError) return applyError;

  if (input.cellSize && input.cellSize !== grid.cellSize) {
    grid.resize(input.cellSize);
  }

  return null;
}
