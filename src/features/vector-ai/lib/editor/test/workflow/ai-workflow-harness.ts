import { vi } from "vitest";

import { POST } from "@/app/api/demos/vector-ai/ai-command/route";
import { runVectorAiSubmit } from "@/features/vector-ai/lib/editor/ai/run-vector-ai-submit";
import {
  checkRateLimitMock,
  geminiVectorAiOpsMock,
  resetShapeIdCounter,
} from "@/features/vector-ai/lib/editor/test/mock-ai-workflow";
import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import {
  MINIMAL_VALID_PNG_BASE64,
  makeDocWithRect,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import type { VectorAiPreviewPng } from "@/features/vector-ai/lib/vector-ai-config";
import type { RasterizeDocResult } from "@/features/vector-ai/lib/view/rasterize-doc-to-png";

export const llmResponses = {
  addRect: JSON.stringify({
    ops: [["add", ["r", "n1", 10, 10, 50, 30, "#ff0000"]]],
  }),
  addAllTypes: JSON.stringify({
    ops: [
      ["add", ["r", "n1", 10, 10, 40, 30, "#ff0000"]],
      ["add", ["c", "n2", 100, 100, 25, "#00ff00", "#000000", 2]],
      ["add", ["l", "n3", 0, 0, 200, 200, "#0000ff", 2]],
      ["add", ["t", "n4", 50, 50, "Bonjour", 16, "#000000"]],
    ],
    message: "C'est fait.",
  }),
  deleteAll: JSON.stringify({
    ops: [["delete", "s1"]],
    message: "Dessin vidé.",
  }),
  deleteAllWithPath: JSON.stringify({
    ops: [
      ["delete", "s1"],
      ["delete", "s2"],
    ],
    message: "Dessin vidé.",
  }),
  updateRect: JSON.stringify({
    ops: [["update", ["r", "s1", 10, 20, 100, 50, "#0000ff", "none"]]],
    message: "Rectangle mis à jour.",
  }),
  deleteRect: JSON.stringify({
    ops: [["delete", "s1"]],
    message: "Forme supprimée.",
  }),
  updateAndAdd: JSON.stringify({
    ops: [
      ["update", ["r", "s1", 10, 20, 100, 50, "#0000ff", "none"]],
      ["add", ["c", "n1", 200, 120, 40, "none", "#000000", 2]],
    ],
  }),
  updateUnknownId: JSON.stringify({
    ops: [["update", ["r", "s99", 0, 0, 10, 10, "#000000"]]],
  }),
  updateTypeMismatch: JSON.stringify({
    ops: [["update", ["c", "s1", 100, 100, 25, "#00ff00"]]],
  }),
  deleteUnknownId: JSON.stringify({
    ops: [["delete", "s99"]],
  }),
  updatePathStyle: JSON.stringify({
    ops: [["update", ["p", "s2", "#ff0000", 4]]],
    message: "Courbe mise à jour.",
  }),
  deletePath: JSON.stringify({
    ops: [["delete", "s2"]],
    message: "Courbe supprimée.",
  }),
  refuse: JSON.stringify({
    ops: [],
    message: "Je ne peux pas déplacer une courbe.",
  }),
  emptyOps: JSON.stringify({ ops: [] }),
  invalidJson: "pas du json",
  invalidOps: JSON.stringify({ ops: [["add", ["x", "n1"]]] }),
  badColor: JSON.stringify({
    ops: [["add", ["r", "n1", 0, 0, 10, 10, "rouge"]]],
  }),
} as const;

export function mockRasterizeSuccess(): (
  doc: VectorDoc,
) => Promise<RasterizeDocResult> {
  return async () => ({
    ok: true,
    base64: MINIMAL_VALID_PNG_BASE64,
    mimeType: "image/png",
  });
}

export function mockRasterizeFailure(): (
  doc: VectorDoc,
) => Promise<RasterizeDocResult> {
  return async () => ({ ok: false, error: "Rasterisation échouée." });
}

export function bridgeFetchToAiRoute(): void {
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    const req = new Request(`http://test.local${path}`, init);
    return POST(req);
  }) as typeof fetch;
}

export type CallAiRouteBody = {
  prompt: string;
  doc: VectorDoc;
  previewPng?: VectorAiPreviewPng;
};

export async function callAiRoute(
  body: CallAiRouteBody,
  headers?: HeadersInit,
): Promise<Response> {
  const req = new Request("http://test.local/api/demos/vector-ai/ai-command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return POST(req);
}

export type AiWorkflowInput = {
  doc?: VectorDoc;
  prompt?: string;
  llmJson?: string;
  geminiError?: Error;
  rasterizeDoc?: (doc: VectorDoc) => Promise<RasterizeDocResult>;
  signal?: AbortSignal;
};

export type AiWorkflowResult =
  | {
      status: "success";
      doc: VectorDoc;
      docChanged: boolean;
      userMessage: string;
    }
  | { status: "aborted" }
  | { status: "error"; error: string };

export function resetAiWorkflowMocks(): void {
  resetShapeIdCounter();
  geminiVectorAiOpsMock.mockReset();
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockReturnValue({ ok: true });
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
}

export function configureGeminiMock(input: {
  llmJson?: string;
  geminiError?: Error;
}): void {
  if (input.geminiError) {
    geminiVectorAiOpsMock.mockRejectedValue(input.geminiError);
    return;
  }
  if (input.llmJson !== undefined) {
    geminiVectorAiOpsMock.mockResolvedValue(input.llmJson);
  }
}

export async function runAiPipeline(
  input: AiWorkflowInput = {},
): Promise<AiWorkflowResult> {
  const doc = input.doc ?? createEmptyDoc();
  const prompt = input.prompt ?? "ajoute un rectangle";

  configureGeminiMock({
    llmJson: input.llmJson ?? llmResponses.addRect,
    geminiError: input.geminiError,
  });

  bridgeFetchToAiRoute();

  const result = await runVectorAiSubmit({
    doc,
    prompt,
    signal: input.signal,
    rasterizeDoc: input.rasterizeDoc ?? mockRasterizeSuccess(),
  });

  if (!result.ok) {
    if ("aborted" in result) {
      return { status: "aborted" };
    }
    return { status: "error", error: result.error };
  }

  return {
    status: "success",
    doc: result.doc,
    docChanged: result.docChanged,
    userMessage: result.userMessage,
  };
}

export function defaultRouteBody(
  overrides?: Partial<CallAiRouteBody>,
): CallAiRouteBody {
  return {
    prompt: "ajoute un rectangle",
    doc: makeDocWithRect(),
    ...overrides,
  };
}