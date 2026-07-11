import { z } from "zod";

export const productCategorySchema = z.enum(["bustes"]);

export type ProductCategory = z.infer<typeof productCategorySchema>;

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().positive(),
  category: productCategorySchema,
  imageUrl: z.string().min(1),
});

export type Product = z.infer<typeof productSchema>;

export const CATALOG: Product[] = productSchema.array().parse([
  {
    id: "buste-socrate",
    name: "Buste de Socrate",
    description:
      "Reproduction en plâtre patiné, 28 cm. Le maître athénien qui a posé les fondements de la dialectique.",
    priceCents: 8900,
    category: "bustes",
    imageUrl: "/pay-flow/buste-socrate.jpg",
  },
  {
    id: "buste-aristote",
    name: "Buste d'Aristote",
    description:
      "Reproduction en plâtre patiné, 28 cm. Le fondateur du Lycée et de la logique formelle.",
    priceCents: 7900,
    category: "bustes",
    imageUrl: "/pay-flow/buste-aristote.jpg",
  },
  {
    id: "buste-seneque",
    name: "Buste de Sénèque",
    description:
      "Reproduction en plâtre patiné, 28 cm. Le stoïcien romain, penseur de la vertu et de la résilience.",
    priceCents: 6900,
    category: "bustes",
    imageUrl: "/pay-flow/buste-seneque.jpg",
  },
]);

export function getProductById(id: string): Product | undefined {
  return CATALOG.find((product) => product.id === id);
}

export function computeCartTotalCents(
  lines: { productId: string; qty: number }[],
): number {
  return lines.reduce((total, line) => {
    const product = getProductById(line.productId);
    if (!product) return total;
    return total + product.priceCents * line.qty;
  }, 0);
}
