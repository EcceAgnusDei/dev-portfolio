import type { CartLine } from "@/features/pay-flow/lib/utils";

export type PostCheckoutResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; error: string };

export async function postCheckout(
  lines: CartLine[],
): Promise<PostCheckoutResult> {
  if (lines.length === 0) {
    return { ok: false, error: "Le panier est vide." };
  }

  let res: Response;
  try {
    res = await fetch("/api/demos/pay-flow/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
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

  const obj = data as {
    error?: unknown;
    url?: unknown;
    sessionId?: unknown;
  };

  if (!res.ok) {
    const msg =
      typeof obj.error === "string" && obj.error.length > 0
        ? obj.error
        : `Erreur ${res.status}`;
    return { ok: false, error: msg };
  }

  if (typeof obj.url !== "string" || obj.url.length === 0) {
    return { ok: false, error: "Réponse serveur invalide." };
  }

  if (typeof obj.sessionId !== "string" || obj.sessionId.length === 0) {
    return { ok: false, error: "Réponse serveur invalide." };
  }

  return { ok: true, url: obj.url, sessionId: obj.sessionId };
}
