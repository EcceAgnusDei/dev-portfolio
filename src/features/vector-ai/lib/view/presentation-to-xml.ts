import { textRenderPosition } from "@/features/vector-ai/lib/editor/geometry/text-bounds";
import {
  splitTextLines,
  textLineHeight,
} from "@/features/vector-ai/lib/editor/geometry/text-lines";
import type { ShapePresentation } from "@/features/vector-ai/lib/view/shape-presentation";

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function attrsToString(attrs: Record<string, string | number>): string {
  return Object.entries(attrs)
    .map(([key, value]) => `${camelToKebab(key)}="${escapeXmlAttr(String(value))}"`)
    .join(" ");
}

function textInnerXml(
  content: string,
  x: string | number,
  fontSize: number,
): string {
  const lines = splitTextLines(content);
  const lineHeight = textLineHeight(fontSize);

  return lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      const dyAttr = dy === 0 ? "" : ` dy="${dy}"`;
      return `<tspan x="${escapeXmlAttr(String(x))}"${dyAttr}>${escapeXmlText(line)}</tspan>`;
    })
    .join("");
}

export function presentationToXml(presentation: ShapePresentation): string {
  const closeTag = `</${presentation.tag}>`;

  const inner =
    presentation.tag === "text"
      ? (() => {
          const fontSize = Number(presentation.attrs.fontSize ?? 16);
          const { x, y } = textRenderPosition({
            transform: {
              x: Number(presentation.attrs.x),
              y: Number(presentation.attrs.y),
            },
            content: presentation.textContent ?? "",
            fontSize,
          });
          const attrs = attrsToString({ ...presentation.attrs, x, y });
          const openTag =
            attrs.length > 0
              ? `<${presentation.tag} ${attrs}>`
              : `<${presentation.tag}>`;
          return `${openTag}${textInnerXml(
            presentation.textContent ?? "",
            x,
            fontSize,
          )}${closeTag}`;
        })()
      : (() => {
          const attrs = attrsToString(presentation.attrs);
          return attrs.length > 0
            ? `<${presentation.tag} ${attrs}/>`
            : `<${presentation.tag}/>`;
        })();

  if (!presentation.groupTransform) return inner;

  const transform = escapeXmlAttr(presentation.groupTransform);
  return `<g transform="${transform}">${inner}</g>`;
}
