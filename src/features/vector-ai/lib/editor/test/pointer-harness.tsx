import {
  act,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import { VectorEditorToolbar } from "@/features/vector-ai/components/vector-editor-toolbar";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/core/state";
import {
  useVectorInteraction,
  type UseVectorInteractionResult,
} from "@/features/vector-ai/lib/editor/use-vector-interaction";

export type RenderedInteractionHook = {
  get interaction(): UseVectorInteractionResult;
  svgRef: RefObject<SVGSVGElement | null>;
  unmount: () => void;
};

export type RenderedInteractiveCanvas = {
  get interaction(): UseVectorInteractionResult;
  container: HTMLDivElement;
  svgRef: RefObject<SVGSVGElement | null>;
  getState: () => EditorState;
  unmount: () => void;
};

export type RenderedStyleToolbar = {
  container: HTMLDivElement;
  getState: () => EditorState;
  unmount: () => void;
};

export function queryColorInput(
  container: ParentNode,
  ariaLabel: string,
): HTMLInputElement {
  const input = container.querySelector(
    `input[type="color"][aria-label="${ariaLabel}"]`,
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Input couleur introuvable : ${ariaLabel}`);
  }
  return input;
}

export function queryColorFieldNoneButton(
  container: ParentNode,
  colorAriaLabel: string,
): HTMLButtonElement {
  const input = queryColorInput(container, colorAriaLabel);
  const button = input.parentElement?.querySelector("button");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Bouton Aucun introuvable pour : ${colorAriaLabel}`);
  }
  return button;
}

export function queryStrokeWidthInput(container: ParentNode): HTMLInputElement {
  const input = container.querySelector(
    'input[type="number"][aria-label="Épaisseur du contour"]',
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Input épaisseur du contour introuvable.");
  }
  return input;
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  if (!setter) {
    throw new Error("Impossible de définir la valeur native de l'input.");
  }
  setter.call(input, value);
}

export function changeColorInput(input: HTMLInputElement, hex: string) {
  act(() => {
    setNativeInputValue(input, hex);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export function changeNumberInput(input: HTMLInputElement, value: string) {
  act(() => {
    setNativeInputValue(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export function clickButton(button: HTMLButtonElement) {
  act(() => {
    button.click();
  });
}

vi.mock("@/features/vector-ai/lib/editor/geometry/screen-to-world", () => ({
  screenToWorld: vi.fn(
    (_svg: SVGSVGElement, clientX: number, clientY: number) => ({
      x: clientX,
      y: clientY,
    }),
  ),
  worldToScreen: vi.fn(
    (_svg: SVGSVGElement, world: { x: number; y: number }) => ({
      x: world.x,
      y: world.y,
    }),
  ),
}));

export function makeDoubleClickEvent(options?: {
  target?: Element;
}): React.MouseEvent {
  const target = options?.target ?? document.createElement("div");
  return {
    target,
    stopPropagation: vi.fn(),
  } as unknown as React.MouseEvent;
}

export function makePointerEvent(options: {
  pointerId?: number;
  clientX: number;
  clientY: number;
  detail?: number;
  timeStamp?: number;
  target?: Element;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): ReactPointerEvent {
  const target = options.target ?? document.createElement("div");
  return {
    pointerId: options.pointerId ?? 1,
    clientX: options.clientX,
    clientY: options.clientY,
    detail: options.detail ?? 1,
    timeStamp: options.timeStamp ?? 0,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
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
    currentState = editorReducer(currentState, action);
    dispatch(action);
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

export function renderInteractiveCanvas(
  initialState: EditorState,
): RenderedInteractiveCanvas {
  const svgRef = setupSvgRef();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let interaction: UseVectorInteractionResult | null = null;
  let currentState = initialState;

  const dispatch = (action: EditorAction) => {
    currentState = editorReducer(currentState, action);
    rerender();
  };

  function rerender() {
    act(() => {
      root.render(<InteractiveCanvasHost />);
    });
  }

  function InteractiveCanvasHost() {
    interaction = useVectorInteraction({
      state: currentState,
      dispatch,
      svgRef,
    });
    return (
      <VectorCanvasInteractive
        svgRef={svgRef}
        interaction={interaction}
        doc={currentState.doc}
        selectedIds={currentState.selection.ids}
      />
    );
  }

  rerender();

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
    container,
    svgRef,
    getState: () => currentState,
    unmount() {
      act(() => {
        root.unmount();
        container.remove();
      });
    },
  };
}

export function renderStyleToolbarHarness(
  initialState: EditorState,
): RenderedStyleToolbar {
  const svgRef = setupSvgRef();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let currentState = initialState;

  const dispatch = (action: EditorAction) => {
    currentState = editorReducer(currentState, action);
    rerender();
  };

  function rerender() {
    act(() => {
      root.render(<StyleToolbarHost />);
    });
  }

  function StyleToolbarHost() {
    const interaction = useVectorInteraction({
      state: currentState,
      dispatch,
      svgRef,
    });

    return (
      <VectorEditorToolbar
        activeTool={currentState.tool}
        onToolChange={interaction.setTool}
        canUndo={false}
        canRedo={false}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        onExportSvg={() => {}}
        fontSizeDraft="16"
        fontSizeFallback={16}
        fontSizeEnabled={false}
        onFontSizeDraftChange={() => {}}
        canDelete={false}
        onDelete={() => {}}
        canReorder={interaction.canReorderSelectedShapes}
        zOrderAvailability={interaction.zOrderAvailability}
        onZOrderCommand={interaction.reorderSelectedShapes}
        styleControl={interaction.styleControl}
        styleControlsEnabled
        onStylePatch={interaction.applyStyleControlPatch}
      />
    );
  }

  rerender();

  return {
    container,
    getState: () => currentState,
    unmount() {
      act(() => {
        root.unmount();
        container.remove();
      });
    },
  };
}
