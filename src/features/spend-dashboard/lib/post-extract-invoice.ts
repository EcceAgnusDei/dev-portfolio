import { formatFileSize } from "@/features/spend-dashboard/lib/format-invoice";
import {
  parseInvoiceExtraction,
  type InvoiceExtraction,
} from "@/features/spend-dashboard/lib/invoice-extraction-schema";
import {
  SPEND_DASHBOARD_ACCEPTED_MIME_TYPES,
  SPEND_DASHBOARD_MAX_FILE_BYTES,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";

export type PostExtractInvoiceResult =
  | { ok: true; invoice: InvoiceExtraction }
  | { ok: false; error: string };

const ACCEPTED_MIME = new Set<string>(SPEND_DASHBOARD_ACCEPTED_MIME_TYPES);

export async function postExtractInvoice(
  file: File,
): Promise<PostExtractInvoiceResult> {
  if (!ACCEPTED_MIME.has(file.type)) {
    return {
      ok: false,
      error:
        "Format non pris en charge. Utilisez une image (JPEG, PNG, WebP) ou un PDF.",
    };
  }

  if (file.size > SPEND_DASHBOARD_MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `Fichier trop volumineux (max. ${formatFileSize(SPEND_DASHBOARD_MAX_FILE_BYTES)}).`,
    };
  }

  const body = new FormData();
  body.set("file", file);

  let res: Response;
  try {
    res = await fetch("/api/demos/spend-dashboard/extract", {
      method: "POST",
      body,
    });
  } catch {
    return { ok: false, error: "Réseau indisponible." };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Réponse serveur illisible." };
  }

  const obj = data as { error?: unknown; invoice?: unknown };

  if (!res.ok) {
    const msg =
      typeof obj.error === "string" && obj.error.length > 0
        ? obj.error
        : `Erreur ${res.status}`;
    return { ok: false, error: msg };
  }

  const parsed = parseInvoiceExtraction(obj.invoice);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  return { ok: true, invoice: parsed.invoice };
}
