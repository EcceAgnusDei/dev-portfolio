import type { OrderStatusResponse } from "@/features/pay-flow/lib/get-order-status";

export type FetchOrderStatusResult =
  | { ok: true; data: OrderStatusResponse }
  | { ok: false; error: string };

export async function fetchOrderStatus(
  sessionId: string,
): Promise<FetchOrderStatusResult> {
  const params = new URLSearchParams({ session_id: sessionId });
  let res: Response;
  try {
    res = await fetch(`/api/demos/pay-flow/order-status?${params}`);
  } catch {
    return { ok: false, error: "Réseau indisponible." };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Réponse serveur illisible." };
  }

  if (!res.ok) {
    const obj = data as { error?: unknown };
    const msg =
      typeof obj.error === "string" && obj.error.length > 0
        ? obj.error
        : `Erreur ${res.status}`;
    return { ok: false, error: msg };
  }

  const obj = data as OrderStatusResponse;
  if (!obj || typeof obj !== "object" || typeof obj.status !== "string") {
    return { ok: false, error: "Réponse serveur invalide." };
  }

  return { ok: true, data: obj };
}
