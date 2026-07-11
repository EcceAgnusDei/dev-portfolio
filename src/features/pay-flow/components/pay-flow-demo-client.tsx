"use client";

import { useCallback } from "react";

import { CartPanel } from "@/features/pay-flow/components/cart-panel";
import { ProductCatalog } from "@/features/pay-flow/components/product-catalog";
import { useCart } from "@/features/pay-flow/lib/use-cart";

export function PayFlowDemoClient() {
  const {
    lines,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
  } = useCart();

  const handleCheckout = useCallback(() => {
    console.log("[Pay Flow] Checkout mock — lignes envoyées :", lines);
  }, [lines]);

  return (
    <div className="flex flex-col gap-10">
      <ProductCatalog onAddToCart={addItem} />
      <CartPanel
        lines={lines}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
        onRemove={removeItem}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
