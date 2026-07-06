/**
 * @vitest-environment jsdom
 */
import "@/features/vector-ai/lib/editor/test/mock-ai-workflow";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  DRAWING_NAME_REQUIRED_ERROR,
  DRAWING_NOT_FOUND_ERROR,
} from "@/features/vector-ai/lib/drawing-persistence";
import { geminiVectorAiOpsMock } from "@/features/vector-ai/lib/editor/test/mock-ai-workflow";
import {
  flushNoticeUi,
  renderNoticeWorkflow,
} from "@/features/vector-ai/lib/editor/test/notice-workflow-harness";
import {
  configureGeminiMock,
  llmResponses,
  resetAiWorkflowMocks,
} from "@/features/vector-ai/lib/editor/test/workflow/ai-workflow-harness";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test/fixtures";

describe("workflow: affichage des messages de status", () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    resetAiWorkflowMocks();
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("affiche une alerte quand l'enregistrement n'a pas de nom", async () => {
    const workflow = renderNoticeWorkflow(makeEditorWithRect("rect-1"));

    workflow.setDrawingName("   ");
    workflow.saveDrawing();

    const status = workflow.queryStatusElement();
    expect(status?.textContent).toBe(DRAWING_NAME_REQUIRED_ERROR);
    expect(status?.getAttribute("role")).toBe("alert");

    await workflow.unmount();
  });

  it("affiche une alerte quand le dessin chargé est introuvable", async () => {
    const workflow = renderNoticeWorkflow(makeEditorWithRect("rect-1"));

    workflow.loadDrawing("ghost");

    const status = workflow.queryStatusElement();
    expect(status?.textContent).toBe(DRAWING_NOT_FOUND_ERROR);
    expect(status?.getAttribute("role")).toBe("alert");

    await workflow.unmount();
  });

  it("affiche un message info après un enregistrement réussi", async () => {
    const workflow = renderNoticeWorkflow(makeEditorWithRect("rect-1"), {
      saveIdFactory: () => "id-a",
    });

    workflow.setDrawingName("Mon dessin");
    workflow.saveDrawing();

    const status = workflow.queryStatusElement();
    expect(status?.textContent).toBe("Dessin enregistré.");
    expect(status?.getAttribute("role")).toBe("status");

    await workflow.unmount();
  });

  it("efface la notice quand le prompt IA change", async () => {
    const workflow = renderNoticeWorkflow(makeEditorWithRect("rect-1"));

    workflow.setDrawingName("   ");
    workflow.saveDrawing();
    expect(workflow.getStatusText()).toBe(DRAWING_NAME_REQUIRED_ERROR);

    workflow.setAiPrompt("nouveau prompt");
    expect(workflow.queryStatusElement()).toBeNull();

    await workflow.unmount();
  });

  it("affiche le status de chargement pendant une requête IA", async () => {
    let resolveGemini: ((value: string) => void) | undefined;
    geminiVectorAiOpsMock.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveGemini = resolve;
        }),
    );

    const workflow = renderNoticeWorkflow(makeEditorWithRect("rect-1"));
    workflow.setAiPrompt("ajoute un cercle");

    workflow.triggerSubmitAi();
    await flushNoticeUi();

    const pendingStatus = workflow.queryStatusElement();
    expect(pendingStatus?.textContent).toBe("Modification en cours…");
    expect(pendingStatus?.getAttribute("role")).toBe("status");

    resolveGemini?.(llmResponses.addRect);
    await flushNoticeUi();

    const doneStatus = workflow.queryStatusElement();
    expect(doneStatus?.textContent).toBe("Dessin modifié par l'IA.");
    expect(doneStatus?.getAttribute("role")).toBe("status");

    await workflow.unmount();
  });

  it("affiche une alerte quand la commande IA échoue", async () => {
    configureGeminiMock({
      geminiError: new Error(
        "Limite d'utilisation IA atteinte. Réessayez plus tard.",
      ),
    });

    const workflow = renderNoticeWorkflow(makeEditorWithRect("rect-1"));
    workflow.setAiPrompt("ajoute un rectangle");
    await workflow.submitAi();

    const status = workflow.queryStatusElement();
    expect(status?.textContent).toBe(
      "Limite d'utilisation IA atteinte. Réessayez plus tard.",
    );
    expect(status?.getAttribute("role")).toBe("alert");

    await workflow.unmount();
  });
});
