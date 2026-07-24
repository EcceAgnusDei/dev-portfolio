"use client";

import { Suspense, useCallback, useEffect, useState } from "react";

import { CartPanel } from "@/features/pay-flow/components/cart-panel";
import {
  OrderResult,
  type OrderResultVariant,
} from "@/features/pay-flow/components/order-result";
import { ProductCatalog } from "@/features/pay-flow/components/product-catalog";
import { postCheckout } from "@/features/pay-flow/lib/post-checkout";
import { useCart } from "@/features/pay-flow/lib/use-cart";
import { useCheckoutUrl } from "@/features/pay-flow/lib/use-checkout-url";
import {
  useOrderConfirmation,
  type OrderConfirmationPhase,
} from "@/features/pay-flow/lib/use-order-confirmation";

function phaseToVariant(phase: OrderConfirmationPhase): OrderResultVariant {
  switch (phase) {
    case "paid":
      return "success";
    case "timeout":
      return "timeout";
    case "expired":
      return "expired";
    case "error":
      return "error";
    case "pending":
    case "idle":
    default:
      return "pending";
  }
}

function SuccessConfirmation({
  sessionId,
  onConfirmed,
}: {
  sessionId: string | null;
  onConfirmed: () => void;
}) {
  const { phase, order, error, refresh } = useOrderConfirmation(sessionId);

  useEffect(() => {
    if (phase === "paid") onConfirmed();
  }, [phase, onConfirmed]);

  return (
    <OrderResult
      variant={phaseToVariant(phase)}
      totalCents={order?.totalCents}
      errorMessage={error}
      onRefresh={refresh}
    />
  );
}

function PayFlowDemoContent() {
  const {
    lines,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
  } = useCart();
  const { status, sessionId } = useCheckoutUrl();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = useCallback(async () => {
    if (lines.length === 0) return;
    setCheckoutError(null);
    setCheckoutLoading(true);
    const result = await postCheckout(lines);
    if (!result.ok) {
      setCheckoutError(result.error);
      setCheckoutLoading(false);
      return;
    }
    window.location.assign(result.url);
  }, [lines]);

  const handleConfirmed = useCallback(() => {
    clearCart();
  }, [clearCart]);

  if (status === "success") {
    return (
      <SuccessConfirmation
        sessionId={sessionId}
        onConfirmed={handleConfirmed}
      />
    );
  }

  if (status === "cancel") {
    return <OrderResult variant="cancel" />;
  }

  return (
    <div className="flex flex-col gap-10">
      <ProductCatalog onAddToCart={addItem} />
      <hr className="border-border" />
      <div className="flex flex-col gap-3">
        <CartPanel
          lines={lines}
          onIncrement={incrementItem}
          onDecrement={decrementItem}
          onRemove={removeItem}
          onCheckout={handleCheckout}
          checkoutLoading={checkoutLoading}
        />
        {checkoutError ? (
          <p className="text-sm text-destructive" role="alert">
            {checkoutError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PayFlowDemoClient() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}
    >
      <PayFlowDemoContent />
    </Suspense>
  );
}
