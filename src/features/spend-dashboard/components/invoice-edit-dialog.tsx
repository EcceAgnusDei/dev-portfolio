"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";

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

type CreateFlow = {
  step: CreateStep;
  draft: InvoiceExtraction;
  draftKey: number;
  sourceFileName?: string;
};

const INITIAL_CREATE_FLOW: CreateFlow = {
  step: "import",
  draft: EMPTY_INVOICE_DRAFT,
  draftKey: 0,
};

type InvoiceEditDialogProps = {
  mode?: "create" | "edit";
  invoice: InvoiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InvoiceEditDialog({
  mode = "edit",
  invoice,
  open,
  onOpenChange,
}: InvoiceEditDialogProps) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const closeRequestedRef = useRef(false);
  const [createFlow, setCreateFlow] = useState<CreateFlow>(INITIAL_CREATE_FLOW);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && mode === "create") {
      setCreateFlow(INITIAL_CREATE_FLOW);
    }
  }

  useEffect(() => {
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (dialog.open) {
      closeRequestedRef.current = true;
      dialog.close();
    }
  }, [dialog, open]);

  if (mode === "edit" && invoice == null) return null;

  const isCreate = mode === "create";

  function handleExtracted(
    extracted: InvoiceExtraction,
    fileName: string,
  ) {
    setCreateFlow((current) => ({
      step: "review",
      draft: extracted,
      draftKey: current.draftKey + 1,
      sourceFileName: fileName,
    }));
  }

  function handleManualEntry() {
    setCreateFlow((current) => ({
      step: "review",
      draft: EMPTY_INVOICE_DRAFT,
      draftKey: current.draftKey + 1,
      sourceFileName: undefined,
    }));
  }

  function handleBackToImport() {
    setCreateFlow(INITIAL_CREATE_FLOW);
  }

  function close() {
    closeRequestedRef.current = true;
    dialog?.close();
  }

  function handleDialogCancel(event: SyntheticEvent<HTMLDialogElement>) {
    if (!closeRequestedRef.current) {
      event.preventDefault();
    }
  }

  function handleDialogClose() {
    closeRequestedRef.current = false;
    onOpenChange(false);
  }

  let formInvoice: InvoiceExtraction;
  let invoiceId: string | undefined;
  let formSourceFileName: string | undefined;

  if (isCreate) {
    formInvoice = createFlow.draft;
    formSourceFileName = createFlow.sourceFileName;
  } else {
    if (invoice == null) return null;
    formInvoice = invoice;
    invoiceId = invoice.id;
    formSourceFileName = invoice.sourceFileName;
  }

  return (
    <dialog
      ref={setDialog}
      className="z-50 m-auto flex max-h-[min(40rem,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background p-0 shadow-xl backdrop:bg-black/10 supports-backdrop-filter:backdrop:backdrop-blur-xs"
      aria-labelledby="invoice-edit-dialog-title"
      onCancel={handleDialogCancel}
      onClose={handleDialogClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeRequestedRef.current = true;
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id="invoice-edit-dialog-title" className="text-sm font-medium">
          {isCreate ? "Ajouter une facture" : "Édition de facture"}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Fermer"
          onClick={close}
        >
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isCreate && createFlow.step === "import" ? (
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
              key={isCreate ? `create-${createFlow.draftKey}` : invoiceId}
              mode={isCreate ? "create" : "edit"}
              invoice={formInvoice}
              invoiceId={invoiceId}
              sourceFileName={formSourceFileName}
              portalContainer={dialog}
              onSaved={close}
              onCancel={close}
            />
          </div>
        )}
      </div>
    </dialog>
  );
}
