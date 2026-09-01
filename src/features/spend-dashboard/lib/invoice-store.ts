import { z } from "zod";

import {
  invoiceSaveSchema,
  type InvoiceExtraction,
} from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import { SPEND_DASHBOARD_DEFAULT_CURRENCY } from "@/features/spend-dashboard/lib/spend-dashboard-config";

const LOCAL_STORAGE_KEY = "spend-dashboard-invoices";
const INVOICES_STORE_EVENT = "spend-dashboard-invoices-change";

export const invoiceRecordSchema = invoiceSaveSchema.extend({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  sourceFileName: z.string().trim().min(1).optional(),
});

export type InvoiceRecord = z.infer<typeof invoiceRecordSchema>;

const invoiceRecordListSchema = z.array(invoiceRecordSchema);

export type SaveInvoiceResult =
  | { ok: true; record: InvoiceRecord }
  | { ok: false; error: string; reason: "duplicate" | "invalid" | "storage" };

const EMPTY_INVOICES: InvoiceRecord[] = [];

let cachedClientSnapshot = EMPTY_INVOICES;
let cachedClientStoreRaw: string | null = null;

function normalizeInvoiceNumber(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeVendor(value: string): string {
  return value.trim().toLowerCase();
}

function readStore(): InvoiceRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = invoiceRecordListSchema.safeParse(parsed);
  return result.success ? result.data : [];
}

function notifyInvoicesStoreChange(): void {
  if (typeof window === "undefined") return;
  cachedClientStoreRaw = null;
  window.dispatchEvent(new Event(INVOICES_STORE_EVENT));
}

function writeStore(invoices: InvoiceRecord[]): string | null {
  if (typeof window === "undefined") {
    return "Stockage local indisponible.";
  }
  try {
    const serialized = JSON.stringify(invoices);
    localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    cachedClientStoreRaw = serialized;
    cachedClientSnapshot = invoices;
    notifyInvoicesStoreChange();
    return null;
  } catch {
    return "Impossible d'enregistrer : stockage local plein ou indisponible.";
  }
}

export function listInvoices(): InvoiceRecord[] {
  return readStore().slice().sort((a, b) => {
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function subscribeInvoicesStore(onStoreChange: () => void): () => void {
  window.addEventListener(INVOICES_STORE_EVENT, onStoreChange);
  return () => window.removeEventListener(INVOICES_STORE_EVENT, onStoreChange);
}

export function getInvoicesStoreSnapshot(): InvoiceRecord[] {
  if (typeof window === "undefined") return EMPTY_INVOICES;

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw === cachedClientStoreRaw) {
    return cachedClientSnapshot;
  }

  cachedClientStoreRaw = raw;
  cachedClientSnapshot = raw === null ? EMPTY_INVOICES : listInvoices();
  return cachedClientSnapshot;
}

export function getInvoicesStoreServerSnapshot(): InvoiceRecord[] {
  return EMPTY_INVOICES;
}

export function findInvoiceByNumber(
  invoiceNumber: string,
): InvoiceRecord | null {
  const normalized = normalizeInvoiceNumber(invoiceNumber);
  if (!normalized) return null;
  return (
    readStore().find(
      (entry) =>
        entry.invoiceNumber != null &&
        normalizeInvoiceNumber(entry.invoiceNumber) === normalized,
    ) ?? null
  );
}

export function findSimilarInvoice(
  extraction: Pick<
    InvoiceExtraction,
    "vendor" | "invoiceDate" | "amountTtcCents"
  >,
  options?: { excludeId?: string },
): InvoiceRecord | null {
  if (extraction.invoiceDate == null || extraction.amountTtcCents == null) {
    return null;
  }

  const vendor = normalizeVendor(extraction.vendor);
  const excludeId = options?.excludeId;
  return (
    readStore().find(
      (entry) =>
        entry.id !== excludeId &&
        normalizeVendor(entry.vendor) === vendor &&
        entry.invoiceDate === extraction.invoiceDate &&
        entry.amountTtcCents === extraction.amountTtcCents,
    ) ?? null
  );
}

export function saveInvoiceExtraction(
  extraction: InvoiceExtraction,
  options?: { sourceFileName?: string },
): SaveInvoiceResult {
  if (extraction.invoiceNumber) {
    const existing = findInvoiceByNumber(extraction.invoiceNumber);
    if (existing) {
      return {
        ok: false,
        reason: "duplicate",
        error: `Une facture avec le n° « ${extraction.invoiceNumber} » est déjà enregistrée.`,
      };
    }
  }

  const recordCandidate = {
    ...extraction,
    currency: SPEND_DASHBOARD_DEFAULT_CURRENCY,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...(options?.sourceFileName?.trim()
      ? { sourceFileName: options.sourceFileName.trim() }
      : {}),
  };

  const parsed = invoiceRecordSchema.safeParse(recordCandidate);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      error: "Données de facture invalides.",
    };
  }

  const next = [parsed.data, ...readStore()];
  const writeError = writeStore(next);
  if (writeError) {
    return { ok: false, reason: "storage", error: writeError };
  }

  return { ok: true, record: parsed.data };
}

export function updateInvoice(
  id: string,
  extraction: InvoiceExtraction,
): SaveInvoiceResult {
  const store = readStore();
  const index = store.findIndex((entry) => entry.id === id);
  if (index < 0) {
    return {
      ok: false,
      reason: "invalid",
      error: "Facture introuvable.",
    };
  }

  if (extraction.invoiceNumber) {
    const normalized = normalizeInvoiceNumber(extraction.invoiceNumber);
    const duplicate = store.find(
      (entry) =>
        entry.id !== id &&
        entry.invoiceNumber != null &&
        normalizeInvoiceNumber(entry.invoiceNumber) === normalized,
    );
    if (duplicate) {
      return {
        ok: false,
        reason: "duplicate",
        error: `Une facture avec le n° « ${extraction.invoiceNumber} » est déjà enregistrée.`,
      };
    }
  }

  const existing = store[index]!;
  const recordCandidate = {
    ...extraction,
    currency: SPEND_DASHBOARD_DEFAULT_CURRENCY,
    id: existing.id,
    createdAt: existing.createdAt,
    ...(existing.sourceFileName
      ? { sourceFileName: existing.sourceFileName }
      : {}),
  };

  const parsed = invoiceRecordSchema.safeParse(recordCandidate);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      error: "Données de facture invalides.",
    };
  }

  const next = store.slice();
  next[index] = parsed.data;
  const writeError = writeStore(next);
  if (writeError) {
    return { ok: false, reason: "storage", error: writeError };
  }

  return { ok: true, record: parsed.data };
}

export function deleteInvoice(id: string): string | null {
  const store = readStore();
  if (!store.some((entry) => entry.id === id)) return null;
  return writeStore(store.filter((entry) => entry.id !== id));
}

export function clearInvoices(): string | null {
  return writeStore([]);
}

export function replaceInvoices(invoices: InvoiceRecord[]): string | null {
  const parsed = invoiceRecordListSchema.safeParse(invoices);
  if (!parsed.success) {
    return "Données de factures invalides.";
  }
  return writeStore(parsed.data);
}
