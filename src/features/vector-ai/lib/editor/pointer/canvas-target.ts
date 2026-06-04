export function isCanvasBackgroundTarget(
  target: EventTarget | null,
  svg: SVGSVGElement | null,
): boolean {
  if (!(target instanceof Element)) return false;
  if (target.getAttribute("data-canvas-background") === "true") return true;
  if (svg && target === svg) return true;
  return false;
}
