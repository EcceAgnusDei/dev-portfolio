"use client";

import { VECTOR_AI_PREVIEW_PNG_MAX_LONG_EDGE } from "@/features/vector-ai/lib/vector-ai-config";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import {
  computeAiPreviewPixelSize,
  serializeToSvgForAiPreview,
} from "@/features/vector-ai/lib/view/serialize-to-svg";

export type RasterizeDocResult =
  | { ok: true; base64: string; mimeType: "image/png" }
  | { ok: false; error: string };

async function svgStringToPngBase64(
  svg: string,
  width: number,
  height: number,
): Promise<RasterizeDocResult> {
  let objectUrl: string | undefined;

  try {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg_load_failed"));
      img.src = objectUrl!;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ok: false, error: "Canvas indisponible." };
    }

    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/png");
    const prefix = "data:image/png;base64,";
    if (!dataUrl.startsWith(prefix)) {
      return { ok: false, error: "Export PNG échoué." };
    }

    return {
      ok: true,
      base64: dataUrl.slice(prefix.length),
      mimeType: "image/png",
    };
  } catch {
    return { ok: false, error: "Rasterisation échouée." };
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function rasterizeDocToPng(
  doc: VectorDoc,
): Promise<RasterizeDocResult> {
  const maxLongEdge = VECTOR_AI_PREVIEW_PNG_MAX_LONG_EDGE;
  const svg = serializeToSvgForAiPreview(doc, maxLongEdge);
  const { width, height } = computeAiPreviewPixelSize(doc.viewBox, maxLongEdge);
  return svgStringToPngBase64(svg, width, height);
}
