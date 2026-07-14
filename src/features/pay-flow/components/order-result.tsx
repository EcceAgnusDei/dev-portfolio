"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OrderResultVariant = "success" | "cancel" | "pending";

type OrderResultProps = {
  variant: OrderResultVariant;
  sessionId?: string | null;
};

function formatSessionId(sessionId: string): string {
  if (sessionId.length <= 16) return sessionId;
  return `${sessionId.slice(0, 10)}…${sessionId.slice(-4)}`;
}

export function OrderResult({ variant, sessionId }: OrderResultProps) {
  const isSuccess = variant === "success";
  const isPending = variant === "pending";

  return (
    <Card>
      <CardHeader className="flex flex-col items-center gap-3 text-center">
        {isPending ? (
          <Loader2 className="size-10 text-primary animate-spin" aria-hidden />
        ) : isSuccess ? (
          <CheckCircle2 className="size-10 text-primary" aria-hidden />
        ) : (
          <XCircle className="size-10 text-muted-foreground" aria-hidden />
        )}
        <CardTitle className="text-xl">
          {isPending
            ? "Confirmation en cours…"
            : isSuccess
              ? "Paiement réussi"
              : "Paiement annulé"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        {isPending ? (
          <p>
            Nous vérifions votre paiement côté serveur. Patientez quelques
            instants.
          </p>
        ) : isSuccess ? (
          <>
            <p>Merci pour votre commande. Votre paiement a été enregistré.</p>
            {sessionId ? (
              <p className="font-mono text-xs text-foreground/80">
                Référence {formatSessionId(sessionId)}
              </p>
            ) : null}
          </>
        ) : (
          <p>
            Vous avez quitté le paiement avant la fin. Aucun montant n&apos;a
            été débité.
          </p>
        )}
      </CardContent>
      {!isPending ? (
        <CardFooter
          className={cn(
            "border-t-0 bg-transparent",
            isSuccess ? "justify-center" : "flex flex-col items-center gap-2",
          )}
        >
          {isSuccess ? (
            <Link
              href="/demos/pay-flow"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Retour à la boutique
            </Link>
          ) : (
            <>
              <Link
                href="/demos/pay-flow"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full sm:w-auto",
                )}
              >
                Réessayer
              </Link>
              <Link
                href="/demos/pay-flow"
                className={cn(buttonVariants({ variant: "link" }))}
              >
                Retour à la boutique
              </Link>
            </>
          )}
        </CardFooter>
      ) : null}
    </Card>
  );
}
