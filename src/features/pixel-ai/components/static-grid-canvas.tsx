"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  type MouseEvent,
  useRef,
  useState,
} from "react";

import {
  cellIndexToCoord,
  toCellIndex,
  type GridCoord,
} from "@/features/pixel-ai/lib/grid-coords";

export type StaticGridHandle = {
  getFilledCellsCoords: () => GridCoord[];
  applyFilledCells: (coords: GridCoord[]) => void;
  resize: (value: string | GridCoord) => void;
  gridSize: GridCoord;
  cellSize: string;
};

type ThemeColors = {
  fg: string;
  bg: string;
  border: string;
};

const DEFAULT_GRID = { x: 50, y: 30 };
const DEFAULT_CELL_SIZE = "20px";

function parseCellPx(cellSize: string): number {
  const n = Number.parseInt(cellSize, 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function readThemeColors(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  return {
    fg: cs.getPropertyValue("--foreground").trim() || "#000000",
    bg: cs.getPropertyValue("--background").trim() || "#ffffff",
    border: cs.getPropertyValue("--border").trim() || "#000000",
  };
}

function normalizeFilledToIndexSet(
  coords: GridCoord[] | null,
  gridSize: GridCoord,
): Set<number> {
  if (!coords?.length) return new Set<number>();
  const out = new Set<number>();
  for (const c of coords) {
    const x = Math.trunc(c.x);
    const y = Math.trunc(c.y);
    if (x < 1 || x > gridSize.x || y < 1 || y > gridSize.y) continue;
    out.add(toCellIndex(x, y, gridSize.x));
  }
  return out;
}

function reindexFilledForResize(
  prevFilled: Set<number>,
  prevSize: GridCoord,
  nextSize: GridCoord,
): Set<number> {
  const nextFilled = new Set<number>();
  for (const idx of prevFilled) {
    const { x, y } = cellIndexToCoord(idx, prevSize.x);
    if (x < 1 || x > nextSize.x || y < 1 || y > nextSize.y) continue;
    nextFilled.add(toCellIndex(x, y, nextSize.x));
  }
  return nextFilled;
}

function setupCanvas(
  canvas: HTMLCanvasElement,
  widthPx: number,
  heightPx: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = Math.max(1, Math.floor(widthPx * dpr));
  canvas.height = Math.max(1, Math.floor(heightPx * dpr));
  canvas.style.width = `${widthPx}px`;
  canvas.style.height = `${heightPx}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function paintCell(
  ctx: CanvasRenderingContext2D,
  idx: number,
  width: number,
  cellPx: number,
  color: string,
) {
  const { x, y } = cellIndexToCoord(idx, width);
  const px = (x - 1) * cellPx;
  const py = (y - 1) * cellPx;
  const inset = cellPx >= 3 ? 1 : 0;
  const side = Math.max(1, cellPx - inset * 2);
  ctx.fillStyle = color;
  ctx.fillRect(px + inset, py + inset, side, side);
}

function drawCanvas(opts: {
  canvas: HTMLCanvasElement;
  gridSize: GridCoord;
  cellPx: number;
  colors: ThemeColors;
  filled: Set<number>;
}) {
  const { canvas, gridSize, cellPx, colors, filled } = opts;
  const { x: w, y: h } = gridSize;
  const wPx = w * cellPx;
  const hPx = h * cellPx;

  const ctx = setupCanvas(canvas, wPx, hPx);
  if (!ctx) return;

  ctx.clearRect(0, 0, wPx, hPx);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, wPx, hPx);

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < w; i++) {
    const x = i * cellPx + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, hPx);
  }
  ctx.moveTo(wPx - 0.5, 0);
  ctx.lineTo(wPx - 0.5, hPx);

  for (let j = 0; j < h; j++) {
    const y = j * cellPx + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(wPx, y);
  }
  ctx.moveTo(0, hPx - 0.5);
  ctx.lineTo(wPx, hPx - 0.5);
  ctx.stroke();

  for (const idx of filled) {
    paintCell(ctx, idx, w, cellPx, colors.fg);
  }
}

export const StaticGridCanvas = forwardRef<StaticGridHandle>(
  function StaticGridCanvas(_, ref) {
    const [gridSize, setGridSize] = useState<GridCoord>(DEFAULT_GRID);
    const [cellSize, setCellSize] = useState<string>(DEFAULT_CELL_SIZE);
    const [filled, setFilled] = useState<Set<number>>(() => new Set());

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const filledRef = useRef(filled);
    const gridSizeRef = useRef(gridSize);
    const cellSizeRef = useRef(cellSize);

    filledRef.current = filled;
    gridSizeRef.current = gridSize;
    cellSizeRef.current = cellSize;

    const cellPx = useMemo(() => parseCellPx(cellSize), [cellSize]);
    const cssCanvasSize = useMemo(() => {
      const wPx = gridSize.x * cellPx;
      const hPx = gridSize.y * cellPx;
      return { wPx, hPx };
    }, [gridSize.x, gridSize.y, cellPx]);

    const repaintAll = useCallback(
      (filledSet: Set<number>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        drawCanvas({
          canvas,
          gridSize,
          cellPx,
          colors: readThemeColors(),
          filled: filledSet,
        });
      },
      [gridSize, cellPx],
    );

    const toggleCell = useCallback(
      (x: number, y: number) => {
        const idx = toCellIndex(x, y, gridSizeRef.current.x);
        setFilled((prev) => {
          const next = new Set(prev);
          if (next.has(idx)) {
            next.delete(idx);
          } else {
            next.add(idx);
          }
          filledRef.current = next;
          repaintAll(next);
          return next;
        });
      },
      [repaintAll],
    );

    const handleCanvasClick = useCallback(
      (event: MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        const x = Math.floor(localX / cellPx) + 1;
        const y = Math.floor(localY / cellPx) + 1;

        if (
          x < 1 ||
          x > gridSizeRef.current.x ||
          y < 1 ||
          y > gridSizeRef.current.y
        ) {
          return;
        }
        toggleCell(x, y);
      },
      [cellPx, toggleCell],
    );

    useLayoutEffect(() => {
      repaintAll(filledRef.current);
    }, [repaintAll]);

    useImperativeHandle(
      ref,
      () => ({
        get gridSize() {
          return { ...gridSizeRef.current };
        },
        get cellSize() {
          return cellSizeRef.current;
        },
        getFilledCellsCoords: () => {
          const out: GridCoord[] = [];
          const width = gridSizeRef.current.x;
          for (const idx of filledRef.current) {
            const { x, y } = cellIndexToCoord(idx, width);
            out.push({ x, y });
          }
          return out;
        },
        applyFilledCells: (coords: GridCoord[]) => {
          const next = normalizeFilledToIndexSet(coords, gridSizeRef.current);
          filledRef.current = next;
          setFilled(next);
          repaintAll(next);
        },
        resize: (value) => {
          if (typeof value === "string") {
            cellSizeRef.current = value;
            setCellSize(value);
            return;
          }

          const nextSize = { x: value.x, y: value.y };
          const migrated = reindexFilledForResize(
            filledRef.current,
            gridSizeRef.current,
            nextSize,
          );
          filledRef.current = migrated;
          setFilled(migrated);
          setGridSize(nextSize);
          gridSizeRef.current = nextSize;
        },
      }),
      [repaintAll],
    );

    return (
      <div
        className="relative block"
        style={{
          width: `${cssCanvasSize.wPx}px`,
          height: `${cssCanvasSize.hPx}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="block cursor-crosshair"
          aria-label="Grille de dessin. Cliquez pour colorier une cellule."
        />
      </div>
    );
  },
);

StaticGridCanvas.displayName = "StaticGridCanvas";
