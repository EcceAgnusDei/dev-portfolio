import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";

type ViewBoxRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function readViewBox(svg: SVGSVGElement): ViewBoxRect {
  const base = svg.viewBox.baseVal;
  if (base.width > 0 && base.height > 0) {
    return { x: base.x, y: base.y, w: base.width, h: base.height };
  }

  const parsed = svg
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    parsed &&
    parsed.length === 4 &&
    parsed.every((value) => Number.isFinite(value)) &&
    parsed[2] > 0 &&
    parsed[3] > 0
  ) {
    return { x: parsed[0], y: parsed[1], w: parsed[2], h: parsed[3] };
  }

  const w = svg.clientWidth > 0 ? svg.clientWidth : 1;
  const h = svg.clientHeight > 0 ? svg.clientHeight : 1;
  return { x: 0, y: 0, w, h };
}

function worldToScreenFromViewBox(
  svg: SVGSVGElement,
  world: WorldPoint,
): { x: number; y: number } | null {
  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const viewBox = readViewBox(svg);
  const scaleX = rect.width / viewBox.w;
  const scaleY = rect.height / viewBox.h;
  const x = rect.left + (world.x - viewBox.x) * scaleX;
  const y = rect.top + (world.y - viewBox.y) * scaleY;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return { x, y };
}

function readScreenCtm(svg: SVGSVGElement): DOMMatrix | null {
  if (typeof svg.getScreenCTM !== "function") return null;
  return svg.getScreenCTM();
}

export function screenToWorld(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): WorldPoint | null {
  const ctm = readScreenCtm(svg);
  if (!ctm) {
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const viewBox = readViewBox(svg);
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const x = viewBox.x + (clientX - rect.left) * scaleX;
    const y = viewBox.y + (clientY - rect.top) * scaleY;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const world = pt.matrixTransform(ctm.inverse());
  if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) return null;

  return { x: world.x, y: world.y };
}

export function worldToScreen(
  svg: SVGSVGElement,
  world: WorldPoint,
): { x: number; y: number } | null {
  const ctm = readScreenCtm(svg);
  if (ctm) {
    const pt = svg.createSVGPoint();
    pt.x = world.x;
    pt.y = world.y;
    const screen = pt.matrixTransform(ctm);
    if (!Number.isFinite(screen.x) || !Number.isFinite(screen.y)) return null;

    return { x: screen.x, y: screen.y };
  }

  return worldToScreenFromViewBox(svg, world);
}

export function worldToContainerOffset(
  svg: SVGSVGElement,
  container: HTMLElement,
  world: WorldPoint,
): { left: number; top: number } | null {
  const point = worldToScreen(svg, world);
  if (!point) return null;

  const containerRect = container.getBoundingClientRect();
  return {
    left: point.x - containerRect.left,
    top: point.y - containerRect.top,
  };
}
