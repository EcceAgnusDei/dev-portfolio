import { z } from "zod";

import {
  loadPixelsOntoGrid,
  snapshotGridState,
  type GridStateSource,
  type GridWithCellSize,
} from "@/features/pixel-ai/lib/apply-grid-snapshot";

const LOCAL_STORAGE_KEY = "dev-portfolio:pixel-ai-drawings";
const DRAWINGS_STORE_EVENT = "dev-portfolio:pixel-ai-drawings-store-change";

const gridCoordSchema = z.object({
  x: z.number().int().min(1),
  y: z.number().int().min(1),
});

const gridSizeSchema = z.object({
  x: z.number().int().min(1),
  y: z.number().int().min(1),
});

const pixelDrawingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  updatedAt: z.number(),
  gridSize: gridSizeSchema,
  cellSize: z.string().min(1).optional(),
  pixels: z.array(gridCoordSchema),
});

const drawingStoreSchema = z.record(z.string(), pixelDrawingSchema);

export type PixelDrawing = z.infer<typeof pixelDrawingSchema>;

export type PixelDrawingListItem = Pick<
  PixelDrawing,
  "id" | "name" | "updatedAt"
>;

function readStore(): Record<string, PixelDrawing> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  const result = drawingStoreSchema.safeParse(parsed);
  return result.success ? result.data : {};
}

function notifyDrawingsStoreChange(): void {
  if (typeof window === "undefined") return;
  cachedClientStoreRaw = null;
  window.dispatchEvent(new Event(DRAWINGS_STORE_EVENT));
}

function writeStore(drawings: Record<string, PixelDrawing>): string | null {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(drawings));
    notifyDrawingsStoreChange();
    return null;
  } catch {
    return "Impossible d’enregistrer : stockage local plein ou indisponible.";
  }
}

export function listPixelDrawings(): PixelDrawingListItem[] {
  const store = readStore();
  return Object.values(store)
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function subscribePixelDrawingsStore(
  onStoreChange: () => void,
): () => void {
  window.addEventListener(DRAWINGS_STORE_EVENT, onStoreChange);
  return () => window.removeEventListener(DRAWINGS_STORE_EVENT, onStoreChange);
}

const EMPTY_PIXEL_DRAWINGS_LIST: PixelDrawingListItem[] = [];

let cachedClientSnapshot = EMPTY_PIXEL_DRAWINGS_LIST;
let cachedClientStoreRaw: string | null = null;

export function getPixelDrawingsStoreSnapshot(): PixelDrawingListItem[] {
  if (typeof window === "undefined") {
    return EMPTY_PIXEL_DRAWINGS_LIST;
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw === cachedClientStoreRaw) {
    return cachedClientSnapshot;
  }

  cachedClientStoreRaw = raw;
  cachedClientSnapshot =
    raw === null ? EMPTY_PIXEL_DRAWINGS_LIST : listPixelDrawings();
  return cachedClientSnapshot;
}

export function getPixelDrawingsStoreServerSnapshot(): PixelDrawingListItem[] {
  return EMPTY_PIXEL_DRAWINGS_LIST;
}

export function getPixelDrawing(id: string): PixelDrawing | null {
  return readStore()[id] ?? null;
}

export function deletePixelDrawing(id: string): string | null {
  const store = readStore();
  if (!store[id]) return null;
  const next = { ...store };
  delete next[id];
  return writeStore(next);
}

export function savePixelDrawing(drawing: PixelDrawing): string | null {
  const parsed = pixelDrawingSchema.safeParse(drawing);
  if (!parsed.success) {
    return "Données de dessin invalides.";
  }
  const store = readStore();
  return writeStore({ ...store, [parsed.data.id]: parsed.data });
}

export function loadPixelDrawingOntoGrid(
  grid: GridWithCellSize,
  drawing: PixelDrawing,
): string | null {
  return loadPixelsOntoGrid(grid, {
    gridSize: drawing.gridSize,
    pixels: drawing.pixels,
    cellSize: drawing.cellSize ?? grid.cellSize,
  });
}

export function snapshotGridAsPixelDrawing(
  grid: GridStateSource,
  id: string,
  name: string,
): PixelDrawing {
  const state = snapshotGridState(grid);
  return {
    id,
    name: name.trim(),
    updatedAt: Date.now(),
    gridSize: state.gridSize,
    cellSize: state.cellSize,
    pixels: state.pixels,
  };
}

export const DEFAULT_NEW_DRAWING_GRID_SIZE = { x: 50, y: 30 };
export const DEFAULT_NEW_DRAWING_CELL_SIZE = "20px";

export function resetGridToNewDrawing(grid: GridStateSource): void {
  grid.resize(DEFAULT_NEW_DRAWING_GRID_SIZE);
  grid.applyFilledCells([]);
  grid.resize(DEFAULT_NEW_DRAWING_CELL_SIZE);
}
