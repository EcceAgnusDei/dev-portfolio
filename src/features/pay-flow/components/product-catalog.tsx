"use client";

import { ProductCard } from "@/features/pay-flow/components/product-card";
import { CATALOG } from "@/features/pay-flow/lib/catalog";
import { cn } from "@/lib/utils";

type ProductCatalogProps = {
  onAddToCart: (productId: string) => void;
};

export function ProductCatalog({ onAddToCart }: ProductCatalogProps) {
  return (
    <ul
      className={cn(
        "grid gap-4",
        CATALOG.length === 1
          ? "grid-cols-1"
          : "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {CATALOG.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            onAddToCart={onAddToCart}
            priority={index === 0}
          />
        </li>
      ))}
    </ul>
  );
}
