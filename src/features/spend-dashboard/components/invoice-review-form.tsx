"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { InvoiceExtraction } from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import {
  invoiceToFormValues,
  isInvoiceFormValid,
  validateInvoiceFormValues,
  type InvoiceFormErrors,
  type InvoiceFormField,
  type InvoiceFormValues,
} from "@/features/spend-dashboard/lib/invoice-form-values";
import {
  SPEND_DASHBOARD_CATEGORY_LABELS,
  SPEND_DASHBOARD_CONFIDENCE_LABELS,
  SPEND_DASHBOARD_DEFAULT_CURRENCY,
  SPEND_DASHBOARD_INVOICE_CATEGORIES,
  type SpendDashboardInvoiceCategory,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";
import { saveInvoiceExtraction } from "@/features/spend-dashboard/lib/invoice-store";
import { cn } from "@/lib/utils";

const fieldClassName =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

type InvoiceReviewFormProps = {
  invoice: InvoiceExtraction;
  sourceFileName?: string;
  className?: string;
};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InvoiceReviewForm({
  invoice,
  sourceFileName,
  className,
}: InvoiceReviewFormProps) {
  const formId = useId();
  const [values, setValues] = useState<InvoiceFormValues>(() =>
    invoiceToFormValues(invoice),
  );
  const [errors, setErrors] = useState<InvoiceFormErrors>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave = isInvoiceFormValid(values);

  function updateField<K extends InvoiceFormField>(
    field: K,
    value: InvoiceFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSaveNotice(null);
    setSaveError(null);
  }

  function handleCancel() {
    setValues(invoiceToFormValues(invoice));
    setErrors({});
    setSaveNotice(null);
    setSaveError(null);
  }

  function handleSave() {
    const result = validateInvoiceFormValues(values);
    if (!result.ok) {
      setErrors(result.errors);
      setSaveNotice(null);
      setSaveError(null);
      return;
    }

    const saved = saveInvoiceExtraction(result.invoice, { sourceFileName });
    if (!saved.ok) {
      setSaveNotice(null);
      setSaveError(saved.error);
      setErrors(
        saved.reason === "duplicate"
          ? { invoiceNumber: saved.error }
          : {},
      );
      return;
    }

    setErrors({});
    setSaveError(null);
    setSaveNotice("Facture enregistrée.");
  }

  return (
    <form
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-muted/40 px-4 py-5",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Relecture</p>
        <p className="text-xs text-muted-foreground">
          Corrigez les champs si besoin, puis enregistrez.
        </p>
      </div>

      <p className="text-sm">
        <span className="text-muted-foreground">Confiance IA : </span>
        <span className="font-medium">
          {SPEND_DASHBOARD_CONFIDENCE_LABELS[values.confidence]}
        </span>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={`${formId}-vendor`}
          label="Fournisseur *"
          error={errors.vendor}
        >
          <input
            id={`${formId}-vendor`}
            type="text"
            value={values.vendor}
            onChange={(event) => updateField("vendor", event.target.value)}
            aria-invalid={Boolean(errors.vendor)}
            aria-describedby={errors.vendor ? `${formId}-vendor-error` : undefined}
            className={fieldClassName}
            autoComplete="organization"
            required
          />
        </Field>

        <Field
          id={`${formId}-date`}
          label="Date *"
          error={errors.invoiceDate}
        >
          <input
            id={`${formId}-date`}
            type="date"
            value={values.invoiceDate}
            onChange={(event) => updateField("invoiceDate", event.target.value)}
            aria-invalid={Boolean(errors.invoiceDate)}
            aria-describedby={
              errors.invoiceDate ? `${formId}-date-error` : undefined
            }
            className={fieldClassName}
            required
          />
        </Field>

        <Field
          id={`${formId}-number`}
          label="N° facture"
          error={errors.invoiceNumber}
        >
          <input
            id={`${formId}-number`}
            type="text"
            value={values.invoiceNumber}
            onChange={(event) =>
              updateField("invoiceNumber", event.target.value)
            }
            aria-invalid={Boolean(errors.invoiceNumber)}
            aria-describedby={
              errors.invoiceNumber ? `${formId}-number-error` : undefined
            }
            className={fieldClassName}
          />
        </Field>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Devise</span>
          <p className="flex h-8 items-center text-sm font-medium">
            {SPEND_DASHBOARD_DEFAULT_CURRENCY}
          </p>
        </div>

        <Field
          id={`${formId}-ht`}
          label="Montant HT (€)"
          error={errors.amountHt}
        >
          <input
            id={`${formId}-ht`}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amountHt}
            onChange={(event) => updateField("amountHt", event.target.value)}
            aria-invalid={Boolean(errors.amountHt)}
            aria-describedby={errors.amountHt ? `${formId}-ht-error` : undefined}
            className={fieldClassName}
          />
        </Field>

        <Field
          id={`${formId}-tva`}
          label="TVA (€)"
          error={errors.amountTva}
        >
          <input
            id={`${formId}-tva`}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amountTva}
            onChange={(event) => updateField("amountTva", event.target.value)}
            aria-invalid={Boolean(errors.amountTva)}
            aria-describedby={
              errors.amountTva ? `${formId}-tva-error` : undefined
            }
            className={fieldClassName}
          />
        </Field>

        <Field
          id={`${formId}-ttc`}
          label="Montant TTC (€) *"
          error={errors.amountTtc}
        >
          <input
            id={`${formId}-ttc`}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amountTtc}
            onChange={(event) => updateField("amountTtc", event.target.value)}
            aria-invalid={Boolean(errors.amountTtc)}
            aria-describedby={
              errors.amountTtc ? `${formId}-ttc-error` : undefined
            }
            className={fieldClassName}
            required
          />
        </Field>

        <Field
          id={`${formId}-category`}
          label="Catégorie *"
          error={errors.category}
        >
          <select
            id={`${formId}-category`}
            value={values.category}
            onChange={(event) =>
              updateField(
                "category",
                event.target.value as SpendDashboardInvoiceCategory,
              )
            }
            aria-invalid={Boolean(errors.category)}
            aria-describedby={
              errors.category ? `${formId}-category-error` : undefined
            }
            className={fieldClassName}
            required
          >
            {SPEND_DASHBOARD_INVOICE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {SPEND_DASHBOARD_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!canSave}>
          Enregistrer
        </Button>
        <Button type="button" variant="ghost" onClick={handleCancel}>
          Annuler
        </Button>
        {saveNotice ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {saveNotice}
          </p>
        ) : null}
        {saveError ? (
          <p className="text-xs text-destructive" role="alert">
            {saveError}
          </p>
        ) : null}
      </div>
    </form>
  );
}
