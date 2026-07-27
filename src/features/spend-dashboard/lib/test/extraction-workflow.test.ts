import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  geminiInvoiceExtractJsonMock: vi.fn(),
  checkRateLimitMock: vi.fn<
    (
      ip: string,
      max: number,
      windowMs: number,
    ) => { ok: true } | { ok: false; retryAfterSec: number }
  >(() => ({ ok: true })),
}));

vi.mock("@/features/spend-dashboard/lib/gemini-invoice-extract-llm", () => ({
  geminiInvoiceExtractJson: mocks.geminiInvoiceExtractJsonMock,
}));

vi.mock("@/features/pixel-ai/lib/rate-limit-ip", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/pixel-ai/lib/rate-limit-ip")
    >();
  return {
    ...actual,
    checkRateLimit: mocks.checkRateLimitMock,
  };
});

import {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
} from "@/app/api/demos/spend-dashboard/extract/route";
import { formatFileSize } from "@/features/spend-dashboard/lib/format-invoice";
import {
  parseInvoiceExtraction,
  parseInvoiceExtractionJson,
  type InvoiceExtraction,
} from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import { postExtractInvoice } from "@/features/spend-dashboard/lib/post-extract-invoice";
import { SPEND_DASHBOARD_MAX_FILE_BYTES } from "@/features/spend-dashboard/lib/spend-dashboard-config";

const geminiInvoiceExtractJsonMock = mocks.geminiInvoiceExtractJsonMock;
const checkRateLimitMock = mocks.checkRateLimitMock;

const VALID_INVOICE: InvoiceExtraction = {
  vendor: "OVH SAS",
  invoiceDate: "2026-03-12",
  invoiceNumber: "FR-2026-88421",
  currency: "EUR",
  amountHtCents: 4167,
  amountTvaCents: 833,
  amountTtcCents: 5000,
  category: "software",
  confidence: "high",
};

const VALID_INVOICE_NULLS: InvoiceExtraction = {
  vendor: "Inconnu",
  invoiceDate: null,
  invoiceNumber: null,
  currency: "EUR",
  amountHtCents: null,
  amountTvaCents: null,
  amountTtcCents: null,
  category: "other",
  confidence: "low",
};

function makeFile(options?: {
  type?: string;
  size?: number;
  name?: string;
}): File {
  const type = options?.type ?? "image/jpeg";
  const size = options?.size ?? 32;
  return new File([new Uint8Array(size)], options?.name ?? "facture.jpg", {
    type,
  });
}

function bridgeFetchToExtractRoute(): void {
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return POST(new Request(`http://test.local${path}`, init));
  });
}

async function callExtractRoute(options?: {
  file?: File | null;
  formData?: FormData;
  requestInit?: RequestInit;
}): Promise<Response> {
  if (options?.requestInit) {
    return POST(
      new Request(
        "http://test.local/api/demos/spend-dashboard/extract",
        options.requestInit,
      ),
    );
  }

  const formData = options?.formData ?? new FormData();
  if (options?.file !== undefined) {
    if (options.file) formData.set("file", options.file);
  } else if (!options?.formData) {
    formData.set("file", makeFile());
  }

  return POST(
    new Request("http://test.local/api/demos/spend-dashboard/extract", {
      method: "POST",
      body: formData,
    }),
  );
}

function resetMocks(): void {
  geminiInvoiceExtractJsonMock.mockReset();
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockReturnValue({ ok: true });
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  geminiInvoiceExtractJsonMock.mockResolvedValue(JSON.stringify(VALID_INVOICE));
}

