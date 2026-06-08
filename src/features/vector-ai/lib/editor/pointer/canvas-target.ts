function isShapeHitPassThrough(target: Element): boolean {
  return (
    target.namespaceURI === "http://www.w3.org/2000/svg" &&
    (target.localName === "line" || target.localName === "path")
  );
}

export function isCanvasBackgroundTarget(
  target: EventTarget | null,
  svg: SVGSVGElement | null,
  options?: { ignoreShapeHits?: boolean },
): boolean {
  if (!(target instanceof Element)) return false;
  if (target.getAttribute("data-canvas-background") === "true") return true;
  if (svg && target === svg) return true;
  if (options?.ignoreShapeHits && isShapeHitPassThrough(target)) return true;
  return false;
}
