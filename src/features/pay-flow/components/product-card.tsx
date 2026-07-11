import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/features/pay-flow/lib/format-price";
import type { Product } from "@/features/pay-flow/lib/catalog";

type ProductCardProps = {
  product: Product;
  onAddToCart?: (productId: string) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className="h-full">
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={320}
        height={400}
        className="aspect-4/5 w-full object-cover"
      />
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-lg font-semibold">
          {formatPrice(product.priceCents)}
        </p>
      </CardContent>
      <CardFooter className="mt-auto border-t-0 bg-transparent">
        <Button
          type="button"
          className="w-full"
          disabled={!onAddToCart}
          onClick={() => onAddToCart?.(product.id)}
        >
          Ajouter au panier
        </Button>
      </CardFooter>
    </Card>
  );
}
