import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatInvoiceMoney } from "@/features/spend-dashboard/lib/format-invoice";
import type { DashboardSummary } from "@/features/spend-dashboard/lib/build-dashboard-summary";
import { SPEND_DASHBOARD_CATEGORY_LABELS } from "@/features/spend-dashboard/lib/spend-dashboard-config";
import { cn } from "@/lib/utils";

type DashboardOverviewProps = {
  summary: DashboardSummary;
  className?: string;
};

function formatEvolution(percent: number | null): string {
  if (percent == null) return "—";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  })} %`;
}

function shareOfTotal(partCents: number, totalCents: number): number {
  if (totalCents <= 0) return 0;
  return (partCents / totalCents) * 100;
}

function formatSharePercent(percent: number): string {
  return `${percent.toLocaleString("fr-FR", {
    maximumFractionDigits: 0,
  })} %`;
}

export function DashboardOverview({
  summary,
  className,
}: DashboardOverviewProps) {
  const totalCents = summary.totalTtcCents;
  const evolutionPositive =
    summary.evolutionPercent != null && summary.evolutionPercent > 0;
  const evolutionNegative =
    summary.evolutionPercent != null && summary.evolutionPercent < 0;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Vue d’ensemble</p>
        <p className="text-sm text-muted-foreground">{summary.periodLabel}</p>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardDescription>Total TTC</CardDescription>
          <CardTitle className="text-xl">
            {formatInvoiceMoney(summary.totalTtcCents, summary.currency)}
          </CardTitle>
          <p
            className={cn(
              "text-sm",
              evolutionPositive && "text-emerald-700 dark:text-emerald-400",
              evolutionNegative && "text-destructive",
              !evolutionPositive &&
                !evolutionNegative &&
                "text-muted-foreground",
            )}
          >
            {formatEvolution(summary.evolutionPercent)} vs période précédente
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Par catégorie</CardTitle>
            <CardDescription>Part du total des dépenses</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {summary.byCategory.map((entry) => {
              const sharePercent = shareOfTotal(entry.totalCents, totalCents);
              return (
                <div key={entry.category} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>
                      {SPEND_DASHBOARD_CATEGORY_LABELS[entry.category]}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-medium">
                        {formatInvoiceMoney(
                          entry.totalCents,
                          summary.currency,
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatSharePercent(sharePercent)}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/80"
                      style={{ width: `${sharePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top fournisseurs</CardTitle>
            <CardDescription>Part du total des dépenses</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {summary.topVendors.map((entry) => {
              const sharePercent = shareOfTotal(entry.totalCents, totalCents);
              return (
                <div key={entry.vendor} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{entry.vendor}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-medium">
                        {formatInvoiceMoney(
                          entry.totalCents,
                          summary.currency,
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatSharePercent(sharePercent)}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/55"
                      style={{ width: `${sharePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
