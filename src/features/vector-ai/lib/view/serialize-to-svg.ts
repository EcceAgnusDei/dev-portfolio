import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import {
  presentationFromShape,
  viewBoxToAttr,
} from "@/features/vector-ai/lib/view/shape-presentation";
import { presentationToXml } from "@/features/vector-ai/lib/view/presentation-to-xml";

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
