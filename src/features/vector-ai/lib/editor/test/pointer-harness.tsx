import {
  act,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/core/state";
import {
  useVectorInteraction,
  type UseVectorInteractionResult,
} from "@/features/vector-ai/lib/editor/use-vector-interaction";

export type RenderedInteractionHook = {
  interaction: UseVectorInteractionResult;
  svgRef: RefObject<SVGSVGElement | null>;
  unmount: () => void;
};

vi.mock("@/features/vector-ai/lib/editor/geometry/screen-to-world", () => ({
  screenToWorld: vi.fn(
    (_svg: SVGSVGElement, clientX: number, clientY: number) => ({
      x: clientX,
      y: clientY,
    }),
  ),
}));

export function makePointerEvent(options: {
  pointerId?: number;
  clientX: number;
  clientY: number;
  target?: Element;
}): ReactPointerEvent {
  const target = options.target ?? document.createElement("div");
  return {
    pointerId: options.pointerId ?? 1,
    clientX: options.clientX,
    clientY: options.clientY,
    target,
    stopPropagation: vi.fn(),
  } as unknown as ReactPointerEvent;
}

export function canvasBackgroundTarget(): Element {
  const el = document.createElement("rect");
  el.setAttribute("data-canvas-background", "true");
  return el;
}

export function setupSvgRef(): RefObject<SVGSVGElement | null> {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setPointerCapture = vi.fn();
  svg.releasePointerCapture = vi.fn();
  svg.hasPointerCapture = vi.fn(() => true);
  return { current: svg };
}

export function renderInteractionHook(
  initialState: EditorState,
  dispatch: (action: EditorAction) => void,
): RenderedInteractionHook {
  const svgRef = setupSvgRef();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let interaction: UseVectorInteractionResult | null = null;
  let currentState = initialState;

  const wrappedDispatch = (action: EditorAction) => {
    if (action.type === "TOOL_SET") {
      currentState = { ...currentState, tool: action.tool };
    }
    dispatch(action);
    act(() => {
      root.render(<HookHost />);
    });
  };

  function HookHost() {
    interaction = useVectorInteraction({
      state: currentState,
      dispatch: wrappedDispatch,
      svgRef,
    });
    return null;
  }

  act(() => {
    root.render(<HookHost />);
  });

  if (interaction === null) {
    throw new Error("Hook non initialisé.");
  }

  return {
    get interaction(): UseVectorInteractionResult {
      if (interaction === null) {
        throw new Error("Hook non initialisé.");
      }
      return interaction;
    },
    svgRef,
    unmount() {
      act(() => {
        root.unmount();
        container.remove();
      });
    },
  };
}
