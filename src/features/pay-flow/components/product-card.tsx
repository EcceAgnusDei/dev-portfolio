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
import { formatPrice } from "@/features/pay-flow/lib/utils";
import type { Product } from "@/features/pay-flow/lib/catalog";

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
        <p className="font-heading text-lg font-semibold">
          {formatPrice(product.priceCents)}
        </p>
      </CardContent>
      <CardFooter className="mt-auto border-t-0 bg-transparent">
        <Button
          type="button"
          className="w-full"
          onClick={() => onAddToCart(product.id)}
        >
          Ajouter au panier
        </Button>
      </CardFooter>
    </Card>
  );
}
