"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export type CheckoutUrlStatus = "success" | "cancel";

export type CheckoutUrlState = {
  status: CheckoutUrlStatus | null;
  sessionId: string | null;
};

export function readCheckoutUrl(
  searchParams: URLSearchParams,
): CheckoutUrlState {
  const rawStatus = searchParams.get("status");
  const status =
    rawStatus === "success" || rawStatus === "cancel" ? rawStatus : null;
  const sessionId = searchParams.get("session_id")?.trim() || null;
  return { status, sessionId };
}

export function buildMockCheckoutSuccessUrl(sessionId?: string): string {
  const params = new URLSearchParams({
    status: "success",
    session_id: sessionId ?? `mock-${crypto.randomUUID()}`,
  });
  return `/demos/pay-flow?${params.toString()}`;
}

export function useCheckoutUrl() {
  const searchParams = useSearchParams();
  return useMemo(() => readCheckoutUrl(searchParams), [searchParams]);
}
