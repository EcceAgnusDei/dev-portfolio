import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import { VectorCanvasInteractive } from "@/features/vector-ai/components/vector-canvas-interactive";
import {
  VectorEditorBottomToolbar,
  VectorEditorPrimaryToolbar,
} from "@/features/vector-ai/components/vector-editor-toolbar";
import {
  canRedo,
  canUndo,
} from "@/features/vector-ai/lib/editor/core/editor-queries";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/core/state";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
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
} from "@/features/vector-ai/lib/view/display-zoom";
import { VECTOR_AI_DEFAULT_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";

export type RenderDeletionWorkflowOptions = {
  aiPending?: boolean;
};

export type RenderedDeletionWorkflow = {
  container: HTMLDivElement;
  getState: () => EditorState;
  get interaction(): UseVectorInteractionResult;
  clickClear: () => void;
  clickDeleteSelected: () => void;
  clickUndo: () => void;
  clickRedo: () => void;
  isClearDisabled: () => boolean;
  isDeleteDisabled: () => boolean;
  selectShape: (shapeId: string, world: WorldPoint) => void;
  countRenderedShapes: () => number;
  unmount: () => void;
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

function countContentShapes(container: ParentNode): number {
  const layer = container.querySelector('[data-layer="content"]');
  if (!(layer instanceof SVGGElement)) {
    throw new Error("Couche de contenu SVG introuvable.");
  }
  return layer.childElementCount;
}

export function renderDeletionWorkflow(
  initialState: EditorState,
  options: RenderDeletionWorkflowOptions = {},
): RenderedDeletionWorkflow {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const aiPending = options.aiPending ?? false;

  let currentState = initialState;
  let interaction: UseVectorInteractionResult | null = null;

  const dispatch = (action: EditorAction) => {
    currentState = editorReducer(currentState, action);
    rerender();
  };

  const rerender = () => {
    act(() => {
      root.render(<DeletionWorkflowHost />);
    });
  };

  function DeletionWorkflowHost() {
    const svgRef = useRef<SVGSVGElement>(null);
    const state = currentState;

    const activeInteraction = useVectorInteraction({
      state,
      dispatch,
      svgRef,
      aiPending,
    });
    interaction = activeInteraction;

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
          canDelete={!aiPending && activeInteraction.canDeleteSelectedShape}
          onDelete={activeInteraction.deleteSelectedShape}
          canReorder={!aiPending && activeInteraction.canReorderSelectedShapes}
          zOrderAvailability={activeInteraction.zOrderAvailability}
          onZOrderCommand={activeInteraction.reorderSelectedShapes}
          styleControl={activeInteraction.styleControl}
          styleControlsEnabled={!aiPending}
          onStylePatch={activeInteraction.applyStyleControlPatch}
        />
        <VectorCanvasInteractive
          svgRef={svgRef}
          interaction={activeInteraction}
          doc={state.doc}
          selectedIds={state.selection.ids}
        />
        <VectorEditorBottomToolbar
          onExportSvg={() => {}}
          onDownloadSvg={() => {}}
          savedDrawings={[]}
          activeDrawingId={null}
          onActiveDrawingChange={() => {}}
          drawingName=""
          onDrawingNameChange={() => {}}
          onSaveDrawing={() => {}}
          saveDrawingDisabled={aiPending}
          viewBoxWidthDraft={String(state.doc.viewBox.w)}
          viewBoxHeightDraft={String(state.doc.viewBox.h)}
          onViewBoxWidthDraftChange={() => {}}
          onViewBoxHeightDraftChange={() => {}}
          onViewBoxOk={() => {}}
          viewBoxControlsDisabled={aiPending}
          displayZoom={1}
          canZoomIn={canStepDisplayZoomIn(1)}
          canZoomOut={canStepDisplayZoomOut(1)}
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onZoomReset={() => {}}
          displayZoomControlsDisabled={aiPending}
          canClear={activeInteraction.canClearAllShapes}
          onClear={activeInteraction.clearAllShapes}
          clearDisabled={aiPending}
        />
      </>
    );
  }

  rerender();

  if (interaction === null) {
    throw new Error("Harness suppression non initialisé.");
  }

  return {
    container,
    getState: () => currentState,
    get interaction(): UseVectorInteractionResult {
      if (interaction === null) {
        throw new Error("Harness suppression non initialisé.");
      }
      return interaction;
    },
    clickClear() {
      clickButton(findToolbarButton(container, "Effacer"));
      rerender();
    },
    clickDeleteSelected() {
      clickButton(findToolbarButton(container, "Supprimer"));
      rerender();
    },
    clickUndo() {
      clickButton(findToolbarButton(container, "Annuler"));
      rerender();
    },
    clickRedo() {
      clickButton(findToolbarButton(container, "Rétablir"));
      rerender();
    },
    isClearDisabled() {
      return findToolbarButton(container, "Effacer").disabled;
    },
    isDeleteDisabled() {
      return findToolbarButton(container, "Supprimer").disabled;
    },
    selectShape(shapeId: string, world: WorldPoint) {
      if (interaction === null) {
        throw new Error("Harness suppression non initialisé.");
      }
      act(() => {
        interaction!.onShapePointerDown(
          shapeId,
          makePointerEvent({
            clientX: world.x,
            clientY: world.y,
          }),
        );
      });
      rerender();
    },
    countRenderedShapes() {
      querySvg(container);
      return countContentShapes(container);
    },
    unmount() {
      act(() => {
        root.unmount();
        container.remove();
      });
    },
  };
}
