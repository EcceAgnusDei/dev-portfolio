import {
  act,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import { VectorEditorToolbar } from "@/features/vector-ai/components/vector-editor-toolbar";
import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import {
  planDrawingLoad,
  saveDrawingFromDoc,
} from "@/features/vector-ai/lib/drawing-persistence";
import {
  canRedo,
  canUndo,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/core/state";
import {
  commitViewBoxSizeActions,
  parseViewBoxDimensionInput,
} from "@/features/vector-ai/lib/editor/dispatch/commit-viewbox";
import { viewBoxHandleWorldPoint } from "@/features/vector-ai/lib/editor/geometry/resize-viewbox";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  changeNumberInput,
  changeTextInput,
  clickButton,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import type { ViewBoxResizeHandle } from "@/features/vector-ai/lib/editor/session/types";
import {
  useVectorInteraction,
  type UseVectorInteractionResult,
} from "@/features/vector-ai/lib/editor/use-vector-interaction";
import {
  getVectorDrawingsStoreServerSnapshot,
  getVectorDrawingsStoreSnapshot,
  subscribeVectorDrawingsStore,
} from "@/features/vector-ai/lib/vector-drawing-storage";
import { VECTOR_AI_DEFAULT_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";

export type RenderViewBoxWorkflowOptions = {
  aiPending?: boolean;
  saveIdFactory?: () => string;
};

export type RenderedViewBoxWorkflow = {
  container: HTMLDivElement;
  getState: () => EditorState;
  get interaction(): UseVectorInteractionResult;
  getInitialShapes: () => EditorState["doc"]["shapes"];
  openDimensions: () => Promise<void>;
  setPlanWidth: (value: string) => void;
  setPlanHeight: (value: string) => void;
  confirmDimensions: () => void;
  clickUndo: () => void;
  clickRedo: () => void;
  setDrawingName: (name: string) => void;
  saveDrawing: () => void;
  selectDrawing: (id: string | null) => void;
  dragHandle: (handle: ViewBoxResizeHandle, to: WorldPoint) => void;
  moveHandle: (handle: ViewBoxResizeHandle, to: WorldPoint) => void;
  cancelHandleDrag: () => void;
  queryHandle: (handle: ViewBoxResizeHandle) => Element | null;
  getCanvasViewBoxAttr: () => string | null;
  isDimensionsDisabled: () => boolean;
  unmount: () => Promise<void>;
};

function findToolbarButton(
  container: ParentNode,
  label: string,
): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent === label,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Bouton introuvable : ${label}`);
  }
  return button;
}

function queryPlanWidthInput(root: ParentNode = document): HTMLInputElement {
  const input = root.querySelector('input[aria-label="Largeur du plan"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Champ largeur du plan introuvable.");
  }
  return input;
}

function queryPlanHeightInput(root: ParentNode = document): HTMLInputElement {
  const input = root.querySelector('input[aria-label="Hauteur du plan"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Champ hauteur du plan introuvable.");
  }
  return input;
}

function findDimensionsOkButton(): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll("button")).find(
    (node) => node.textContent === "OK",
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Bouton OK du menu Dimensions introuvable.");
  }
  return button;
}

async function flushUi() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

async function waitForDimensionsMenu() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const input = document.querySelector('input[aria-label="Largeur du plan"]');
    if (input instanceof HTMLInputElement) return;
    await flushUi();
  }
  throw new Error("Menu Dimensions non ouvert.");
}

function queryDrawingNameInput(container: ParentNode): HTMLInputElement {
  const input = container.querySelector('input[aria-label="Nom du dessin"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Champ nom du dessin introuvable.");
  }
  return input;
}

function queryDrawingSelect(container: ParentNode): HTMLSelectElement {
  const select = container.querySelector(
    'select[aria-label="Choisir un dessin enregistré"]',
  );
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error("Liste des dessins introuvable.");
  }
  return select;
}

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

function pointerDownOnHandle(
  workflow: RenderedViewBoxWorkflow,
  handle: ViewBoxResizeHandle,
): { svg: SVGSVGElement; pointerId: number; down: WorldPoint } {
  const down = viewBoxHandleWorldPoint(workflow.getState().doc.viewBox, handle);
  const handleEl = workflow.queryHandle(handle);
  if (!handleEl) {
    throw new Error(`Poignée ${handle} introuvable.`);
  }
  const svg = querySvg(workflow.container);
  const pointerId = 1;
  dispatchPointerEvent(handleEl, "pointerdown", {
    clientX: down.x,
    clientY: down.y,
    pointerId,
  });
  return { svg, pointerId, down };
}

export function renderViewBoxWorkflow(
  initialState: EditorState,
  options: RenderViewBoxWorkflowOptions = {},
): RenderedViewBoxWorkflow {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const initialShapes = initialState.doc.shapes;
  const aiPending = options.aiPending ?? false;
  const saveIdFactory = options.saveIdFactory;

  let currentState = initialState;
  let interaction: UseVectorInteractionResult | null = null;

  const dispatch = (action: EditorAction) => {
    currentState = editorReducer(currentState, action);
    rerender();
  };

  const rerender = () => {
    act(() => {
      root.render(<ViewBoxWorkflowHost />);
    });
  };

  function ViewBoxWorkflowHost() {
    const [viewBoxWidthDraft, setViewBoxWidthDraft] = useState(() =>
      String(currentState.doc.viewBox.w),
    );
    const [viewBoxHeightDraft, setViewBoxHeightDraft] = useState(() =>
      String(currentState.doc.viewBox.h),
    );
    const [viewBoxHandlesVisible, setViewBoxHandlesVisible] = useState(false);
    const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null);
    const [drawingName, setDrawingName] = useState("");
    const svgRef = useRef<SVGSVGElement>(null);
    const state = currentState;

    const savedDrawings = useSyncExternalStore(
      subscribeVectorDrawingsStore,
      getVectorDrawingsStoreSnapshot,
      getVectorDrawingsStoreServerSnapshot,
    );

    interaction = useVectorInteraction({
      state,
      dispatch,
      svgRef,
      viewBoxHandlesVisible,
      aiPending,
    });

    const handleViewBoxDimensionsOpenChange = useCallback(
      (open: boolean, opening = false) => {
        setViewBoxHandlesVisible(open);
        if (opening) {
          setViewBoxWidthDraft(String(state.doc.viewBox.w));
          setViewBoxHeightDraft(String(state.doc.viewBox.h));
        }
      },
      [state.doc.viewBox.h, state.doc.viewBox.w],
    );

    const handleViewBoxOk = useCallback(() => {
      const { w: currentW, h: currentH } = state.doc.viewBox;
      const w = parseViewBoxDimensionInput(viewBoxWidthDraft, currentW);
      const h = parseViewBoxDimensionInput(viewBoxHeightDraft, currentH);
      const actions = commitViewBoxSizeActions(state.doc.viewBox, {
        widthDraft: viewBoxWidthDraft,
        heightDraft: viewBoxHeightDraft,
      });
      for (const action of actions) {
        dispatch(action);
      }
      setViewBoxWidthDraft(String(w));
      setViewBoxHeightDraft(String(h));
    }, [state.doc.viewBox, viewBoxHeightDraft, viewBoxWidthDraft]);

    const handleSaveDrawing = useCallback(() => {
      const result = saveDrawingFromDoc({
        doc: state.doc,
        activeDrawingId,
        drawingName,
        idFactory: saveIdFactory,
      });
      if (!result.ok) return;
      setActiveDrawingId(result.id);
      setDrawingName(result.name);
    }, [activeDrawingId, drawingName, state.doc]);

    const handleActiveDrawingChange = useCallback((id: string | null) => {
      const plan = planDrawingLoad(id);
      if (!plan.ok) return;
      interaction?.clearTextEditSession();
      dispatch({ type: "EDITOR_LOAD", doc: plan.doc });
      setActiveDrawingId(plan.activeDrawingId);
      setDrawingName(plan.drawingName);
    }, []);

    return (
      <>
        <VectorEditorToolbar
          activeTool={state.tool}
          onToolChange={interaction.setTool}
          canUndo={canUndo(state)}
          canRedo={canRedo(state)}
          onUndo={() => dispatch({ type: "UNDO" })}
          onRedo={() => dispatch({ type: "REDO" })}
          onExportSvg={() => {}}
          onDownloadSvg={() => {}}
          savedDrawings={savedDrawings}
          activeDrawingId={activeDrawingId}
          onActiveDrawingChange={handleActiveDrawingChange}
          drawingName={drawingName}
          onDrawingNameChange={setDrawingName}
          onSaveDrawing={handleSaveDrawing}
          saveDrawingDisabled={aiPending}
          fontSizeDraft={String(VECTOR_AI_DEFAULT_FONT_SIZE)}
          fontSizeFallback={VECTOR_AI_DEFAULT_FONT_SIZE}
          fontSizeEnabled={false}
          onFontSizeDraftChange={() => {}}
          canDelete={false}
          onDelete={() => {}}
          canReorder={false}
          zOrderAvailability={{
            front: false,
            forward: false,
            backward: false,
            back: false,
          }}
          onZOrderCommand={() => {}}
          styleControl={interaction.styleControl}
          styleControlsEnabled={!aiPending}
          onStylePatch={interaction.applyStyleControlPatch}
          viewBoxWidthDraft={viewBoxWidthDraft}
          viewBoxHeightDraft={viewBoxHeightDraft}
          onViewBoxWidthDraftChange={setViewBoxWidthDraft}
          onViewBoxHeightDraftChange={setViewBoxHeightDraft}
          onViewBoxOk={handleViewBoxOk}
          onViewBoxDimensionsOpenChange={handleViewBoxDimensionsOpenChange}
          viewBoxControlsDisabled={aiPending}
        />
        <VectorCanvasInteractive
          svgRef={svgRef}
          interaction={interaction}
          doc={state.doc}
          selectedIds={state.selection.ids}
          viewBoxHandlesVisible={viewBoxHandlesVisible}
        />
      </>
    );
  }

  rerender();

  if (interaction === null) {
    throw new Error("Harness viewBox non initialisé.");
  }

  const workflow: RenderedViewBoxWorkflow = {
    container,
    getState: () => currentState,
    get interaction(): UseVectorInteractionResult {
      if (interaction === null) {
        throw new Error("Harness viewBox non initialisé.");
      }
      return interaction;
    },
    getInitialShapes: () => initialShapes,
    async openDimensions() {
      clickButton(findToolbarButton(container, "Dimensions"));
      await waitForDimensionsMenu();
    },
    setPlanWidth(value: string) {
      changeNumberInput(queryPlanWidthInput(), value);
    },
    setPlanHeight(value: string) {
      changeNumberInput(queryPlanHeightInput(), value);
    },
    confirmDimensions() {
      clickButton(findDimensionsOkButton());
    },
    clickUndo() {
      clickButton(findToolbarButton(container, "Annuler"));
    },
    clickRedo() {
      clickButton(findToolbarButton(container, "Rétablir"));
    },
    setDrawingName(name: string) {
      changeTextInput(queryDrawingNameInput(container), name);
    },
    saveDrawing() {
      clickButton(findToolbarButton(container, "Enregistrer"));
    },
    selectDrawing(id: string | null) {
      const select = queryDrawingSelect(container);
      act(() => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          "value",
        )?.set;
        if (!setter) {
          throw new Error("Impossible de définir la valeur du select.");
        }
        setter.call(select, id ?? "");
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      rerender();
    },
    dragHandle(handle: ViewBoxResizeHandle, to: WorldPoint) {
      const { svg, pointerId } = pointerDownOnHandle(workflow, handle);
      dispatchPointerEvent(svg, "pointermove", {
        clientX: to.x,
        clientY: to.y,
        pointerId,
      });
      dispatchPointerEvent(svg, "pointerup", {
        clientX: to.x,
        clientY: to.y,
        pointerId,
      });
      rerender();
    },
    moveHandle(handle: ViewBoxResizeHandle, to: WorldPoint) {
      const { svg, pointerId } = pointerDownOnHandle(workflow, handle);
      dispatchPointerEvent(svg, "pointermove", {
        clientX: to.x,
        clientY: to.y,
        pointerId,
      });
      rerender();
    },
    cancelHandleDrag() {
      const svg = querySvg(container);
      dispatchPointerEvent(svg, "pointercancel", {
        clientX: 0,
        clientY: 0,
        pointerId: 1,
      });
      rerender();
    },
    queryHandle(handle: ViewBoxResizeHandle) {
      return container.querySelector(`[data-viewbox-handle="${handle}"]`);
    },
    getCanvasViewBoxAttr() {
      return querySvg(container).getAttribute("viewBox");
    },
    isDimensionsDisabled() {
      return findToolbarButton(container, "Dimensions").disabled;
    },
    async unmount() {
      await flushUi();
      act(() => {
        root.unmount();
        container.remove();
      });
    },
  };

  return workflow;
}

export function viewBoxToAttr(viewBox: ViewBox): string {
  return `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;
}
