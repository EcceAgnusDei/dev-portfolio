import type { ShapePresentation } from "@/features/vector-ai/lib/view/shape-presentation";

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function attrsToString(attrs: Record<string, string | number>): string {
  return Object.entries(attrs)
    .map(([key, value]) => `${camelToKebab(key)}="${escapeXmlAttr(String(value))}"`)
    .join(" ");
}

export function presentationToXml(presentation: ShapePresentation): string {
  const attrs = attrsToString(presentation.attrs);
  const inner =
    attrs.length > 0
      ? `<${presentation.tag} ${attrs}/>`
      : `<${presentation.tag}/>`;

  if (!presentation.groupTransform) return inner;

  const transform = escapeXmlAttr(presentation.groupTransform);
  return `<g transform="${transform}">${inner}</g>`;
}
