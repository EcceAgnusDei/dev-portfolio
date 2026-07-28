"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { InvoiceReviewForm } from "@/features/spend-dashboard/components/invoice-review-form";
import { formatFileSize } from "@/features/spend-dashboard/lib/format-invoice";
import type { InvoiceExtraction } from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import { postExtractInvoice } from "@/features/spend-dashboard/lib/post-extract-invoice";
import {
  SPEND_DASHBOARD_ACCEPT_ATTR,
  SPEND_DASHBOARD_ACCEPTED_MIME_TYPES,
  SPEND_DASHBOARD_MAX_FILE_BYTES,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";
import { cn } from "@/lib/utils";

type ExtractPhase = "idle" | "loading" | "error" | "success";

const ACCEPTED_MIME = new Set<string>(SPEND_DASHBOARD_ACCEPTED_MIME_TYPES);

export function SpendDashboardDemoClient() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<ExtractPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceExtraction | null>(null);
  const [extractionKey, setExtractionKey] = useState(0);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetResult() {
    setPhase("idle");
    setErrorMessage(null);
    setInvoice(null);
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    resetResult();
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFileChange(next: File | null) {
    if (!next) {
      clearFile();
      return;
    }

    if (!ACCEPTED_MIME.has(next.type)) {
      clearFile();
      setPhase("error");
      setErrorMessage(
        "Format non pris en charge. Utilisez une image (JPEG, PNG, WebP) ou un PDF.",
      );
      return;
    }

    if (next.size > SPEND_DASHBOARD_MAX_FILE_BYTES) {
      clearFile();
      setPhase("error");
      setErrorMessage(
        `Fichier trop volumineux (max. ${formatFileSize(SPEND_DASHBOARD_MAX_FILE_BYTES)}).`,
      );
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = next.type.startsWith("image/")
      ? URL.createObjectURL(next)
      : null;
    setFile(next);
    setPreviewUrl(url);
    resetResult();
  }

  async function handleExtract() {
    if (!file || phase === "loading") return;
    setPhase("loading");
    setErrorMessage(null);
    setInvoice(null);

    const result = await postExtractInvoice(file);
    if (!result.ok) {
      setPhase("error");
      setErrorMessage(result.error);
      return;
    }

    setInvoice(result.invoice);
    setExtractionKey((key) => key + 1);
    setPhase("success");
  }

  const isImage = Boolean(file?.type.startsWith("image/"));
  const canExtract = Boolean(file) && phase !== "loading";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center",
            file && "items-stretch text-left",
          )}
        >
          {!file ? (
            <>
              <Upload
                className="size-8 text-muted-foreground"
                aria-hidden
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  Déposez une facture ou choisissez un fichier
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP ou PDF — max.{" "}
                  {formatFileSize(SPEND_DASHBOARD_MAX_FILE_BYTES)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Choisir un fichier
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative flex size-36 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background ring-1 ring-foreground/10">
                {isImage && previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt={`Aperçu de ${file.name}`}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                ) : (
                  <FileText
                    className="size-10 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={phase === "loading"}
                  >
                    Remplacer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    disabled={phase === "loading"}
                  >
                    Retirer
                  </Button>
                </div>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="sr-only"
            accept={SPEND_DASHBOARD_ACCEPT_ATTR}
            onChange={(event) => {
              handleFileChange(event.target.files?.[0] ?? null);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={!canExtract}
            onClick={handleExtract}
          >
            {phase === "loading" ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Extraction…
              </>
            ) : (
              "Extraire"
            )}
          </Button>
          {phase === "success" || phase === "error" ? (
            <Button type="button" variant="ghost" onClick={resetResult}>
              Réinitialiser le résultat
            </Button>
          ) : null}
        </div>
      </section>

      <section aria-live="polite" className="min-h-28">
        {phase === "idle" ? (
          <div className="rounded-xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            Les champs extraits apparaîtront ici après l’analyse.
          </div>
        ) : null}

        {phase === "loading" ? (
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Analyse de la facture en cours…
          </div>
        ) : null}

        {phase === "error" && errorMessage ? (
          <div
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-6 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}

        {phase === "success" && invoice ? (
          <InvoiceReviewForm
            key={extractionKey}
            invoice={invoice}
            sourceFileName={file?.name}
          />
        ) : null}
      </section>
    </div>
  );
}
