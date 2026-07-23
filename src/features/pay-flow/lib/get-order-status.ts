import {
  getOrder,
  type OrderRecord,
  type OrderStatus,
} from "@/features/pay-flow/lib/order-store";

export type OrderStatusResponse =
  | { status: "not_found" }
  | {
      status: OrderStatus;
      sessionId: string;
      totalCents: number;
      lines: OrderRecord["lines"];
      paidAt?: number;
    };

export function getOrderStatus(sessionId: string): OrderStatusResponse {
  const order = getOrder(sessionId);
  if (!order) {
    return { status: "not_found" };
  }

  return {
    status: order.status,
    sessionId: order.sessionId,
    totalCents: order.totalCents,
    lines: order.lines,
    ...(order.paidAt !== undefined ? { paidAt: order.paidAt } : {}),
  };
}
