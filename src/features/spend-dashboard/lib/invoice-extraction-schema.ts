import { z } from "zod";

import {
  SPEND_DASHBOARD_CONFIDENCE_LEVELS,
  SPEND_DASHBOARD_DEFAULT_CURRENCY,
  SPEND_DASHBOARD_INVOICE_CATEGORIES,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");

const moneyCentsSchema = z.number().int().nonnegative();

export const invoiceExtractionSchema = z.object({
  vendor: z.string().trim().min(1),
  invoiceDate: isoDateSchema.nullable(),
  invoiceNumber: z.string().trim().min(1).nullable(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Devise invalide."),
  amountHtCents: moneyCentsSchema.nullable(),
  amountTvaCents: moneyCentsSchema.nullable(),
  amountTtcCents: moneyCentsSchema.nullable(),
  category: z.enum(SPEND_DASHBOARD_INVOICE_CATEGORIES),
  confidence: z.enum(SPEND_DASHBOARD_CONFIDENCE_LEVELS),
});

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;

export const invoiceSaveSchema = invoiceExtractionSchema.extend({
  invoiceDate: isoDateSchema,
  amountTtcCents: moneyCentsSchema,
  currency: z.literal(SPEND_DASHBOARD_DEFAULT_CURRENCY),
});

export type InvoiceSave = z.infer<typeof invoiceSaveSchema>;

type ParseInvoiceExtractionResult =
  | { ok: true; invoice: InvoiceExtraction }
  | { ok: false; error: string };

export function parseInvoiceExtraction(
  value: unknown,
): ParseInvoiceExtractionResult {
  const result = invoiceExtractionSchema.safeParse(value);
  if (!result.success) {
    return { ok: false, error: "Réponse d'extraction invalide." };
  }
  return { ok: true, invoice: result.data };
}

export function parseInvoiceExtractionJson(
  raw: string,
): ParseInvoiceExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: "JSON invalide." };
  }
  return parseInvoiceExtraction(parsed);
}
