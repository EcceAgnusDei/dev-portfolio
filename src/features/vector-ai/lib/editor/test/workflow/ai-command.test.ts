import "@/features/vector-ai/lib/editor/test/mock-ai-workflow";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
} from "@/app/api/demos/vector-ai/ai-command/route";
import { postVectorAiCommand } from "@/features/vector-ai/lib/editor/ai/post-vector-ai-command";
import { runVectorAiSubmit } from "@/features/vector-ai/lib/editor/ai/run-vector-ai-submit";
import {
  checkRateLimitMock,
  geminiVectorAiOpsMock,
} from "@/features/vector-ai/lib/editor/test/mock-ai-workflow";
import {
  bridgeFetchToAiRoute,
  callAiRoute,
  configureGeminiMock,
  defaultRouteBody,
  llmResponses,
  mockRasterizeFailure,
  mockRasterizeSuccess,
  resetAiWorkflowMocks,
  runAiPipeline,
} from "@/features/vector-ai/lib/editor/test/workflow/ai-workflow-harness";
import {
  makeDocAtMaxShapes,
  makeDocWithRect,
  makeDocWithRectAndPath,
  makeEmptyVectorDoc,
  makeSampleDoc,
  MINIMAL_VALID_PNG_BASE64,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import { VECTOR_AI_PROMPT_MAX_LENGTH } from "@/features/vector-ai/lib/vector-ai-config";

describe("workflow: commande IA", () => {
  beforeEach(() => {
    resetAiWorkflowMocks();
    bridgeFetchToAiRoute();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("succès", () => {
    it("ajoute une forme sur canvas vide", async () => {
      const result = await runAiPipeline({
        doc: makeEmptyVectorDoc(),
        prompt: "ajoute un carré rouge",
        llmJson: llmResponses.addRect,
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.docChanged).toBe(true);
      expect(result.doc.shapes).toHaveLength(1);
      expect(result.doc.shapes[0]).toMatchObject({
        id: "new-shape-id-1",
        type: "rect",
        w: 50,
        h: 30,
      });
      expect(result.userMessage).toBe("Dessin modifié par l'IA.");
    });

    it("ajoute plusieurs types de formes", async () => {
      const result = await runAiPipeline({
        doc: makeEmptyVectorDoc(),
        prompt: "dessine un soleil",
        llmJson: llmResponses.addAllTypes,
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.docChanged).toBe(true);
      expect(result.doc.shapes.map((s) => s.type)).toEqual([
        "rect",
        "circle",
        "line",
        "text",
      ]);
      expect(result.userMessage).toBe("C'est fait.");
    });

    it("vide le dessin éditable", async () => {
      const result = await runAiPipeline({
        doc: makeDocWithRect(),
        prompt: "efface tout",
        llmJson: llmResponses.clear,
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.docChanged).toBe(true);
      expect(result.doc.shapes).toHaveLength(0);
    });

    it("préserve les courbes lors d'un clear", async () => {
      const result = await runAiPipeline({
        doc: makeDocWithRectAndPath(),
        prompt: "vide le dessin",
        llmJson: llmResponses.clear,
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.doc.shapes).toHaveLength(1);
      expect(result.doc.shapes[0]?.type).toBe("path");
    });

    it("envoie un aperçu PNG quand le doc contient des formes", async () => {
      await runAiPipeline({
        doc: makeDocWithRect(),
        prompt: "ajoute un cercle",
        llmJson: llmResponses.addRect,
      });

      expect(geminiVectorAiOpsMock).toHaveBeenCalledWith(
        "test-key",
        "ajoute un cercle",
        expect.any(Object),
        {
          base64: MINIMAL_VALID_PNG_BASE64,
          mimeType: "image/png",
        },
      );
    });

    it("n'envoie pas d'aperçu PNG sur canvas vide", async () => {
      await runAiPipeline({
        doc: makeEmptyVectorDoc(),
        prompt: "ajoute un rectangle",
        llmJson: llmResponses.addRect,
      });

      expect(geminiVectorAiOpsMock).toHaveBeenCalledWith(
        "test-key",
        "ajoute un rectangle",
        expect.any(Object),
        undefined,
      );
    });

    it("continue sans preview si la rasterisation échoue", async () => {
      await runAiPipeline({
        doc: makeDocWithRect(),
        prompt: "ajoute un cercle",
        llmJson: llmResponses.addRect,
        rasterizeDoc: mockRasterizeFailure(),
      });

      expect(geminiVectorAiOpsMock).toHaveBeenCalledWith(
        "test-key",
        "ajoute un cercle",
        expect.any(Object),
        undefined,
      );
    });
  });

  describe("refus sans modification", () => {
    it("affiche le message LLM quand ops est vide", async () => {
      const result = await runAiPipeline({
        doc: makeDocWithRectAndPath(),
        prompt: "modifie la courbe",
        llmJson: llmResponses.refuse,
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.docChanged).toBe(false);
      expect(result.userMessage).toBe("Je ne peux pas modifier une courbe.");
    });

    it("injecte le fallback serveur quand ops est vide sans message", async () => {
      const result = await runAiPipeline({
        doc: makeEmptyVectorDoc(),
        prompt: "???",
        llmJson: llmResponses.emptyOps,
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.docChanged).toBe(false);
      expect(result.userMessage).toBe(
        "L'IA n'a pas pu traiter cette demande. Reformulez et réessayez.",
      );
    });
  });

  describe("erreurs client", () => {
    it("rejette un prompt vide", async () => {
      const result = await postVectorAiCommand({
        prompt: "   ",
        doc: makeEmptyVectorDoc(),
      });

      expect(result).toEqual({
        ok: false,
        error: "Le prompt est vide.",
      });
    });

    it("rejette un prompt trop long", async () => {
      const result = await postVectorAiCommand({
        prompt: "a".repeat(VECTOR_AI_PROMPT_MAX_LENGTH + 1),
        doc: makeEmptyVectorDoc(),
      });

      expect(result.ok).toBe(false);
      if (!("error" in result)) {
        expect.fail("résultat d'erreur attendu");
        return;
      }
      expect(result.error).toContain("Le prompt est trop long");
    });

    it("signale un réseau indisponible", async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error("network")) as typeof fetch;

      const result = await postVectorAiCommand({
        prompt: "ajoute un rectangle",
        doc: makeEmptyVectorDoc(),
      });

      expect(result).toEqual({
        ok: false,
        error: "Réseau indisponible.",
      });
    });

    it("signale une réponse serveur illisible", async () => {
      const response = new Response(null, { status: 200 });
      vi.spyOn(response, "json").mockRejectedValue(new Error("invalid json"));
      mockFetchResponse(response);

      const result = await postVectorAiCommand({
        prompt: "ajoute un rectangle",
        doc: makeEmptyVectorDoc(),
      });

      expect(result).toEqual({
        ok: false,
        error: "Réponse serveur illisible.",
      });
    });

    it("propage le message d'erreur HTTP", async () => {
      configureGeminiMock({
        geminiError: new Error(
          "Limite d'utilisation IA atteinte. Réessayez plus tard.",
        ),
      });

      const result = await postVectorAiCommand({
        prompt: "ajoute un rectangle",
        doc: makeEmptyVectorDoc(),
      });

      expect(result).toEqual({
        ok: false,
        error: "Limite d'utilisation IA atteinte. Réessayez plus tard.",
      });
    });

    it("utilise le statut HTTP quand le message d'erreur est absent", async () => {
      mockFetchResponse(new Response("{}", { status: 502 }));

      const result = await postVectorAiCommand({
        prompt: "ajoute un rectangle",
        doc: makeEmptyVectorDoc(),
      });

      expect(result).toEqual({
        ok: false,
        error: "Erreur 502",
      });
    });

    it("rejette une réponse 200 sans doc", async () => {
      mockFetchResponse(
        new Response(JSON.stringify({ message: "ok" }), { status: 200 }),
      );

      const result = await postVectorAiCommand({
        prompt: "ajoute un rectangle",
        doc: makeEmptyVectorDoc(),
      });

      expect(result).toEqual({
        ok: false,
        error: "Réponse serveur invalide.",
      });
    });

    it("annule la requête via AbortSignal", async () => {
      const controller = new AbortController();
      controller.abort();

      global.fetch = vi.fn(async (_input, init) => {
        if (init?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        return POST(
          new Request("http://test.local/api/demos/vector-ai/ai-command", init),
        );
      }) as typeof fetch;

      const result = await postVectorAiCommand({
        prompt: "ajoute un rectangle",
        doc: makeEmptyVectorDoc(),
        signal: controller.signal,
      });

      expect(result).toEqual({ ok: false, aborted: true });
    });

    it("annule pendant la rasterisation", async () => {
      const controller = new AbortController();

      const result = await runVectorAiSubmit({
        doc: makeDocWithRect(),
        prompt: "ajoute un cercle",
        signal: controller.signal,
        rasterizeDoc: async () => {
          controller.abort();
          return {
            ok: true,
            base64: MINIMAL_VALID_PNG_BASE64,
            mimeType: "image/png",
          };
        },
      });

      expect(result).toEqual({ ok: false, aborted: true });
    });

    it("annule via shouldCancel après rasterisation", async () => {
      const result = await runVectorAiSubmit({
        doc: makeDocWithRect(),
        prompt: "ajoute un cercle",
        shouldCancel: () => true,
        rasterizeDoc: mockRasterizeSuccess(),
      });

      expect(result).toEqual({ ok: false, aborted: true });
    });
  });

  describe("erreurs serveur", () => {
    it("refuse les méthodes autres que POST", async () => {
      const responses = await Promise.all([GET(), PATCH(), PUT(), DELETE()]);

      for (const res of responses) {
        expect(res.status).toBe(405);
        await expect(res.json()).resolves.toEqual({
          error: "Méthode non autorisée.",
        });
      }
    });

    it("rejette un body JSON invalide", async () => {
      const res = await POST(
        new Request("http://test.local/api/demos/vector-ai/ai-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "pas du json",
        }),
      );

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: "La requête n'a pu être envoyée.",
      });
    });

    it("rejette un prompt vide côté route", async () => {
      const res = await callAiRoute({
        prompt: "",
        doc: makeEmptyVectorDoc(),
      });

      expect(res.status).toBe(400);
    });

    it("rejette un aperçu PNG invalide", async () => {
      const res = await callAiRoute({
        prompt: "ajoute un rectangle",
        doc: makeDocWithRect(),
        previewPng: {
          base64: "!!!",
          mimeType: "image/png",
        },
      });

      expect(res.status).toBe(400);
    });

    it("applique le rate limit", async () => {
      checkRateLimitMock.mockReturnValue({
        ok: false,
        retryAfterSec: 42,
      });

      const res = await callAiRoute(defaultRouteBody());

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("42");
      await expect(res.json()).resolves.toEqual({
        error: "Trop de requêtes. Réessayez dans 42 s.",
      });
    });

    it("signale l'absence de clé API", async () => {
      vi.stubEnv("GEMINI_API_KEY", "");

      const res = await callAiRoute(defaultRouteBody());

      expect(res.status).toBe(503);
      await expect(res.json()).resolves.toEqual({
        error: "Commande IA indisponible",
      });
    });

    it("propage une erreur Gemini", async () => {
      configureGeminiMock({
        geminiError: new Error("Impossible de contacter l'IA. Réessayez."),
      });

      const res = await callAiRoute(defaultRouteBody());

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({
        error: "Impossible de contacter l'IA. Réessayez.",
      });
    });

    it("rejette un JSON LLM invalide", async () => {
      configureGeminiMock({ llmJson: llmResponses.invalidJson });

      const res = await callAiRoute(defaultRouteBody());

      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toEqual({
        error: "JSON invalide.",
      });
    });

    it("rejette un schéma ops invalide", async () => {
      configureGeminiMock({ llmJson: llmResponses.invalidOps });

      const res = await callAiRoute(defaultRouteBody());

      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toEqual({
        error: "Réponse IA invalide.",
      });
    });

    it("rejette un tuple de forme invalide", async () => {
      configureGeminiMock({ llmJson: llmResponses.badColor });

      const res = await callAiRoute(defaultRouteBody());

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("Couleur invalide");
    });

    it("rejette un dépassement du nombre maximal de formes", async () => {
      configureGeminiMock({ llmJson: llmResponses.addRect });

      const res = await callAiRoute({
        prompt: "ajoute encore",
        doc: makeDocAtMaxShapes(),
      });

      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toEqual({
        error: "Nombre maximal de formes atteint.",
      });
    });
  });

  describe("encodage contexte LLM", () => {
    it("encode pathCount sans inclure les paths dans ctx.s", async () => {
      await callAiRoute({
        prompt: "ajoute un rectangle",
        doc: makeSampleDoc(),
      });

      const encodedContext = await extractLlmContextFromGeminiCall();
      expect(encodedContext.pathCount).toBe(1);
      expect(encodedContext.s).toHaveLength(3);
      expect(
        encodedContext.s.every(
          (tuple) =>
            tuple[0] === "r" ||
            tuple[0] === "c" ||
            tuple[0] === "l" ||
            tuple[0] === "t",
        ),
      ).toBe(true);
    });

    it("encode le viewBox dans ctx.vb", async () => {
      const doc = {
        ...makeDocWithRect(),
        viewBox: { x: 5, y: 10, w: 400, h: 300 },
      };

      await callAiRoute({
        prompt: "ajoute un cercle",
        doc,
      });

      const encodedContext = await extractLlmContextFromGeminiCall();
      expect(encodedContext.vb).toEqual([5, 10, 400, 300]);
    });
  });
});

async function extractLlmContextFromGeminiCall() {
  const { encodeDocForLlm } =
    await import("@/features/vector-ai/lib/editor/ai/codec/encode-doc");
  const doc = geminiVectorAiOpsMock.mock.calls[0]?.[2];
  if (!doc || typeof doc !== "object") {
    throw new Error("doc Gemini manquant");
  }
  return encodeDocForLlm(doc as Parameters<typeof encodeDocForLlm>[0]).context;
}

function mockFetchResponse(response: Response): void {
  global.fetch = vi.fn().mockResolvedValue(response);
}
