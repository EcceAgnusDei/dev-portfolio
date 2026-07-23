import type { ResolvedCartLine } from "@/features/pay-flow/lib/catalog";

export type OrderStatus = "pending" | "paid" | "expired";

export type OrderRecord = {
  sessionId: string;
  status: OrderStatus;
  lines: ResolvedCartLine[];
  totalCents: number;
  createdAt: number;
  paidAt?: number;
};

const orders = new Map<string, OrderRecord>();

export function createPendingOrder(input: {
  sessionId: string;
  lines: ResolvedCartLine[];
  totalCents: number;
}): OrderRecord {
  const record: OrderRecord = {
    sessionId: input.sessionId,
    status: "pending",
    lines: input.lines,
    totalCents: input.totalCents,
    createdAt: Date.now(),
  };
  orders.set(input.sessionId, record);
  return record;
}

export function getOrder(sessionId: string): OrderRecord | undefined {
  return orders.get(sessionId);
}

export function markOrderPaid(sessionId: string): OrderRecord | undefined {
  const existing = orders.get(sessionId);
  if (!existing) return undefined;
  if (existing.status === "paid") return existing;

  const updated: OrderRecord = {
    ...existing,
    status: "paid",
    paidAt: Date.now(),
  };
  orders.set(sessionId, updated);
  return updated;
}

export function markOrderExpired(sessionId: string): OrderRecord | undefined {
  const existing = orders.get(sessionId);
  if (!existing) return undefined;
  if (existing.status === "paid") return existing;

  const updated: OrderRecord = {
    ...existing,
    status: "expired",
  };
  orders.set(sessionId, updated);
  return updated;
}

export function clearOrderStore(): void {
  orders.clear();
}
