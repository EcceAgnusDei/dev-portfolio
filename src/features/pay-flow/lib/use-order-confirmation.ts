"use client";

import { useCallback, useEffect, useState } from "react";

import {
  PAY_FLOW_ORDER_POLL_INTERVAL_MS,
  PAY_FLOW_ORDER_POLL_TIMEOUT_MS,
} from "@/features/pay-flow/lib/pay-flow-config";
import { fetchOrderStatus } from "@/features/pay-flow/lib/fetch-order-status";
import type { OrderStatusResponse } from "@/features/pay-flow/lib/get-order-status";

export type OrderConfirmationPhase =
  | "idle"
  | "pending"
  | "paid"
  | "expired"
  | "timeout"
  | "error";

export type ConfirmedOrder = Extract<
  OrderStatusResponse,
  { status: "pending" | "paid" | "expired" }
>;

export type OrderConfirmationState = {
  phase: OrderConfirmationPhase;
  order: ConfirmedOrder | null;
  error: string | null;
  refresh: () => void;
};

const initialState = {
  phase: "idle" as OrderConfirmationPhase,
  order: null as ConfirmedOrder | null,
  error: null as string | null,
};

export function useOrderConfirmation(
  sessionId: string | null,
): OrderConfirmationState {
  const [state, setState] = useState(initialState);
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    const startedAt = Date.now();

    queueMicrotask(() => {
      if (cancelled) return;
      setState((prev) => ({
        phase: "pending",
        order: prev.order,
        error: null,
      }));
    });

    function scheduleNext() {
      timeoutId = window.setTimeout(tick, PAY_FLOW_ORDER_POLL_INTERVAL_MS);
    }

    async function tick() {
      if (cancelled || !sessionId) return;

      if (Date.now() - startedAt >= PAY_FLOW_ORDER_POLL_TIMEOUT_MS) {
        setState((prev) => ({
          phase: "timeout",
          order: prev.order,
          error: null,
        }));
        return;
      }

      const result = await fetchOrderStatus(sessionId);
      if (cancelled) return;

      if (!result.ok) {
        setState((prev) => ({
          phase: "pending",
          order: prev.order,
          error: result.error,
        }));
        scheduleNext();
        return;
      }

      const { data } = result;

      if (data.status === "not_found") {
        setState({ phase: "pending", order: null, error: null });
        scheduleNext();
        return;
      }

      if (data.status === "paid") {
        setState({ phase: "paid", order: data, error: null });
        return;
      }

      if (data.status === "expired") {
        setState({ phase: "expired", order: data, error: null });
        return;
      }

      setState({ phase: "pending", order: data, error: null });
      scheduleNext();
    }

    void tick();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [sessionId, attempt]);

  if (!sessionId) {
    return {
      phase: "error",
      order: null,
      error: "Référence de session manquante.",
      refresh,
    };
  }

  return { ...state, refresh };
}
