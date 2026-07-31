import type { SpendDashboardInvoiceCategory } from "@/features/spend-dashboard/lib/spend-dashboard-config";
import { SPEND_DASHBOARD_DEFAULT_CURRENCY } from "@/features/spend-dashboard/lib/spend-dashboard-config";

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
  byCategory: DashboardCategoryTotal[];
  topVendors: DashboardVendorTotal[];
};

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  periodLabel: "Mars 2026",
  currency: SPEND_DASHBOARD_DEFAULT_CURRENCY,
  totalTtcCents: 184_750,
  evolutionPercent: 8.4,
  byCategory: [
    { category: "rent", totalCents: 72_000 },
    { category: "software", totalCents: 48_900 },
    { category: "transport", totalCents: 26_350 },
    { category: "meals", totalCents: 21_500 },
    { category: "office", totalCents: 11_000 },
    { category: "other", totalCents: 5_000 },
  ],
  topVendors: [
    { vendor: "Bail Commercial SA", totalCents: 72_000 },
    { vendor: "OVH SAS", totalCents: 29_400 },
    { vendor: "SNCF Connect", totalCents: 18_200 },
    { vendor: "Adobe", totalCents: 12_500 },
    { vendor: "Uber", totalCents: 8_150 },
  ],
};
