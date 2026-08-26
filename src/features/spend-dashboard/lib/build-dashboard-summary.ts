import type { InvoiceRecord } from "@/features/spend-dashboard/lib/invoice-store";
import {
  SPEND_DASHBOARD_DEFAULT_CURRENCY,
  SPEND_DASHBOARD_INVOICE_CATEGORIES,
  type SpendDashboardInvoiceCategory,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";

export type DashboardCategoryTotal = {
  category: SpendDashboardInvoiceCategory;
  totalCents: number;
};

export type DashboardVendorTotal = {
  vendor: string;
  totalCents: number;
};

export type DashboardSummary = {
  periodLabel: string;
  currency: string;
  totalTtcCents: number;
  evolutionPercent: number | null;
  evolutionLabel: string | null;
  invoiceCount: number;
  averageTtcCents: number | null;
  byCategory: DashboardCategoryTotal[];
  topVendors: DashboardVendorTotal[];
  invoices: InvoiceRecord[];
};

export type DashboardPeriod = {
  from: string;
  to: string;
};

export function calendarMonthPeriod(
  year: number,
  month: number,
): DashboardPeriod {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return {
    from: formatUtcDate(from),
    to: formatUtcDate(to),
  };
}

export function calendarQuarterPeriod(
  year: number,
  quarter: number,
): DashboardPeriod {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const from = new Date(Date.UTC(year, startMonth - 1, 1));
  const to = new Date(Date.UTC(year, endMonth, 0));
  return {
    from: formatUtcDate(from),
    to: formatUtcDate(to),
  };
}

export function calendarYearPeriod(year: number): DashboardPeriod {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 12, 0));
  return {
    from: formatUtcDate(from),
    to: formatUtcDate(to),
  };
}

const MONTH_BASELINE_LOOKBACK = 12;
const QUARTER_BASELINE_LOOKBACK = 4;
const YEAR_BASELINE_LOOKBACK = 1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseUtcDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function isDateInPeriod(isoDate: string, period: DashboardPeriod): boolean {
  return isoDate >= period.from && isoDate <= period.to;
}

function isCalendarMonthPeriod(period: DashboardPeriod): boolean {
  const from = parseUtcDate(period.from);
  const to = parseUtcDate(period.to);
  return (
    from.getUTCDate() === 1 &&
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth() &&
    to.getUTCDate() ===
      daysInUtcMonth(from.getUTCFullYear(), from.getUTCMonth())
  );
}

function isCalendarQuarterPeriod(period: DashboardPeriod): boolean {
  const from = parseUtcDate(period.from);
  const to = parseUtcDate(period.to);
  if (from.getUTCDate() !== 1) return false;
  if (from.getUTCFullYear() !== to.getUTCFullYear()) return false;
  const startMonth = from.getUTCMonth();
  if (startMonth % 3 !== 0) return false;
  if (to.getUTCMonth() !== startMonth + 2) return false;
  return (
    to.getUTCDate() === daysInUtcMonth(to.getUTCFullYear(), to.getUTCMonth())
  );
}

function isCalendarYearPeriod(period: DashboardPeriod): boolean {
  const from = parseUtcDate(period.from);
  const to = parseUtcDate(period.to);
  return (
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === 0 &&
    from.getUTCDate() === 1 &&
    to.getUTCMonth() === 11 &&
    to.getUTCDate() === 31
  );
}

