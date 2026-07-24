"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/features/pay-flow/lib/utils";
import { cn } from "@/lib/utils";

export type OrderResultVariant =
  | "success"
  | "cancel"
  | "pending"
  | "timeout"
  | "expired"
  | "error";

type OrderResultProps = {
  variant: OrderResultVariant;
  totalCents?: number | null;
  errorMessage?: string | null;
  onRefresh?: () => void;
};

function ShopLink({
  label,
  variant = "default",
  className,
}: {
  label: string;
  variant?: "default" | "link";
  className?: string;
}) {
  return (
    <Link
      href="/demos/pay-flow"
      className={cn(buttonVariants({ variant }), className)}
    >
      {label}
    </Link>
  );
}

type OrderResultView = {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  actions: ReactNode;
};

function getOrderResultView({
  variant,
  totalCents,
  errorMessage,
  onRefresh,
}: OrderResultProps): OrderResultView {
  switch (variant) {
    case "pending":
      return {
        icon: (
          <Loader2 className="pay-flow-spin size-10 text-primary" aria-hidden />
        ),
        title: "Confirmation en cours…",
        body: (
          <p>Nous vérifions votre paiement. Patientez quelques instants.</p>
        ),
        actions: null,
      };
    case "success":
      return {
        icon: <CheckCircle2 className="size-10 text-primary" aria-hidden />,
        title: "Paiement confirmé",
        body: (
          <>
            <p>
              Merci pour votre commande. Le paiement a été confirmé par le
              serveur.
            </p>
            {typeof totalCents === "number" ? (
              <p className="text-foreground">Total {formatPrice(totalCents)}</p>
            ) : null}
          </>
        ),
        actions: <ShopLink label="Retour à la boutique" />,
      };
    case "timeout":
      return {
        icon: <Clock className="size-10 text-primary" aria-hidden />,
        title: "Confirmation en retard",
        body: (
          <p>
            Le paiement a été pris en compte, nous sommes en attente de
            confirmation, veuillez patienter.
          </p>
        ),
        actions: onRefresh ? (
          <Button
            type="button"
            variant="default"
            className="w-full sm:w-auto"
            onClick={onRefresh}
          >
            Mettre à jour
          </Button>
        ) : null,
      };
    case "expired":
      return {
        icon: <XCircle className="size-10 text-muted-foreground" aria-hidden />,
        title: "Session expirée",
        body: (
          <p>
            Cette session de paiement a échoué. Aucun montant n&apos;a été
            débité. Vous pouvez réessayer.
          </p>
        ),
        actions: (
          <>
            <ShopLink label="Réessayer" className="w-full sm:w-auto" />
            <ShopLink label="Retour à la boutique" variant="link" />
          </>
        ),
      };
    case "error":
      return {
        icon: <XCircle className="size-10 text-muted-foreground" aria-hidden />,
        title: "Impossible de confirmer",
        body: (
          <p>
            {errorMessage ??
              "Une erreur est survenue pendant la vérification du paiement, nous ne pouvons pas dire s'il a abouti."}
          </p>
        ),
        actions: (
          <>
            <ShopLink label="Réessayer" className="w-full sm:w-auto" />
            <ShopLink label="Retour à la boutique" variant="link" />
          </>
        ),
      };
    case "cancel":
      return {
        icon: <XCircle className="size-10 text-muted-foreground" aria-hidden />,
        title: "Paiement annulé",
        body: (
          <p>
            Vous avez quitté le paiement avant la fin. Aucun montant n&apos;a
            été débité.
          </p>
        ),
        actions: (
          <>
            <ShopLink label="Réessayer" className="w-full sm:w-auto" />
            <ShopLink label="Retour à la boutique" variant="link" />
          </>
        ),
      };
  }
}

export function OrderResult(props: OrderResultProps) {
  const { icon, title, body, actions } = getOrderResultView(props);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 pt-4 text-center">
        {icon}
        <h2 className="font-heading text-xl font-medium leading-snug">
          {title}
        </h2>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          {body}
        </div>
        {actions ? (
          <div className="flex w-full flex-col items-center gap-2 pt-1">
            {actions}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
