import {
  act,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import {
  VectorEditorBottomToolbar,
  VectorEditorPrimaryToolbar,
} from "@/features/vector-ai/components/vector-editor-toolbar";
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
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  changeNumberInput,
  changeTextInput,
  clickButton,
  makePointerEvent,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import {
  useVectorInteraction,
  type UseVectorInteractionResult,
} from "@/features/vector-ai/lib/editor/use-vector-interaction";
import {
  canStepDisplayZoomIn,
  canStepDisplayZoomOut,
  getCanvasZoomedRemSize,
  stepDisplayZoom,
} from "@/features/vector-ai/lib/view/display-zoom";
import {
  getVectorDrawingsStoreServerSnapshot,
  getVectorDrawingsStoreSnapshot,
  subscribeVectorDrawingsStore,
} from "@/features/vector-ai/lib/vector-drawing-storage";
import { VECTOR_AI_DEFAULT_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";

export type RenderZoomWorkflowOptions = {
  aiPending?: boolean;
  saveIdFactory?: () => string;
};

export type RenderedZoomWorkflow = {
  container: HTMLDivElement;
  getState: () => EditorState;
  get interaction(): UseVectorInteractionResult;
  getInitialState: () => EditorState;
  clickZoomIn: () => void;
  clickZoomOut: () => void;
  clickZoomReset: () => void;
  clickUndo: () => void;
  openDimensions: () => Promise<void>;
  setPlanWidth: (value: string) => void;
  setPlanHeight: (value: string) => void;
  confirmDimensions: () => void;
  setDrawingName: (name: string) => void;
  saveDrawing: () => void;
  selectDrawing: (id: string | null) => void;
  selectShape: (shapeId: string, world: WorldPoint) => void;
  getZoomPercentLabel: () => string;
  isZoomInDisabled: () => boolean;
  isZoomOutDisabled: () => boolean;
  isZoomResetDisabled: () => boolean;
  getCanvasStyle: () => { width: string; height: string };
  getCanvasViewBoxAttr: () => string | null;
  unmount: () => Promise<void>;
};

function queryZoomButton(
  container: ParentNode,
  label: string,
): HTMLButtonElement {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Bouton zoom introuvable : ${label}`);
  }
  return button;
}

function queryPlanWidthInput(): HTMLInputElement {
  const input = document.querySelector('input[aria-label="Largeur du plan"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Champ largeur du plan introuvable.");
  }
  return input;
}

function queryPlanHeightInput(): HTMLInputElement {
  const input = document.querySelector('input[aria-label="Hauteur du plan"]');
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

function queryCanvas(container: ParentNode): HTMLDivElement {
  const canvas = container.querySelector("[data-zoom-canvas]");
  if (!(canvas instanceof HTMLDivElement)) {
    throw new Error("Conteneur du canvas introuvable.");
  }
  return canvas;
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

export function expectedCanvasRemSize(viewBox: ViewBox, displayZoom: number) {
  const size = getCanvasZoomedRemSize(viewBox, displayZoom);
  return {
    width: size.width as string,
    height: size.height as string,
  };
}

export function renderZoomWorkflow(
  initialState: EditorState,
  options: RenderZoomWorkflowOptions = {},
): RenderedZoomWorkflow {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const initialSnapshot = initialState;
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
      root.render(<ZoomWorkflowHost />);
    });
  };

  function ZoomWorkflowHost() {
    const [viewBoxWidthDraft, setViewBoxWidthDraft] = useState(() =>
      String(currentState.doc.viewBox.w),
    );
    const [viewBoxHeightDraft, setViewBoxHeightDraft] = useState(() =>
      String(currentState.doc.viewBox.h),
    );
    const [viewBoxHandlesVisible, setViewBoxHandlesVisible] = useState(false);
    const [displayZoom, setDisplayZoom] = useState(1);
    const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null);
    const [drawingName, setDrawingName] = useState("");
    const svgRef = useRef<SVGSVGElement>(null);
    const state = currentState;

    const savedDrawings = useSyncExternalStore(
      subscribeVectorDrawingsStore,
      getVectorDrawingsStoreSnapshot,
      getVectorDrawingsStoreServerSnapshot,
    );

    const activeInteraction = useVectorInteraction({
      state,
      dispatch,
      svgRef,
      viewBoxHandlesVisible,
      aiPending,
    });
    interaction = activeInteraction;

    const { w: viewBoxW, h: viewBoxH } = activeInteraction.displayDoc.viewBox;

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

    const handleZoomIn = useCallback(() => {
      setDisplayZoom((current) => stepDisplayZoom(current, "in"));
    }, []);

    const handleZoomOut = useCallback(() => {
      setDisplayZoom((current) => stepDisplayZoom(current, "out"));
    }, []);

    const handleZoomReset = useCallback(() => {
      setDisplayZoom(1);
    }, []);

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
      setDisplayZoom(1);
    }, []);

    const canvasZoomStyle = useMemo(
      () => getCanvasZoomedRemSize({ w: viewBoxW, h: viewBoxH }, displayZoom),
      [displayZoom, viewBoxH, viewBoxW],
    );

    return (
      <>
        <VectorEditorPrimaryToolbar
          activeTool={state.tool}
          onToolChange={activeInteraction.setTool}
          canUndo={canUndo(state)}
          canRedo={canRedo(state)}
          onUndo={() => dispatch({ type: "UNDO" })}
          onRedo={() => dispatch({ type: "REDO" })}
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
          styleControl={activeInteraction.styleControl}
          styleControlsEnabled={!aiPending}
          onStylePatch={activeInteraction.applyStyleControlPatch}
        />
        <div data-zoom-canvas style={canvasZoomStyle}>
          <VectorCanvasInteractive
            svgRef={svgRef}
            interaction={activeInteraction}
            doc={state.doc}
            selectedIds={state.selection.ids}
            viewBoxHandlesVisible={viewBoxHandlesVisible}
          />
        </div>
        <VectorEditorBottomToolbar
          onExportSvg={() => {}}
          onDownloadSvg={() => {}}
          savedDrawings={savedDrawings}
          activeDrawingId={activeDrawingId}
          onActiveDrawingChange={handleActiveDrawingChange}
          drawingName={drawingName}
          onDrawingNameChange={setDrawingName}
          onSaveDrawing={handleSaveDrawing}
          saveDrawingDisabled={aiPending}
          viewBoxWidthDraft={viewBoxWidthDraft}
          viewBoxHeightDraft={viewBoxHeightDraft}
          onViewBoxWidthDraftChange={setViewBoxWidthDraft}
          onViewBoxHeightDraftChange={setViewBoxHeightDraft}
          onViewBoxOk={handleViewBoxOk}
          onViewBoxDimensionsOpenChange={handleViewBoxDimensionsOpenChange}
          viewBoxControlsDisabled={aiPending}
          displayZoom={displayZoom}
          canZoomIn={canStepDisplayZoomIn(displayZoom)}
          canZoomOut={canStepDisplayZoomOut(displayZoom)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          displayZoomControlsDisabled={aiPending}
          statusText=""
        />
      </>
    );
  }

  rerender();

  if (interaction === null) {
    throw new Error("Harness zoom non initialisé.");
  }

  const workflow: RenderedZoomWorkflow = {
    container,
    getState: () => currentState,
    get interaction(): UseVectorInteractionResult {
      if (interaction === null) {
        throw new Error("Harness zoom non initialisé.");
      }
      return interaction;
    },
    getInitialState: () => initialSnapshot,
    clickZoomIn() {
      clickButton(queryZoomButton(container, "Zoom avant"));
      rerender();
    },
    clickZoomOut() {
      clickButton(queryZoomButton(container, "Zoom arrière"));
      rerender();
    },
    clickZoomReset() {
      clickButton(queryZoomButton(container, "Zoom à 100 %"));
      rerender();
    },
    clickUndo() {
      clickButton(findToolbarButton(container, "Annuler"));
      rerender();
    },
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
      rerender();
    },
    setDrawingName(name: string) {
      changeTextInput(queryDrawingNameInput(container), name);
    },
    saveDrawing() {
      clickButton(findToolbarButton(container, "Enregistrer"));
      rerender();
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
    selectShape(shapeId: string, world: WorldPoint) {
      if (interaction === null) {
        throw new Error("Harness zoom non initialisé.");
      }
      const event = makePointerEvent({
        clientX: world.x,
        clientY: world.y,
      });
      act(() => {
        interaction!.onShapePointerDown(shapeId, event);
      });
      rerender();
    },
    getZoomPercentLabel() {
      return queryZoomButton(container, "Zoom à 100 %").textContent ?? "";
    },
    isZoomInDisabled() {
      return queryZoomButton(container, "Zoom avant").disabled;
    },
    isZoomOutDisabled() {
      return queryZoomButton(container, "Zoom arrière").disabled;
    },
    isZoomResetDisabled() {
      return queryZoomButton(container, "Zoom à 100 %").disabled;
    },
    getCanvasStyle() {
      const canvas = queryCanvas(container);
      return {
        width: canvas.style.width,
        height: canvas.style.height,
      };
    },
    getCanvasViewBoxAttr() {
      return querySvg(container).getAttribute("viewBox");
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
