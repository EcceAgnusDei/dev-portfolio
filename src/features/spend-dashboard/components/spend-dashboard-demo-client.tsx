"use client";

import { DashboardOverview } from "@/features/spend-dashboard/components/dashboard-overview";
import { MOCK_DASHBOARD_SUMMARY } from "@/features/spend-dashboard/lib/dashboard-mock";

export function SpendDashboardDemoClient() {
  return <DashboardOverview summary={MOCK_DASHBOARD_SUMMARY} />;
}
