export type GridCoord = { x: number; y: number };

export function toCellIndex(x: number, y: number, maxX: number): number {
  return (y - 1) * maxX + (x - 1);
}

export function cellIndexToCoord(
  idx: number,
  maxX: number,
): { x: number; y: number } {
  return {
    x: (idx % maxX) + 1,
    y: Math.floor(idx / maxX) + 1,
  };
}