export function getPreviousPeriod(period: DashboardPeriod): DashboardPeriod {
  const from = parseUtcDate(period.from);
  const to = parseUtcDate(period.to);

  if (isCalendarMonthPeriod(period)) {
    const year = from.getUTCFullYear();
    const month = from.getUTCMonth() + 1;
    if (month === 1) return calendarMonthPeriod(year - 1, 12);
    return calendarMonthPeriod(year, month - 1);
  }

  if (isCalendarQuarterPeriod(period)) {
    const year = from.getUTCFullYear();
    const quarter = Math.floor(from.getUTCMonth() / 3) + 1;
    if (quarter === 1) return calendarQuarterPeriod(year - 1, 4);
    return calendarQuarterPeriod(year, quarter - 1);
  }

  if (isCalendarYearPeriod(period)) {
    return calendarYearPeriod(from.getUTCFullYear() - 1);
  }

  const durationMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - MS_PER_DAY);
  const previousFrom = new Date(previousTo.getTime() - durationMs);
  return {
    from: formatUtcDate(previousFrom),
    to: formatUtcDate(previousTo),
  };
}

function formatQuarterLabel(year: number, quarter: number): string {
  const prefix = quarter === 1 ? "1er" : `${quarter}e`;
  return `${prefix} trimestre ${year}`;
}

