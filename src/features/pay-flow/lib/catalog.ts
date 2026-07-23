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

export const cartLineInputSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().max(99),
});

export const cartLinesInputSchema = z
  .array(cartLineInputSchema)
  .min(1, "Le panier est vide.");

export type ResolvedCartLine = {
  productId: string;
  qty: number;
  name: string;
  unitAmountCents: number;
  lineTotalCents: number;
};

export type ResolvedCart = {
  lines: ResolvedCartLine[];
  totalCents: number;
};

export class ResolveCartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolveCartError";
  }
}

export function resolveCartLines(input: unknown): ResolvedCart {
  const parsed = cartLinesInputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ResolveCartError(first?.message ?? "Panier invalide.");
  }

  const qtyByProductId = new Map<string, number>();
  for (const line of parsed.data) {
    qtyByProductId.set(
      line.productId,
      (qtyByProductId.get(line.productId) ?? 0) + line.qty,
    );
  }

  const lines: ResolvedCartLine[] = [];
  let totalCents = 0;

  for (const [productId, qty] of qtyByProductId) {
    if (qty > 99) {
      throw new ResolveCartError(
        `La quantité pour « ${productId} » dépasse la limite (99).`,
      );
    }

    const product = getProductById(productId);
    if (!product) {
      throw new ResolveCartError(`Produit inconnu : « ${productId} ».`);
    }

    const lineTotalCents = product.priceCents * qty;
    totalCents += lineTotalCents;
    lines.push({
      productId: product.id,
      qty,
      name: product.name,
      unitAmountCents: product.priceCents,
      lineTotalCents,
    });
  }

  return { lines, totalCents };
}
