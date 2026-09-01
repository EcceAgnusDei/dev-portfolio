"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InvoiceExtraction } from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import { formatFileSize } from "@/features/spend-dashboard/lib/format-invoice";
import { postExtractInvoice } from "@/features/spend-dashboard/lib/post-extract-invoice";
import {
  SPEND_DASHBOARD_ACCEPT_ATTR,
  SPEND_DASHBOARD_MAX_FILE_BYTES,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";
import { cn } from "@/lib/utils";

type InvoiceImportPanelProps = {
  onExtracted: (invoice: InvoiceExtraction, sourceFileName: string) => void;
  onManualEntry: () => void;
  className?: string;
};

export function InvoiceImportPanel({
  onExtracted,
  onManualEntry,
  className,
}: InvoiceImportPanelProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isActiveRef = useRef(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  async function handleExtract(file: File) {
    setIsExtracting(true);
    setError(null);
    const result = await postExtractInvoice(file);
    if (!isActiveRef.current) return;

    setIsExtracting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onExtracted(result.invoice, file.name);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    void handleExtract(file);
  }

  function handleChooseFile() {
    inputRef.current?.click();
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Importer une facture</p>
        <p className="text-xs text-muted-foreground">
          Déposez un PDF ou une image pour préremplir les champs avec l’IA.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={SPEND_DASHBOARD_ACCEPT_ATTR}
          className="sr-only"
          disabled={isExtracting}
          onChange={handleFileChange}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 text-center text-sm",
            isExtracting && "pointer-events-none opacity-60",
          )}
        >
          <span className="font-medium">
            {isExtracting
              ? "Extraction en cours…"
              : "Choisir un fichier"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, WebP ou PDF — max.{" "}
            {formatFileSize(SPEND_DASHBOARD_MAX_FILE_BYTES)}
          </span>
        </label>
        {!isExtracting ? (
          <Button
            type="button"
            variant="outline"
            className="self-center"
            onClick={handleChooseFile}
          >
            Parcourir…
          </Button>
        ) : null}
        {selectedFile && !isExtracting ? (
          <p className="text-center text-xs text-muted-foreground">
            {selectedFile.name} · {formatFileSize(selectedFile.size)}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="link"
        className="h-auto self-start px-0"
        disabled={isExtracting}
        onClick={onManualEntry}
      >
        Saisir manuellement
      </Button>
    </div>
  );
}
