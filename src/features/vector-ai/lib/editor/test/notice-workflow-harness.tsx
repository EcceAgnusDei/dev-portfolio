import {
  act,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";

import { VectorAiPromptPanel } from "@/features/vector-ai/components/vector-ai-prompt-panel";
import { VectorEditorBottomToolbar } from "@/features/vector-ai/components/vector-editor-toolbar";
import {
  planDrawingLoad,
  saveDrawingFromDoc,
} from "@/features/vector-ai/lib/drawing-persistence";
import { runVectorAiSubmit } from "@/features/vector-ai/lib/editor/ai/run-vector-ai-submit";
import { editorReducer } from "@/features/vector-ai/lib/editor/core/reducer";
import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/core/state";
import {
  clickButton,
  changeTextInput,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import {
  mockRasterizeSuccess,
  postVectorAiCommandViaRoute,
} from "@/features/vector-ai/lib/editor/test/workflow/ai-workflow-harness";
import {
  getVectorDrawingsStoreServerSnapshot,
  getVectorDrawingsStoreSnapshot,
  subscribeVectorDrawingsStore,
} from "@/features/vector-ai/lib/vector-drawing-storage";
import {
  VECTOR_AI_DEFAULT_LLM_MODEL,
  type VectorAiLlmModelId,
} from "@/features/vector-ai/lib/vector-ai-config";
import {
  canStepDisplayZoomIn,
  canStepDisplayZoomOut,
} from "@/features/vector-ai/lib/view/display-zoom";
import { cn } from "@/lib/utils";

type Notice = {
  variant: "alert" | "info";
  text: string;
};

export type RenderNoticeWorkflowOptions = {
  saveIdFactory?: () => string;
  initialAiModel?: VectorAiLlmModelId;
};

export type RenderedNoticeWorkflow = {
  container: HTMLDivElement;
  getState: () => EditorState;
  setDrawingName: (name: string) => void;
  saveDrawing: () => void;
  loadDrawing: (id: string | null) => void;
  setAiPrompt: (value: string) => void;
  triggerSubmitAi: () => void;
  submitAi: () => Promise<void>;
  getStatusText: () => string;
  queryStatusElement: () => HTMLElement | null;
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

function queryDrawingNameInput(container: ParentNode): HTMLInputElement {
  const input = container.querySelector('input[aria-label="Nom du dessin"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Champ nom du dessin introuvable.");
  }
  return input;
}

function queryAiPromptTextarea(container: ParentNode): HTMLTextAreaElement {
  const textarea = container.querySelector(
    'textarea[aria-label="Commande pour modifier le dessin avec l\'IA"]',
  );
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error("Champ commande IA introuvable.");
  }
  return textarea;
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (!setter) {
    throw new Error("Impossible de définir la valeur native du textarea.");
  }
  setter.call(textarea, value);
}

function changeTextarea(textarea: HTMLTextAreaElement, value: string) {
  act(() => {
    setTextareaValue(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export async function flushNoticeUi() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

export function queryStatusElement(container: ParentNode): HTMLElement | null {
  const node = container.querySelector('[role="alert"], [role="status"]');
  return node instanceof HTMLElement ? node : null;
}

export function renderNoticeWorkflow(
  initialState: EditorState,
  options: RenderNoticeWorkflowOptions = {},
): RenderedNoticeWorkflow {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const saveIdFactory = options.saveIdFactory;

  let currentState = initialState;
  let loadDrawingHandler: ((id: string | null) => void) | null = null;

  const dispatch = (action: EditorAction) => {
    currentState = editorReducer(currentState, action);
    rerender();
  };

  const rerender = () => {
    act(() => {
      root.render(<NoticeWorkflowHost />);
    });
  };

  function NoticeWorkflowHost() {
    const [notice, setNotice] = useState<Notice | null>(null);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiModel] = useState<VectorAiLlmModelId>(
      () => options.initialAiModel ?? VECTOR_AI_DEFAULT_LLM_MODEL,
    );
    const [aiPending, setAiPending] = useState(false);
    const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null);
    const [drawingName, setDrawingName] = useState("");
    const aiAbortRef = useRef<AbortController | null>(null);
    const aiRequestIdRef = useRef(0);
    const state = currentState;

    const savedDrawings = useSyncExternalStore(
      subscribeVectorDrawingsStore,
      getVectorDrawingsStoreSnapshot,
      getVectorDrawingsStoreServerSnapshot,
    );

    const clearNotice = useCallback(() => {
      setNotice(null);
    }, []);

    const showAlert = useCallback((text: string) => {
      setNotice({ variant: "alert", text });
    }, []);

    const showInfo = useCallback((text: string) => {
      setNotice({ variant: "info", text });
    }, []);

    const handleSaveDrawing = useCallback(() => {
      const result = saveDrawingFromDoc({
        doc: state.doc,
        activeDrawingId,
        drawingName,
        idFactory: saveIdFactory,
      });
      if (!result.ok) {
        showAlert(result.error);
        return;
      }

      setActiveDrawingId(result.id);
      setDrawingName(result.name);
      showInfo("Dessin enregistré.");
    }, [activeDrawingId, drawingName, showAlert, showInfo, state.doc]);

    const handleActiveDrawingChange = useCallback(
      (id: string | null) => {
        const plan = planDrawingLoad(id);
        if (!plan.ok) {
          showAlert(plan.error);
          setActiveDrawingId(null);
          setDrawingName("");
          return;
        }

        dispatch({ type: "EDITOR_LOAD", doc: plan.doc });
        setActiveDrawingId(plan.activeDrawingId);
        setDrawingName(plan.drawingName);
        clearNotice();
      },
      [clearNotice, showAlert],
    );

    loadDrawingHandler = handleActiveDrawingChange;

    const handleCancelAi = useCallback(() => {
      aiAbortRef.current?.abort();
    }, []);

    const handleSubmitAi = useCallback(async () => {
      if (aiPending) return;

      clearNotice();
      const requestId = ++aiRequestIdRef.current;
      const controller = new AbortController();
      aiAbortRef.current = controller;
      setAiPending(true);

      try {
        const result = await runVectorAiSubmit({
          doc: state.doc,
          prompt: aiPrompt,
          model: aiModel,
          signal: controller.signal,
          shouldCancel: () =>
            controller.signal.aborted || requestId !== aiRequestIdRef.current,
          rasterizeDoc: mockRasterizeSuccess(),
          postCommand: postVectorAiCommandViaRoute,
        });

        if (requestId !== aiRequestIdRef.current) return;

        if (!result.ok) {
          if ("aborted" in result) {
            showInfo("Requête annulée.");
            return;
          }
          showAlert(result.error);
          return;
        }

        if (result.docChanged) {
          dispatch({ type: "DOC_SET", doc: result.doc, recordHistory: true });
        }

        showInfo(result.userMessage);
      } finally {
        if (requestId === aiRequestIdRef.current) {
          setAiPending(false);
          aiAbortRef.current = null;
        }
      }
    }, [
      aiModel,
      aiPending,
      aiPrompt,
      clearNotice,
      showAlert,
      showInfo,
      state.doc,
    ]);

    const statusText =
      notice?.text ?? (aiPending ? "Modification en cours…" : "");

    return (
      <>
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
          canClear={false}
          onClear={() => {}}
          clearDisabled={aiPending}
        />
        {statusText ? (
          <p
            className={cn(
              "text-center text-sm",
              notice?.variant === "alert"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
            role={notice?.variant === "alert" ? "alert" : "status"}
            aria-live="polite"
          >
            {statusText}
          </p>
        ) : null}
        <VectorAiPromptPanel
          aiPrompt={aiPrompt}
          onAiPromptChange={(value) => {
            clearNotice();
            setAiPrompt(value);
          }}
          aiModel={aiModel}
          onAiModelChange={() => {}}
          onSubmitAi={() => void handleSubmitAi()}
          onCancelAi={handleCancelAi}
          aiPending={aiPending}
        />
      </>
    );
  }

  rerender();

  return {
    container,
    getState: () => currentState,
    setDrawingName(name: string) {
      changeTextInput(queryDrawingNameInput(container), name);
      rerender();
    },
    saveDrawing() {
      clickButton(findToolbarButton(container, "Enregistrer"));
      rerender();
    },
    loadDrawing(id: string | null) {
      act(() => {
        loadDrawingHandler?.(id);
      });
      rerender();
    },
    setAiPrompt(value: string) {
      changeTextarea(queryAiPromptTextarea(container), value);
      rerender();
    },
    triggerSubmitAi() {
      clickButton(findToolbarButton(container, "Envoyer"));
      rerender();
    },
    async submitAi() {
      this.triggerSubmitAi();
      await flushNoticeUi();
    },
    getStatusText() {
      return queryStatusElement(container)?.textContent ?? "";
    },
    queryStatusElement() {
      return queryStatusElement(container);
    },
    async unmount() {
      await flushNoticeUi();
      act(() => {
        root.unmount();
        container.remove();
      });
    },
  };
}
