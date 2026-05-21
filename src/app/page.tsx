import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { demos } from "@/data/demos";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Portfolio dev</p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          Démos SDK
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Mini-projets et intégrations SDK. Chaque carte mène à une page dédiée avec
          démo interactive et routes API si besoin.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {demos.map((demo) => (
          <li key={demo.slug}>
            <Card>
              <CardHeader>
                <CardTitle>{demo.title}</CardTitle>
                <CardDescription>{demo.description}</CardDescription>
              </CardHeader>
              <CardFooter className="border-t-0 bg-transparent">
                <Button render={<Link href={`/demos/${demo.slug}`} />}>
                  Voir la démo
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
