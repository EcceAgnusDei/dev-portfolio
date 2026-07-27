import { z } from "zod";

export const demoSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

export type Demo = z.infer<typeof demoSchema>;

export const demos = demoSchema.array().parse([
  {
    slug: "pixel-ai",
    title: "Pixel AI",
    description: "Faites du dessin pixel par pixel en colaborant avec l'IA.",
  },
  {
    slug: "vector-ai",
    title: "Vector AI",
    description: "Dessiner en vecteur avec l’IA.",
  },
  {
    slug: "pay-flow",
    title: "Pay Flow",
    description: "Miniboutique avec panier et paiement Stripe en mode test.",
  },
  {
    slug: "spend-dashboard",
    title: "Spend Dashboard",
    description:
      "Extrayez des factures et visualisez vos dépenses dans un dashboard.",
  },
]);

export function getDemoBySlug(slug: string): Demo | undefined {
  return demos.find((demo) => demo.slug === slug);
}