describe("workflow: extraction Spend Dashboard", () => {
  beforeEach(() => {
    resetMocks();
    bridgeFetchToExtractRoute();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("client → api : validations d'envoi", () => {
    it("refuse un MIME invalide côté client sans appeler l'API", async () => {
      const result = await postExtractInvoice(
        makeFile({ type: "text/plain", name: "x.txt" }),
      );

      expect(result).toEqual({
        ok: false,
        error:
          "Format non pris en charge. Utilisez une image (JPEG, PNG, WebP) ou un PDF.",
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("refuse un fichier trop volumineux côté client sans appeler l'API", async () => {
      const result = await postExtractInvoice(
        makeFile({ size: SPEND_DASHBOARD_MAX_FILE_BYTES + 1 }),
      );

      expect(result).toEqual({
        ok: false,
        error: `Fichier trop volumineux (max. ${formatFileSize(SPEND_DASHBOARD_MAX_FILE_BYTES)}).`,
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejette FormData illisible (400)", async () => {
      const res = await callExtractRoute({
        requestInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        },
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: "La requête n'a pu être envoyée.",
      });
      expect(geminiInvoiceExtractJsonMock).not.toHaveBeenCalled();
    });

    it("rejette l'absence de fichier (400)", async () => {
      const res = await callExtractRoute({ formData: new FormData() });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: "Aucun fichier fourni.",
      });
      expect(geminiInvoiceExtractJsonMock).not.toHaveBeenCalled();
    });

    it("rejette un fichier vide (400)", async () => {
      const res = await callExtractRoute({
        file: makeFile({ size: 0 }),
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: "Aucun fichier fourni.",
      });
      expect(geminiInvoiceExtractJsonMock).not.toHaveBeenCalled();
    });

    it("rejette un MIME invalide côté API (400)", async () => {
      const res = await callExtractRoute({
        file: makeFile({ type: "image/gif", name: "x.gif" }),
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error:
          "Format non pris en charge. Utilisez une image (JPEG, PNG, WebP) ou un PDF.",
      });
      expect(geminiInvoiceExtractJsonMock).not.toHaveBeenCalled();
    });

    it("rejette un fichier trop volumineux côté API (400)", async () => {
      const res = await callExtractRoute({
        file: makeFile({ size: SPEND_DASHBOARD_MAX_FILE_BYTES + 1 }),
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: `Fichier trop volumineux (max. ${formatFileSize(SPEND_DASHBOARD_MAX_FILE_BYTES)}).`,
      });
      expect(geminiInvoiceExtractJsonMock).not.toHaveBeenCalled();
    });

    it("applique le rate-limit (429 + Retry-After)", async () => {
      checkRateLimitMock.mockReturnValue({
        ok: false,
        retryAfterSec: 42,
      });

      const res = await callExtractRoute();

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("42");
      await expect(res.json()).resolves.toEqual({
        error: "Trop de requêtes. Réessayez dans 42 s.",
      });
      expect(geminiInvoiceExtractJsonMock).not.toHaveBeenCalled();
    });

    it("propage le 429 jusqu'au client", async () => {
      checkRateLimitMock.mockReturnValue({
        ok: false,
        retryAfterSec: 12,
      });

      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({
        ok: false,
        error: "Trop de requêtes. Réessayez dans 12 s.",
      });
    });

    it("signale l'absence de clé Gemini (503)", async () => {
      vi.stubEnv("GEMINI_API_KEY", "");

      const res = await callExtractRoute();

      expect(res.status).toBe(503);
      await expect(res.json()).resolves.toEqual({
        error: "IA indisponible.",
      });
      expect(geminiInvoiceExtractJsonMock).not.toHaveBeenCalled();
    });

    it("propage le 503 jusqu'au client", async () => {
      vi.stubEnv("GEMINI_API_KEY", "");

      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({
        ok: false,
        error: "IA indisponible.",
      });
    });

    it.each([
      ["GET", GET],
      ["PATCH", PATCH],
      ["PUT", PUT],
      ["DELETE", DELETE],
    ] as const)("refuse la méthode %s (405)", async (_name, handler) => {
      const res = await handler();
      expect(res.status).toBe(405);
      await expect(res.json()).resolves.toEqual({
        error: "Méthode non autorisée.",
      });
    });

    it("accepte JPEG/PNG/WebP/PDF et appelle Gemini", async () => {
      for (const type of [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ] as const) {
        geminiInvoiceExtractJsonMock.mockClear();
        geminiInvoiceExtractJsonMock.mockResolvedValue(
          JSON.stringify(VALID_INVOICE),
        );

        const res = await callExtractRoute({
          file: makeFile({ type, name: `doc.${type.split("/")[1]}` }),
        });

        expect(res.status).toBe(200);
        expect(geminiInvoiceExtractJsonMock).toHaveBeenCalledTimes(1);
        expect(geminiInvoiceExtractJsonMock.mock.calls[0]?.[1]).toMatchObject({
          mimeType: type,
        });
      }
    });
  });

  describe("gemini → api → client : contrat de réponse", () => {
    it("renvoie une extraction valide au client (200)", async () => {
      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({ ok: true, invoice: VALID_INVOICE });
      expect(geminiInvoiceExtractJsonMock).toHaveBeenCalledWith(
        "test-key",
        expect.objectContaining({
          mimeType: "image/jpeg",
          bytes: expect.any(Uint8Array),
        }),
      );
    });

    it("accepte les champs nullables", async () => {
      geminiInvoiceExtractJsonMock.mockResolvedValue(
        JSON.stringify(VALID_INVOICE_NULLS),
      );

      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({ ok: true, invoice: VALID_INVOICE_NULLS });
    });

    it("propage une erreur Gemini (502) jusqu'au client", async () => {
      geminiInvoiceExtractJsonMock.mockRejectedValue(
        new Error("Impossible de contacter l'IA. Réessayez."),
      );

      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({
        ok: false,
        error: "Impossible de contacter l'IA. Réessayez.",
      });
    });

    it("utilise le message de secours si Gemini throw sans message", async () => {
      geminiInvoiceExtractJsonMock.mockRejectedValue(new Error("   "));

      const res = await callExtractRoute();

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({
        error: "Le service IA a échoué. Réessayez plus tard.",
      });
    });

    it("rejette un JSON LLM illisible (502) et le propage au client", async () => {
      geminiInvoiceExtractJsonMock.mockResolvedValue("pas du json");

      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({
        ok: false,
        error: "L'IA a répondu de manière inattendue.",
      });
    });

    it("rejette un schéma LLM invalide (catégorie inconnue)", async () => {
      geminiInvoiceExtractJsonMock.mockResolvedValue(
        JSON.stringify({ ...VALID_INVOICE, category: "food" }),
      );

      const res = await callExtractRoute();

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({
        error: "L'IA a répondu de manière inattendue.",
      });
    });

    it("rejette une date invalide", async () => {
      geminiInvoiceExtractJsonMock.mockResolvedValue(
        JSON.stringify({ ...VALID_INVOICE, invoiceDate: "12/03/2026" }),
      );

      const res = await callExtractRoute();

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({
        error: "L'IA a répondu de manière inattendue.",
      });
    });

    it("rejette un montant négatif", async () => {
      geminiInvoiceExtractJsonMock.mockResolvedValue(
        JSON.stringify({ ...VALID_INVOICE, amountTtcCents: -1 }),
      );

      const res = await callExtractRoute();

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({
        error: "L'IA a répondu de manière inattendue.",
      });
    });

    it("rejette une devise invalide", async () => {
      geminiInvoiceExtractJsonMock.mockResolvedValue(
        JSON.stringify({ ...VALID_INVOICE, currency: "euro" }),
      );

      const res = await callExtractRoute();

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({
        error: "L'IA a répondu de manière inattendue.",
      });
    });

    it("rejette un vendor vide", async () => {
      geminiInvoiceExtractJsonMock.mockResolvedValue(
        JSON.stringify({ ...VALID_INVOICE, vendor: "   " }),
      );

      const res = await callExtractRoute();

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({
        error: "L'IA a répondu de manière inattendue.",
      });
    });

    it("le client refuse un invoice 200 hors contrat", async () => {
      global.fetch = vi.fn(async () =>
        Response.json(
          { invoice: { ...VALID_INVOICE, category: "food" } },
          { status: 200 },
        ),
      );

      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({
        ok: false,
        error: "Réponse d'extraction invalide.",
      });
    });

    it("le client signale une réponse serveur illisible", async () => {
      global.fetch = vi.fn(
        async () => new Response("not-json", { status: 200 }),
      );

      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({
        ok: false,
        error: "Réponse serveur illisible.",
      });
    });

    it("le client signale un réseau indisponible", async () => {
      global.fetch = vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      });

      const result = await postExtractInvoice(makeFile());

      expect(result).toEqual({
        ok: false,
        error: "Réseau indisponible.",
      });
    });
  });

  describe("contrat Zod (réponse IA)", () => {
    it("accepte un objet conforme", () => {
      expect(parseInvoiceExtraction(VALID_INVOICE)).toEqual({
        ok: true,
        invoice: VALID_INVOICE,
      });
    });

    it("accepte un JSON conforme", () => {
      expect(parseInvoiceExtractionJson(JSON.stringify(VALID_INVOICE))).toEqual(
        {
          ok: true,
          invoice: VALID_INVOICE,
        },
      );
    });

    it("refuse un JSON mal formé", () => {
      expect(parseInvoiceExtractionJson("{")).toEqual({
        ok: false,
        error: "JSON invalide.",
      });
    });

    it("refuse un objet hors schéma", () => {
      expect(parseInvoiceExtraction({ vendor: "X" })).toEqual({
        ok: false,
        error: "Réponse d'extraction invalide.",
      });
    });
  });
});
