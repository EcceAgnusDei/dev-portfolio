"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/features/pay-flow/lib/utils";
import type { Product } from "@/features/pay-flow/lib/catalog";

const ADDED_FEEDBACK_MS = 2000;

type ProductCardProps = {
  product: Product;
  onAddToCart: (productId: string) => void;
  priority?: boolean;
};

export function ProductCard({
  product,
  onAddToCart,
  priority = false,
}: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleAddToCart = () => {
    onAddToCart(product.id);
    setAdded(true);

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setAdded(false);
      feedbackTimeoutRef.current = null;
    }, ADDED_FEEDBACK_MS);
  };

  return (
    <Card className="h-full">
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={320}
        height={400}
        priority={priority}
        className="aspect-4/5 w-full object-cover"
      />
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-lg font-semibold tabular-nums">
          {formatPrice(product.priceCents)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            TTC
          </span>
        </p>
      </CardContent>
      <CardFooter className="mt-auto border-t-0 bg-transparent">
        <Button
          type="button"
          className="w-full"
          variant={added ? "secondary" : "default"}
          onClick={handleAddToCart}
        >
          {added ? (
            <>
              <Check data-icon="inline-start" />
              Ajouté
            </>
          ) : (
            "Ajouter au panier"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
