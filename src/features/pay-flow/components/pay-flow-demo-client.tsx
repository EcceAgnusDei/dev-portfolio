"use client";

import { Suspense, useCallback, useState } from "react";

import { CartPanel } from "@/features/pay-flow/components/cart-panel";
import { OrderResult } from "@/features/pay-flow/components/order-result";
import { ProductCatalog } from "@/features/pay-flow/components/product-catalog";
import { useCart } from "@/features/pay-flow/lib/use-cart";
import {
  buildMockCheckoutSuccessUrl,
  useCheckoutUrl,
} from "@/features/pay-flow/lib/use-checkout-url";

function PayFlowDemoContent() {
  const { lines, addItem, incrementItem, decrementItem, removeItem } =
    useCart();
  const { status, sessionId } = useCheckoutUrl();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = useCallback(() => {
    if (lines.length === 0) return;
    setCheckoutLoading(true);
    window.location.assign(buildMockCheckoutSuccessUrl());
  }, [lines]);

  if (status === "success") {
    return <OrderResult variant="success" sessionId={sessionId} />;
  }

  if (status === "cancel") {
    return <OrderResult variant="cancel" />;
  }

  return (
    <div className="flex flex-col gap-10">
      <ProductCatalog onAddToCart={addItem} />
      <hr className="border-border" />
      <CartPanel
        lines={lines}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
        onRemove={removeItem}
        onCheckout={handleCheckout}
        checkoutLoading={checkoutLoading}
      />
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
