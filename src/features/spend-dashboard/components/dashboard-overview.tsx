"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  formatInvoiceDate,
  formatInvoiceMoney,
} from "@/features/spend-dashboard/lib/format-invoice";
import type {
  DashboardSummary,
  DashboardVendorTotal,
} from "@/features/spend-dashboard/lib/build-dashboard-summary";
import type { InvoiceRecord } from "@/features/spend-dashboard/lib/invoice-store";
import { InvoiceEditDialog } from "@/features/spend-dashboard/components/invoice-edit-dialog";
import { SPEND_DASHBOARD_CATEGORY_LABELS } from "@/features/spend-dashboard/lib/spend-dashboard-config";
import { cn } from "@/lib/utils";

type DashboardOverviewProps = {
  summary: DashboardSummary;
  invoicesEditable?: boolean;
  isCreating?: boolean;
  onCreatingChange?: (creating: boolean) => void;
  className?: string;
};

type InvoiceSortKey = "date" | "vendor" | "category" | "amount";
type SortDirection = "asc" | "desc";

const TOP_VENDORS_PREVIEW = 5;

const cardHeadingClassName =
  "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm";

function formatEvolution(percent: number): string {
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

function compareInvoices(
  a: InvoiceRecord,
  b: InvoiceRecord,
  sortKey: InvoiceSortKey,
): number {
  switch (sortKey) {
    case "date":
      return a.invoiceDate.localeCompare(b.invoiceDate);
    case "vendor":
      return a.vendor.localeCompare(b.vendor, "fr", { sensitivity: "base" });
    case "category":
      return SPEND_DASHBOARD_CATEGORY_LABELS[a.category].localeCompare(
        SPEND_DASHBOARD_CATEGORY_LABELS[b.category],
        "fr",
        { sensitivity: "base" },
      );
    case "amount":
      return a.amountTtcCents - b.amountTtcCents;
  }
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  align = "left",
  onSort,
}: {
  label: string;
  sortKey: InvoiceSortKey;
  activeKey: InvoiceSortKey;
  direction: SortDirection;
  align?: "left" | "right";
  onSort: (key: InvoiceSortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <th
      className={cn("px-2 py-2 font-medium", align === "right" && "text-right")}
      aria-sort={
        isActive ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          align === "right" && "flex-row-reverse",
        )}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
    </th>
  );
}

function VendorShareRow({
  entry,
  totalCents,
  currency,
}: {
  entry: DashboardVendorTotal;
  totalCents: number;
  currency: string;
}) {
  const sharePercent = shareOfTotal(entry.totalCents, totalCents);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate">{entry.vendor}</span>
        <span className="shrink-0 tabular-nums">
          <span className="font-medium">
            {formatInvoiceMoney(entry.totalCents, currency)}
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
}

