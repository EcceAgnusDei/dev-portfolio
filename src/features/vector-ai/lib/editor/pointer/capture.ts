export function captureSvgPointer(
  svg: SVGSVGElement | null,
  pointerId: number,
): void {
  if (!svg) return;
  try {
    svg.setPointerCapture(pointerId);
  } catch {
    /* ignore */
  }
}

export function releaseSvgPointer(
  svg: SVGSVGElement | null,
  pointerId: number,
): void {
  if (!svg) return;
  try {
    if (svg.hasPointerCapture(pointerId)) {
      svg.releasePointerCapture(pointerId);
    }
  } catch {
    /* ignore */
  }
}
