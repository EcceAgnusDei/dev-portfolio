import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";

import { buttonVariants } from "@/components/ui/button";
import { getDemoBySlug } from "@/features/demos/demos";
import { PixelAiDemoClient } from "@/features/pixel-ai/components/pixel-ai-demo-client";
import { VectorAiDemoClient } from "@/features/vector-ai/components/vector-ai-demo-client";
import { cn } from "@/lib/utils";

const DEMO_VIEWS: Record<string, ComponentType> = {
  "pixel-ai": PixelAiDemoClient,
  "vector-ai": VectorAiDemoClient,
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const { demos } = await import("@/features/demos/demos");
  return demos.map((demo) => ({ slug: demo.slug }));
}

export default async function DemoPage({ params }: PageProps) {
  const { slug } = await params;
  const demo = getDemoBySlug(slug);
  if (!demo) notFound();

  const View = DEMO_VIEWS[slug];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "link" }), "w-fit")}
        >
          ← Retour
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {demo.title}
        </h1>
        <p className="text-muted-foreground">{demo.description}</p>
      </div>
      {View ? <View /> : null}
    </div>
  );
}
