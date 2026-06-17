import { VECTOR_AI_PREVIEW_PNG_MAX_LONG_EDGE } from "@/features/vector-ai/lib/ai/config";
import type { VectorDoc, ViewBox } from "@/features/vector-ai/lib/document/types";
import {
  presentationFromShape,
  viewBoxToAttr,
} from "@/features/vector-ai/lib/view/shape-presentation";
import { presentationToXml } from "@/features/vector-ai/lib/view/presentation-to-xml";

export function computeAiPreviewPixelSize(
  viewBox: ViewBox,
  maxLongEdge: number = VECTOR_AI_PREVIEW_PNG_MAX_LONG_EDGE,
): { width: number; height: number } {
  const { w, h } = viewBox;
  if (w <= 0 || h <= 0) {
    return { width: maxLongEdge, height: maxLongEdge };
  }
  const scale = maxLongEdge / Math.max(w, h);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

export type SerializeToSvgOptions = {
  width?: number;
  height?: number;
};

export function serializeToSvg(
  doc: VectorDoc,
  options?: SerializeToSvgOptions,
): string {
  const { viewBox } = doc;
  const vb = viewBoxToAttr(viewBox);
  const widthAttr =
    options?.width != null ? ` width="${options.width}"` : "";
  const heightAttr =
    options?.height != null ? ` height="${options.height}"` : "";

  const body = doc.shapes
    .map((shape) => presentationToXml(presentationFromShape(shape)))
    .join("\n  ");

  const shapesBlock = body.length > 0 ? `\n  ${body}\n` : "\n";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${widthAttr}${heightAttr}>${shapesBlock}</svg>`;
}

export function serializeToSvgForAiPreview(
  doc: VectorDoc,
  maxLongEdge: number = VECTOR_AI_PREVIEW_PNG_MAX_LONG_EDGE,
): string {
  const { viewBox } = doc;
  const { width, height } = computeAiPreviewPixelSize(viewBox, maxLongEdge);
  const vb = viewBoxToAttr(viewBox);

  const body = doc.shapes
    .map((shape) => presentationToXml(presentationFromShape(shape)))
    .join("\n  ");

  const shapesBlock = body.length > 0 ? `\n  ${body}\n` : "\n";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${width}" height="${height}">
  <rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.w}" height="${viewBox.h}" fill="#ffffff"/>${shapesBlock}</svg>`;
}
