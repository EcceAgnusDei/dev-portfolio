"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { InvoiceImportPanel } from "@/features/spend-dashboard/components/invoice-import-panel";
import { InvoiceReviewForm } from "@/features/spend-dashboard/components/invoice-review-form";
import type { InvoiceExtraction } from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import type { InvoiceRecord } from "@/features/spend-dashboard/lib/invoice-store";
import { SPEND_DASHBOARD_DEFAULT_CURRENCY } from "@/features/spend-dashboard/lib/spend-dashboard-config";

const EMPTY_INVOICE_DRAFT: InvoiceExtraction = {
  vendor: "",
  invoiceDate: null,
  invoiceNumber: null,
  currency: SPEND_DASHBOARD_DEFAULT_CURRENCY,
  amountHtCents: null,
  amountTvaCents: null,
  amountTtcCents: null,
  category: "other",
  confidence: "medium",
};

type CreateStep = "import" | "review";

type InvoiceEditSheetProps = {
  mode?: "create" | "edit";
  invoice: InvoiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InvoiceEditSheet({
  mode = "edit",
  invoice,
  open,
  onOpenChange,
}: InvoiceEditSheetProps) {
  const [createStep, setCreateStep] = useState<CreateStep>("import");
  const [draft, setDraft] = useState<InvoiceExtraction>(EMPTY_INVOICE_DRAFT);
  const [draftKey, setDraftKey] = useState(0);
  const [sourceFileName, setSourceFileName] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onOpenChange, open]);

  if (!open) return null;
  if (mode === "edit" && invoice == null) return null;

  const isCreate = mode === "create";

  function handleExtracted(
    extracted: InvoiceExtraction,
    fileName: string,
  ) {
    setDraft(extracted);
    setSourceFileName(fileName);
    setDraftKey((current) => current + 1);
    setCreateStep("review");
  }

  function handleManualEntry() {
    setDraft(EMPTY_INVOICE_DRAFT);
    setSourceFileName(undefined);
    setDraftKey((current) => current + 1);
    setCreateStep("review");
  }

  function handleBackToImport() {
    setCreateStep("import");
    setDraft(EMPTY_INVOICE_DRAFT);
    setSourceFileName(undefined);
  }

  let formInvoice: InvoiceExtraction;
  let invoiceId: string | undefined;
  let formSourceFileName: string | undefined;

  if (isCreate) {
    formInvoice = draft;
    formSourceFileName = sourceFileName;
  } else {
    if (invoice == null) return null;
    formInvoice = invoice;
    invoiceId = invoice.id;
    formSourceFileName = invoice.sourceFileName;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
        aria-label="Fermer l’éditeur"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-edit-sheet-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="invoice-edit-sheet-title" className="text-sm font-medium">
            {isCreate ? "Ajouter une facture" : "Édition de facture"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Fermer"
            onClick={() => onOpenChange(false)}
          >
            <X />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isCreate && createStep === "import" ? (
            <InvoiceImportPanel
              onExtracted={handleExtracted}
              onManualEntry={handleManualEntry}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {isCreate ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto self-start px-0"
                  onClick={handleBackToImport}
                >
                  Changer de document
                </Button>
              ) : null}
              <InvoiceReviewForm
                key={isCreate ? `create-${draftKey}` : invoiceId}
                mode={isCreate ? "create" : "edit"}
                invoice={formInvoice}
                invoiceId={invoiceId}
                sourceFileName={formSourceFileName}
                onSaved={() => onOpenChange(false)}
                onCancel={() => onOpenChange(false)}
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
