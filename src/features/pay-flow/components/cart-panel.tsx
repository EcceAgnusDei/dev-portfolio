"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  computeCartTotalCents,
  getProductById,
} from "@/features/pay-flow/lib/catalog";
import { formatPrice, type CartLine } from "@/features/pay-flow/lib/utils";

type CartPanelProps = {
  lines: CartLine[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  checkoutLoading?: boolean;
};

export function CartPanel({
  lines,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  checkoutLoading = false,
}: CartPanelProps) {
  const totalCents = computeCartTotalCents(lines);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Panier</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Votre panier est vide.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => {
              const product = getProductById(line.productId);
              if (!product) return null;

              return (
                <li
                  key={line.productId}
                  className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">
                      {product.name}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Retirer ${product.name} du panier`}
                      onClick={() => onRemove(line.productId)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label={`Diminuer la quantité de ${product.name}`}
                        onClick={() => onDecrement(line.productId)}
                      >
                        <Minus />
                      </Button>
                      <span className="min-w-6 text-center text-sm tabular-nums">
                        {line.qty}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label={`Augmenter la quantité de ${product.name}`}
                        onClick={() => onIncrement(line.productId)}
                      >
                        <Plus />
                      </Button>
                    </div>
                    <p className="text-sm font-medium tabular-nums">
                      {formatPrice(product.priceCents * line.qty)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t-0 bg-transparent">
        <div className="flex w-full items-center justify-between gap-1">
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {formatPrice(totalCents)}
          </span>
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={lines.length === 0 || checkoutLoading}
          onClick={onCheckout}
        >
          {checkoutLoading ? "Redirection…" : "Payer"}
        </Button>
      </CardFooter>
    </Card>
  );
}
