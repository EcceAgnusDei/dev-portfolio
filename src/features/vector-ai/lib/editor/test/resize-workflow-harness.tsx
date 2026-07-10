import { act } from "react";
import { vi } from "vitest";

import type { EditorState } from "@/features/vector-ai/lib/editor/core/state";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import type { LineEnd } from "@/features/vector-ai/lib/editor/session/types";
import {
  renderInteractiveCanvas,
  type RenderedInteractiveCanvas,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";

export type RenderedResizeWorkflow = RenderedInteractiveCanvas & {
  queryRectResizeHit(): Element | null;
  queryLineHandle(end: LineEnd): Element | null;
  queryContentRect(): Element | null;
  queryContentCircle(): Element | null;
  pointerDown(
    target: Element,
    world: WorldPoint,
  ): { svg: SVGSVGElement; pointerId: number };
  pointerMove(world: WorldPoint, pointerId?: number): void;
  pointerUp(world: WorldPoint, pointerId?: number): void;
  drag(target: Element, down: WorldPoint, to: WorldPoint): void;
};

function querySvg(container: ParentNode): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error("Canvas SVG introuvable.");
  }
  ensureSvgPointerCapture(svg);
  return svg;
}

function ensureSvgPointerCapture(svg: SVGSVGElement) {
  if (!svg.setPointerCapture) {
    svg.setPointerCapture = vi.fn();
  }
  if (!svg.releasePointerCapture) {
    svg.releasePointerCapture = vi.fn();
  }
  if (!svg.hasPointerCapture) {
    svg.hasPointerCapture = vi.fn(() => true);
  }
}

function dispatchPointerEvent(
  target: Element,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  options: { clientX: number; clientY: number; pointerId?: number },
) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: options.pointerId ?? 1,
        clientX: options.clientX,
        clientY: options.clientY,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
  });
}

export function renderResizeWorkflow(
  initialState: EditorState,
): RenderedResizeWorkflow {
  const canvas = renderInteractiveCanvas(initialState);
  const { container } = canvas;
  const defaultPointerId = 1;

  return {
    ...canvas,
    queryRectResizeHit() {
      return container.querySelector("[data-rect-resize-hit]");
    },
    queryLineHandle(end: LineEnd) {
      return container.querySelector(`[data-line-handle="${end}"]`);
    },
    queryContentRect() {
      return (
        container
          .querySelector('[data-layer="content"]')
          ?.querySelector("rect") ?? null
      );
    },
    queryContentCircle() {
      return (
        container
          .querySelector('[data-layer="content"]')
          ?.querySelector("circle") ?? null
      );
    },
    pointerDown(target, world) {
      dispatchPointerEvent(target, "pointerdown", {
        clientX: world.x,
        clientY: world.y,
        pointerId: defaultPointerId,
      });
      return { svg: querySvg(container), pointerId: defaultPointerId };
    },
    pointerMove(world, pointerId = defaultPointerId) {
      dispatchPointerEvent(querySvg(container), "pointermove", {
        clientX: world.x,
        clientY: world.y,
        pointerId,
      });
    },
    pointerUp(world, pointerId = defaultPointerId) {
      dispatchPointerEvent(querySvg(container), "pointerup", {
        clientX: world.x,
        clientY: world.y,
        pointerId,
      });
    },
    drag(target, down, to) {
      this.pointerDown(target, down);
      this.pointerMove(to);
      this.pointerUp(to);
    },
  };
}
