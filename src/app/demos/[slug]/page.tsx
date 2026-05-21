import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DemoPlaceholder } from "@/features/demos/components/demo-placeholder";
import { getDemoBySlug } from "@/data/demos";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const { demos } = await import("@/data/demos");
  return demos.map((demo) => ({ slug: demo.slug }));
}

export default async function DemoPage({ params }: PageProps) {
  const { slug } = await params;
  const demo = getDemoBySlug(slug);
  if (!demo) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit px-0" render={<Link href="/" />}>
          Retour
        </Button>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {demo.title}
        </h1>
        <p className="text-muted-foreground">{demo.description}</p>
        <div className="flex flex-wrap gap-2">
          {demo.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <DemoPlaceholder title={demo.title} />
    </div>
  );
}
