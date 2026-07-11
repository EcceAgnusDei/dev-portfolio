"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  addCartItem,
  clearCartStore,
  decrementCartItem,
  getCartServerSnapshot,
  getCartSnapshot,
  removeCartItem,
  subscribeCart,
} from "@/features/pay-flow/lib/cart-store";

export function useCart() {
  const lines = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getCartServerSnapshot,
  );

  const addItem = useCallback((productId: string) => {
    addCartItem(productId);
  }, []);

  const incrementItem = useCallback((productId: string) => {
    addCartItem(productId);
  }, []);

  const decrementItem = useCallback((productId: string) => {
    decrementCartItem(productId);
  }, []);

  const removeItem = useCallback((productId: string) => {
    removeCartItem(productId);
  }, []);

  const clearCart = useCallback(() => {
    clearCartStore();
  }, []);

  return {
    lines,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
    isEmpty: lines.length === 0,
  };
}