export function formatDashboardPeriodLabel(period: DashboardPeriod): string {
  const from = parseUtcDate(period.from);
  const to = parseUtcDate(period.to);

  if (isCalendarMonthPeriod(period)) {
    const label = new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(from);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  if (isCalendarQuarterPeriod(period)) {
    const quarter = Math.floor(from.getUTCMonth() / 3) + 1;
    return formatQuarterLabel(from.getUTCFullYear(), quarter);
  }

  if (isCalendarYearPeriod(period)) {
    return String(from.getUTCFullYear());
  }

  const formatDay = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatDay.format(from)} – ${formatDay.format(to)}`;
}

function sumTtc(invoices: readonly InvoiceRecord[]): number {
  return invoices.reduce((sum, invoice) => sum + invoice.amountTtcCents, 0);
}

function filterInvoices(
  invoices: readonly InvoiceRecord[],
  period: DashboardPeriod,
): InvoiceRecord[] {
  return invoices.filter((invoice) =>
    isDateInPeriod(invoice.invoiceDate, period),
  );
}

function buildCategoryTotals(
  invoices: readonly InvoiceRecord[],
): DashboardCategoryTotal[] {
  const totals = new Map<SpendDashboardInvoiceCategory, number>();
  for (const category of SPEND_DASHBOARD_INVOICE_CATEGORIES) {
    totals.set(category, 0);
  }
  for (const invoice of invoices) {
    totals.set(
      invoice.category,
      (totals.get(invoice.category) ?? 0) + invoice.amountTtcCents,
    );
  }
  return SPEND_DASHBOARD_INVOICE_CATEGORIES.map((category) => ({
    category,
    totalCents: totals.get(category) ?? 0,
  }))
    .filter((entry) => entry.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents);
}

function buildTopVendors(
  invoices: readonly InvoiceRecord[],
): DashboardVendorTotal[] {
  const totals = new Map<string, { vendor: string; totalCents: number }>();
  for (const invoice of invoices) {
    const key = invoice.vendor.trim().toLowerCase();
    const existing = totals.get(key);
    if (existing) {
      existing.totalCents += invoice.amountTtcCents;
    } else {
      totals.set(key, {
        vendor: invoice.vendor.trim(),
        totalCents: invoice.amountTtcCents,
      });
    }
  }

  return Array.from(totals.values()).sort(
    (a, b) => b.totalCents - a.totalCents,
  );
}

function computeEvolutionPercent(
  currentTotal: number,
  baselineTotal: number,
): number | null {
  if (baselineTotal === 0) return null;
  const raw = ((currentTotal - baselineTotal) / baselineTotal) * 100;
  return Math.round(raw * 10) / 10;
}

function earliestInvoiceDate(
  invoices: readonly InvoiceRecord[],
): string | null {
  if (invoices.length === 0) return null;
  let earliest = invoices[0]!.invoiceDate;
  for (const invoice of invoices) {
    if (invoice.invoiceDate < earliest) earliest = invoice.invoiceDate;
  }
  return earliest;
}

function baselineLookbackLimit(period: DashboardPeriod): number {
  if (isCalendarMonthPeriod(period)) return MONTH_BASELINE_LOOKBACK;
  if (isCalendarQuarterPeriod(period)) return QUARTER_BASELINE_LOOKBACK;
  if (isCalendarYearPeriod(period)) return YEAR_BASELINE_LOOKBACK;
  return 0;
}

function listBaselinePeriods(
  period: DashboardPeriod,
  earliestDate: string,
): DashboardPeriod[] {
  const limit = baselineLookbackLimit(period);
  if (limit === 0) return [];

  const periods: DashboardPeriod[] = [];
  let cursor = getPreviousPeriod(period);

  for (let index = 0; index < limit; index += 1) {
    if (cursor.to < earliestDate) break;
    periods.push(cursor);
    cursor = getPreviousPeriod(cursor);
  }

  return periods;
}

function formatEvolutionComparisonLabel(
  period: DashboardPeriod,
  baselineCount: number,
): string {
  if (isCalendarMonthPeriod(period)) {
    if (baselineCount === 1) return "vs mois précédent";
    if (baselineCount === MONTH_BASELINE_LOOKBACK) {
      return "vs moyenne des 12 derniers mois";
    }
    return `vs moyenne des ${baselineCount} derniers mois`;
  }

  if (isCalendarQuarterPeriod(period)) {
    if (baselineCount === 1) return "vs trimestre précédent";
    if (baselineCount === QUARTER_BASELINE_LOOKBACK) {
      return "vs moyenne des 4 derniers trimestres";
    }
    return `vs moyenne des ${baselineCount} derniers trimestres`;
  }

  if (isCalendarYearPeriod(period)) {
    if (baselineCount === 1) return "vs année précédente";
    return `vs moyenne des ${baselineCount} années précédentes`;
  }

  return "vs période précédente";
}

function buildEvolutionComparison(
  invoices: readonly InvoiceRecord[],
  period: DashboardPeriod,
  currentTotalCents: number,
): { percent: number | null; label: string | null } {
  const earliestDate = earliestInvoiceDate(invoices);
  if (!earliestDate) {
    return { percent: null, label: null };
  }

  const baselinePeriods = listBaselinePeriods(period, earliestDate);
  if (baselinePeriods.length === 0) {
    return { percent: null, label: null };
  }

  const baselineTotalCents = baselinePeriods.reduce(
    (sum, baselinePeriod) =>
      sum + sumTtc(filterInvoices(invoices, baselinePeriod)),
    0,
  );
  const baselineAverageCents = baselineTotalCents / baselinePeriods.length;
  const percent = computeEvolutionPercent(
    currentTotalCents,
    baselineAverageCents,
  );

  if (percent == null) {
    return { percent: null, label: null };
  }

  return {
    percent,
    label: formatEvolutionComparisonLabel(period, baselinePeriods.length),
  };
}

export function buildDashboardSummary(
  invoices: readonly InvoiceRecord[],
  period: DashboardPeriod,
): DashboardSummary {
  const currentInvoices = filterInvoices(invoices, period).sort((a, b) =>
    b.invoiceDate.localeCompare(a.invoiceDate),
  );
  const totalTtcCents = sumTtc(currentInvoices);
  const invoiceCount = currentInvoices.length;
  const evolution = buildEvolutionComparison(
    invoices,
    period,
    totalTtcCents,
  );

  return {
    periodLabel: formatDashboardPeriodLabel(period),
    currency: SPEND_DASHBOARD_DEFAULT_CURRENCY,
    totalTtcCents,
    evolutionPercent: evolution.percent,
    evolutionLabel: evolution.label,
    invoiceCount,
    averageTtcCents:
      invoiceCount > 0 ? Math.round(totalTtcCents / invoiceCount) : null,
    byCategory: buildCategoryTotals(currentInvoices),
    topVendors: buildTopVendors(currentInvoices),
    invoices: currentInvoices,
  };
}
