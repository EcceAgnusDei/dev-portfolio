import type { GridCoord } from "@/features/pixel-ai/lib/grid-coords";

export const ASCII_EMPTY = ".";
export const ASCII_FILLED = "#";

const FILLED_CHARS = new Set(["#", "1", "x", "X", "*"]);

export function isAsciiFilledChar(char: string): boolean {
  return FILLED_CHARS.has(char);
}

function coordKey(c: GridCoord): string {
  return `${c.x},${c.y}`;
}

export function dedupeCoords(cells: GridCoord[]): GridCoord[] {
  const seen = new Set<string>();
  const out: GridCoord[] = [];
  for (const c of cells) {
    const k = coordKey(c);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

function normalizeRowWidth(row: string, width: number): string {
  if (row.length >= width) return row.slice(0, width);
  return row + ASCII_EMPTY.repeat(width - row.length);
}

export function pixelsToAsciiRows(
  gridSize: GridCoord,
  pixels: GridCoord[],
): string[] {
  const filled = new Set(pixels.map(coordKey));
  const rows: string[] = [];
  for (let y = 1; y <= gridSize.y; y++) {
    let row = "";
    for (let x = 1; x <= gridSize.x; x++) {
      row += filled.has(`${x},${y}`) ? ASCII_FILLED : ASCII_EMPTY;
    }
    rows.push(row);
  }
  return rows;
}

export function asciiRowsToPixels(rows: string[]): {
  gridSize: GridCoord;
  pixels: GridCoord[];
} {
  const targetH = rows.length;
  const targetW = rows.reduce((m, r) => Math.max(m, r.length), 0);

  const gridSize: GridCoord = {
    x: Math.max(1, targetW),
    y: Math.max(1, targetH),
  };

  const normalized = rows.map((row) => normalizeRowWidth(row, gridSize.x));

  const pixels: GridCoord[] = [];
  for (let rowIndex = 0; rowIndex < gridSize.y; rowIndex++) {
    const y = rowIndex + 1;
    const row = normalized[rowIndex] ?? "";
    for (let colIndex = 0; colIndex < gridSize.x; colIndex++) {
      const char = row[colIndex];
      if (char && isAsciiFilledChar(char)) {
        pixels.push({ x: colIndex + 1, y });
      }
    }
  }

  return { gridSize, pixels: dedupeCoords(pixels) };
}
