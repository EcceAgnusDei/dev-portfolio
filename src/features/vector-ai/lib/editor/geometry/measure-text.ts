import { VECTOR_AI_TEXT_LINE_HEIGHT_FACTOR } from "@/features/vector-ai/lib/vector-ai-config";

const ESTIMATED_CHAR_WIDTH_TO_FONT_SIZE = 0.55;

let measureContext: CanvasRenderingContext2D | null | undefined;

function readMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext;

  if (typeof document === "undefined") {
    measureContext = null;
    return measureContext;
  }

  const canvas = document.createElement("canvas");
  measureContext = canvas.getContext("2d");
  return measureContext;
}

function buildCanvasFont(fontSize: number, fontFamily: string): string {
  return `${fontSize}px ${fontFamily}`;
}

function estimateLineWidth(line: string, fontSize: number): number {
  return line.length > 0 ? line.length * fontSize * ESTIMATED_CHAR_WIDTH_TO_FONT_SIZE : 0;
}

export function measureTextLineWidth(
  line: string,
  fontSize: number,
  fontFamily: string,
): number {
  const ctx = readMeasureContext();
  if (!ctx) return estimateLineWidth(line, fontSize);

  ctx.font = buildCanvasFont(fontSize, fontFamily);
  const width = ctx.measureText(line).width;
  if (!Number.isFinite(width) || width <= 0) {
    return estimateLineWidth(line, fontSize);
  }

  return width;
}

export function measureTextBlockWidth(
  lines: string[],
  fontSize: number,
  fontFamily: string,
): number {
  if (lines.length === 0) return 0;

  let maxWidth = 0;
  for (const line of lines) {
    maxWidth = Math.max(
      maxWidth,
      measureTextLineWidth(line, fontSize, fontFamily),
    );
  }

  return maxWidth;
}

export function measureTextLineHeight(
  line: string,
  fontSize: number,
  fontFamily: string,
): number {
  const fallback = fontSize * VECTOR_AI_TEXT_LINE_HEIGHT_FACTOR;
  const ctx = readMeasureContext();
  if (!ctx) return fallback;

  ctx.font = buildCanvasFont(fontSize, fontFamily);
  const metrics = ctx.measureText(line.length > 0 ? line : " ");
  const measured = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  if (!Number.isFinite(measured) || measured <= 0) return fallback;

  return Math.max(fallback, measured);
}

export function measureTextBlockHeight(
  lines: string[],
  fontSize: number,
  fontFamily: string,
): number {
  if (lines.length === 0) return fontSize * VECTOR_AI_TEXT_LINE_HEIGHT_FACTOR;

  let height = 0;
  for (let index = 0; index < lines.length; index++) {
    height += measureTextLineHeight(lines[index], fontSize, fontFamily);
  }

  return height;
}
