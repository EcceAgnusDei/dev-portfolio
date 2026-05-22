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
    slug: "example-sdk",
    title: "Exemple SDK",
    description:
      "Page modèle pour une démo interactive. Remplace le contenu par ton intégration SDK.",
  },
]);

export function getDemoBySlug(slug: string): Demo | undefined {
  return demos.find((demo) => demo.slug === slug);
}