export function DashboardOverview({
  summary,
  invoicesEditable = false,
  isCreating = false,
  onCreatingChange,
  className,
}: DashboardOverviewProps) {
  const [sortKey, setSortKey] = useState<InvoiceSortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedVendorsPeriodLabel, setExpandedVendorsPeriodLabel] = useState<
    string | null
  >(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(
    null,
  );

  const dialogOpen = invoicesEditable && (isCreating || editingInvoice != null);

  const totalCents = summary.totalTtcCents;
  const evolutionPositive =
    summary.evolutionPercent != null && summary.evolutionPercent > 0;
  const evolutionNegative =
    summary.evolutionPercent != null && summary.evolutionPercent < 0;

  const showAllVendors = expandedVendorsPeriodLabel === summary.periodLabel;
  const hiddenVendorCount = Math.max(
    0,
    summary.topVendors.length - TOP_VENDORS_PREVIEW,
  );
  const visibleVendors = showAllVendors
    ? summary.topVendors
    : summary.topVendors.slice(0, TOP_VENDORS_PREVIEW);

  const sortedInvoices = useMemo(() => {
    const invoices = [...summary.invoices];
    invoices.sort((a, b) => {
      const result = compareInvoices(a, b, sortKey);
      return sortDirection === "asc" ? result : -result;
    });
    return invoices;
  }, [sortDirection, sortKey, summary.invoices]);

  function handleSort(nextKey: InvoiceSortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(
      nextKey === "date" || nextKey === "amount" ? "desc" : "asc",
    );
  }

  function closeDialog() {
    setEditingInvoice(null);
    onCreatingChange?.(false);
  }

  return (
    <>
      <div className={cn("flex flex-col gap-6", className)}>
        <section aria-labelledby="dashboard-total-heading">
          <Card size="sm">
            <CardHeader>
              <h3 id="dashboard-total-heading" className={cardHeadingClassName}>
                Total TTC
              </h3>
              <p className="text-xl font-medium tabular-nums">
                {formatInvoiceMoney(summary.totalTtcCents, summary.currency)}
              </p>
              {summary.evolutionPercent != null && summary.evolutionLabel ? (
                <p
                  className={cn(
                    "text-sm",
                    evolutionPositive &&
                      "text-emerald-700 dark:text-emerald-400",
                    evolutionNegative && "text-destructive",
                    !evolutionPositive &&
                      !evolutionNegative &&
                      "text-muted-foreground",
                  )}
                >
                  {formatEvolution(summary.evolutionPercent)}{" "}
                  {summary.evolutionLabel}
                </p>
              ) : null}
            </CardHeader>
          </Card>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="dashboard-categories-heading">
            <Card>
              <CardHeader>
                <h3
                  id="dashboard-categories-heading"
                  className={cardHeadingClassName}
                >
                  Par catégorie
                </h3>
                <CardDescription>Part du total des dépenses</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {summary.byCategory.map((entry) => {
                  const sharePercent = shareOfTotal(
                    entry.totalCents,
                    totalCents,
                  );
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
          </section>

          <section aria-labelledby="dashboard-vendors-heading">
            <Card>
              <CardHeader>
                <h3
                  id="dashboard-vendors-heading"
                  className={cardHeadingClassName}
                >
                  Top fournisseurs
                </h3>
                <CardDescription>Part du total des dépenses</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {visibleVendors.map((entry) => (
                  <VendorShareRow
                    key={entry.vendor}
                    entry={entry}
                    totalCents={totalCents}
                    currency={summary.currency}
                  />
                ))}
                {hiddenVendorCount > 0 ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto self-start px-0"
                    onClick={() =>
                      setExpandedVendorsPeriodLabel(
                        showAllVendors ? null : summary.periodLabel,
                      )
                    }
                  >
                    {showAllVendors
                      ? "Réduire la liste"
                      : `Voir les ${hiddenVendorCount} autres`}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </section>
        </div>

        <section aria-labelledby="dashboard-invoices-heading">
          <Card>
            <CardHeader>
              <h3
                id="dashboard-invoices-heading"
                className={cardHeadingClassName}
              >
                Factures
              </h3>
              <CardDescription>
                Récapitulatif des factures de la période
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Nombre de factures
                  </p>
                  <p className="text-sm font-medium tabular-nums">
                    {summary.invoiceCount.toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Montant moyen TTC
                  </p>
                  <p className="text-sm font-medium tabular-nums">
                    {summary.averageTtcCents == null
                      ? "—"
                      : formatInvoiceMoney(
                          summary.averageTtcCents,
                          summary.currency,
                        )}
                  </p>
                </div>
              </div>

              {summary.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune facture pour cette période.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <SortableHeader
                          label="Date"
                          sortKey="date"
                          activeKey={sortKey}
                          direction={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Fournisseur"
                          sortKey="vendor"
                          activeKey={sortKey}
                          direction={sortDirection}
                          onSort={handleSort}
                        />
                        <th className="px-2 py-2 font-medium text-muted-foreground">
                          N°
                        </th>
                        <SortableHeader
                          label="Catégorie"
                          sortKey="category"
                          activeKey={sortKey}
                          direction={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="TTC"
                          sortKey="amount"
                          activeKey={sortKey}
                          direction={sortDirection}
                          align="right"
                          onSort={handleSort}
                        />
                        {invoicesEditable ? (
                          <th
                            scope="col"
                            className="px-2 py-2 text-right font-medium text-muted-foreground"
                          >
                            Actions
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-2 py-2 whitespace-nowrap tabular-nums">
                            {formatInvoiceDate(invoice.invoiceDate)}
                          </td>
                          <td className="px-2 py-2">{invoice.vendor}</td>
                          <td className="px-2 py-2 text-muted-foreground">
                            {invoice.invoiceNumber ?? "—"}
                          </td>
                          <td className="px-2 py-2">
                            {SPEND_DASHBOARD_CATEGORY_LABELS[invoice.category]}
                          </td>
                          <td className="px-2 py-2 text-right font-medium tabular-nums">
                            {formatInvoiceMoney(
                              invoice.amountTtcCents,
                              summary.currency,
                            )}
                          </td>
                          {invoicesEditable ? (
                            <td className="px-2 py-2 text-right">
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto px-0"
                                aria-label={`Modifier la facture ${invoice.vendor}`}
                                onClick={() => {
                                  onCreatingChange?.(false);
                                  setEditingInvoice(invoice);
                                }}
                              >
                                Modifier
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <InvoiceEditDialog
        key={editingInvoice?.id ?? "create"}
        mode={isCreating ? "create" : "edit"}
        invoice={editingInvoice}
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      />
    </>
  );
}
