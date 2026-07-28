import {
  invoiceSaveSchema,
  type InvoiceExtraction,
  type InvoiceSave,
} from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import {
  SPEND_DASHBOARD_CONFIDENCE_LEVELS,
  SPEND_DASHBOARD_DEFAULT_CURRENCY,
  SPEND_DASHBOARD_INVOICE_CATEGORIES,
  type SpendDashboardConfidence,
  type SpendDashboardInvoiceCategory,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";

export type InvoiceFormValues = {
  vendor: string;
  invoiceDate: string;
  invoiceNumber: string;
  currency: string;
  amountHt: string;
  amountTva: string;
  amountTtc: string;
  category: SpendDashboardInvoiceCategory;
  confidence: SpendDashboardConfidence;
};

export type InvoiceFormField = keyof InvoiceFormValues;

export type InvoiceFormErrors = Partial<Record<InvoiceFormField, string>>;

function centsToEuroInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function euroInputToCents(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return undefined;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return undefined;
  return Math.round(value * 100);
}

export function invoiceToFormValues(
  invoice: InvoiceExtraction,
): InvoiceFormValues {
  return {
    vendor: invoice.vendor,
    invoiceDate: invoice.invoiceDate ?? "",
    invoiceNumber: invoice.invoiceNumber ?? "",
    currency: SPEND_DASHBOARD_DEFAULT_CURRENCY,
    amountHt: centsToEuroInput(invoice.amountHtCents),
    amountTva: centsToEuroInput(invoice.amountTvaCents),
    amountTtc: centsToEuroInput(invoice.amountTtcCents),
    category: invoice.category,
    confidence: invoice.confidence,
  };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function formValuesToInvoiceCandidate(
  values: InvoiceFormValues,
): unknown {
  const amountHtCents = euroInputToCents(values.amountHt);
  const amountTvaCents = euroInputToCents(values.amountTva);
  const amountTtcCents = euroInputToCents(values.amountTtc);

  return {
    vendor: values.vendor,
    invoiceDate: emptyToNull(values.invoiceDate),
    invoiceNumber: emptyToNull(values.invoiceNumber),
    currency: SPEND_DASHBOARD_DEFAULT_CURRENCY,
    amountHtCents,
    amountTvaCents,
    amountTtcCents,
    category: values.category,
    confidence: values.confidence,
  };
}

const FIELD_BY_ZOD_KEY: Record<string, InvoiceFormField> = {
  vendor: "vendor",
  invoiceDate: "invoiceDate",
  invoiceNumber: "invoiceNumber",
  currency: "currency",
  amountHtCents: "amountHt",
  amountTvaCents: "amountTva",
  amountTtcCents: "amountTtc",
  category: "category",
  confidence: "confidence",
};

function moneyFieldError(
  raw: string,
  parsed: number | null | undefined,
  options?: { required?: boolean },
): string | undefined {
  if (raw.trim() === "") {
    return options?.required ? "Ce champ est obligatoire." : undefined;
  }
  if (parsed == null) return "Montant invalide.";
  if (parsed < 0) return "Le montant ne peut pas être négatif.";
  return undefined;
}

export function validateInvoiceFormValues(
  values: InvoiceFormValues,
):
  | { ok: true; invoice: InvoiceSave; errors: InvoiceFormErrors }
  | { ok: false; errors: InvoiceFormErrors } {
  const errors: InvoiceFormErrors = {};

  if (values.vendor.trim() === "") {
    errors.vendor = "Le fournisseur est obligatoire.";
  }

  if (values.invoiceDate.trim() === "") {
    errors.invoiceDate = "La date est obligatoire.";
  }

  const amountHtCents = euroInputToCents(values.amountHt);
  const amountTvaCents = euroInputToCents(values.amountTva);
  const amountTtcCents = euroInputToCents(values.amountTtc);

  const htError = moneyFieldError(values.amountHt, amountHtCents);
  const tvaError = moneyFieldError(values.amountTva, amountTvaCents);
  const ttcError = moneyFieldError(values.amountTtc, amountTtcCents, {
    required: true,
  });
  if (htError) errors.amountHt = htError;
  if (tvaError) errors.amountTva = tvaError;
  if (ttcError) errors.amountTtc = ttcError;

  if (
    !SPEND_DASHBOARD_INVOICE_CATEGORIES.includes(
      values.category as SpendDashboardInvoiceCategory,
    )
  ) {
    errors.category = "Catégorie invalide.";
  }

  if (
    !SPEND_DASHBOARD_CONFIDENCE_LEVELS.includes(
      values.confidence as SpendDashboardConfidence,
    )
  ) {
    errors.confidence = "Niveau de confiance invalide.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const candidate = formValuesToInvoiceCandidate(values);
  const parsed = invoiceSaveSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key !== "string") continue;
      const field = FIELD_BY_ZOD_KEY[key];
      if (!field || errors[field]) continue;
      errors[field] = issue.message || "Valeur invalide.";
    }
    if (Object.keys(errors).length === 0) {
      errors.vendor = "Formulaire invalide.";
    }
    return { ok: false, errors };
  }

  return { ok: true, invoice: parsed.data, errors: {} };
}

export function isInvoiceFormValid(values: InvoiceFormValues): boolean {
  return validateInvoiceFormValues(values).ok;
}
