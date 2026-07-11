"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/pay-flow/components/product-card";
import {
  PRODUCT_CATEGORIES,
  getProductsByCategory,
  type ProductCategory,
} from "@/features/pay-flow/lib/catalog";
import { cn } from "@/lib/utils";

type ProductCatalogProps = {
  onAddToCart?: (productId: string) => void;
};

export function ProductCatalog({ onAddToCart }: ProductCatalogProps) {
  const [category, setCategory] = useState<ProductCategory | "all">("all");

  const products = getProductsByCategory(category);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={category === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategory("all")}
        >
          Tous
        </Button>
        {PRODUCT_CATEGORIES.map((entry) => (
          <Button
            key={entry.id}
            type="button"
            variant={category === entry.id ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(entry.id)}
          >
            {entry.label}
          </Button>
        ))}
      </div>
      <ul
        className={cn(
          "grid gap-4",
          products.length === 1
            ? "grid-cols-1"
            : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} onAddToCart={onAddToCart} />
          </li>
        ))}
      </ul>
    </div>
  );
}
