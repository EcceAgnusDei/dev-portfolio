import type { CartLine } from "@/features/pay-flow/lib/utils";

const CART_STORAGE_KEY = "pay-flow-cart";
const CART_STORE_EVENT = "pay-flow-cart-change";

const EMPTY_CART: CartLine[] = [];

let cachedClientSnapshot = EMPTY_CART;
let cachedClientStoreRaw: string | null = null;

function parseStoredLines(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        typeof line === "object" &&
        line !== null &&
        typeof (line as CartLine).productId === "string" &&
        typeof (line as CartLine).qty === "number" &&
        (line as CartLine).qty > 0,
    );
  } catch {
    return [];
  }
}

function notifyCartChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_STORE_EVENT));
}

function writeLines(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  if (lines.length === 0) {
    localStorage.removeItem(CART_STORAGE_KEY);
    cachedClientStoreRaw = null;
    cachedClientSnapshot = EMPTY_CART;
  } else {
    const serialized = JSON.stringify(lines);
    localStorage.setItem(CART_STORAGE_KEY, serialized);
    cachedClientStoreRaw = serialized;
    cachedClientSnapshot = lines;
  }
  notifyCartChange();
}

export function subscribeCart(onStoreChange: () => void): () => void {
  window.addEventListener(CART_STORE_EVENT, onStoreChange);
  return () => window.removeEventListener(CART_STORE_EVENT, onStoreChange);
}

export function getCartSnapshot(): CartLine[] {
  if (typeof window === "undefined") {
    return EMPTY_CART;
  }

  const raw = localStorage.getItem(CART_STORAGE_KEY);
  if (raw === cachedClientStoreRaw) {
    return cachedClientSnapshot;
  }

  cachedClientStoreRaw = raw;
  cachedClientSnapshot = parseStoredLines(raw);
  return cachedClientSnapshot;
}

export function getCartServerSnapshot(): CartLine[] {
  return EMPTY_CART;
}

export function addCartItem(productId: string): void {
  const lines = getCartSnapshot();
  const existing = lines.find((line) => line.productId === productId);
  const next = existing
    ? lines.map((line) =>
        line.productId === productId ? { ...line, qty: line.qty + 1 } : line,
      )
    : [...lines, { productId, qty: 1 }];
  writeLines(next);
}

export function decrementCartItem(productId: string): void {
  const next = getCartSnapshot()
    .map((line) =>
      line.productId === productId ? { ...line, qty: line.qty - 1 } : line,
    )
    .filter((line) => line.qty > 0);
  writeLines(next);
}

export function removeCartItem(productId: string): void {
  writeLines(getCartSnapshot().filter((line) => line.productId !== productId));
}

export function clearCartStore(): void {
  writeLines([]);
}
