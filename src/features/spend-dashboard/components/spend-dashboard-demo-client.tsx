"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { DashboardOverview } from "@/features/spend-dashboard/components/dashboard-overview";
import { buildDashboardSummary } from "@/features/spend-dashboard/lib/build-dashboard-summary";
import {
  currentMonthKey,
  DASHBOARD_SEED_DEFAULT_MONTH,
  DASHBOARD_SEED_INVOICES,
  formatMonthOnlyLabel,
  formatQuarterOnlyLabel,
  listDashboardSeedMonths,
  listMonthsFromInvoices,
  listQuartersFromMonthKeys,
  listYearsFromMonthKeys,
  monthKeyToPeriod,
  monthKeyToQuarterKey,
  monthKeysForYear,
  quarterKeyToPeriod,
  quarterKeysForYear,
  resolveMonthForYear,
  resolveQuarterForYear,
  yearKeyToPeriod,
} from "@/features/spend-dashboard/lib/dashboard-seed";
import {
  getInvoicesStoreServerSnapshot,
  getInvoicesStoreSnapshot,
  replaceInvoices,
  subscribeInvoicesStore,
} from "@/features/spend-dashboard/lib/invoice-store";

type DashboardDataSource = "local" | "seed";
type PeriodGrain = "month" | "quarter" | "year";

const selectClassName =
  "h-8 rounded-md border border-border bg-background px-2 text-sm";

export function SpendDashboardDemoClient() {
  const [dataSource, setDataSource] = useState<DashboardDataSource>("local");
  const [periodGrain, setPeriodGrain] = useState<PeriodGrain>("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedQuarter, setSelectedQuarter] = useState(() =>
    monthKeyToQuarterKey(currentMonthKey()),
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    currentMonthKey().slice(0, 4),
  );
  const [isCreating, setIsCreating] = useState(false);
  const localInvoices = useSyncExternalStore(
    subscribeInvoicesStore,
    getInvoicesStoreSnapshot,
    getInvoicesStoreServerSnapshot,
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    replaceInvoices(DASHBOARD_SEED_INVOICES);
  }, []);

  const allMonthOptions = useMemo(() => {
    if (dataSource === "seed") return listDashboardSeedMonths();
    return listMonthsFromInvoices(localInvoices);
  }, [dataSource, localInvoices]);

  const allQuarterOptions = useMemo(
    () => listQuartersFromMonthKeys(allMonthOptions),
    [allMonthOptions],
  );

  const yearOptions = useMemo(
    () => listYearsFromMonthKeys(allMonthOptions),
    [allMonthOptions],
  );

  const activeMonth = allMonthOptions.includes(selectedMonth)
    ? selectedMonth
    : dataSource === "seed"
      ? DASHBOARD_SEED_DEFAULT_MONTH
      : (allMonthOptions[allMonthOptions.length - 1] ?? currentMonthKey());

  const fallbackQuarter =
    dataSource === "seed"
      ? monthKeyToQuarterKey(DASHBOARD_SEED_DEFAULT_MONTH)
      : (allQuarterOptions[allQuarterOptions.length - 1] ??
        monthKeyToQuarterKey(currentMonthKey()));

  const activeQuarter = allQuarterOptions.includes(selectedQuarter)
    ? selectedQuarter
    : fallbackQuarter;

  const fallbackYear =
    dataSource === "seed"
      ? DASHBOARD_SEED_DEFAULT_MONTH.slice(0, 4)
      : (yearOptions[yearOptions.length - 1] ?? currentMonthKey().slice(0, 4));

  const resolvedYear = yearOptions.includes(selectedYear)
    ? selectedYear
    : fallbackYear;

  const activeYear =
    periodGrain === "month"
      ? activeMonth.slice(0, 4)
      : periodGrain === "quarter"
        ? activeQuarter.slice(0, 4)
        : resolvedYear;

  const monthOptions = monthKeysForYear(allMonthOptions, activeYear);
  const quarterOptions = quarterKeysForYear(allQuarterOptions, activeYear);

  const activeMonthIndex = allMonthOptions.indexOf(activeMonth);
  const activeQuarterIndex = allQuarterOptions.indexOf(activeQuarter);
  const activeYearIndex = yearOptions.indexOf(activeYear);

  const canGoPrevious =
    periodGrain === "month"
      ? activeMonthIndex > 0
      : periodGrain === "quarter"
        ? activeQuarterIndex > 0
        : activeYearIndex > 0;

  const canGoNext =
    periodGrain === "month"
      ? activeMonthIndex >= 0 && activeMonthIndex < allMonthOptions.length - 1
      : periodGrain === "quarter"
        ? activeQuarterIndex >= 0 &&
          activeQuarterIndex < allQuarterOptions.length - 1
        : activeYearIndex >= 0 && activeYearIndex < yearOptions.length - 1;

  const summary = useMemo(() => {
    const invoices =
      dataSource === "seed" ? DASHBOARD_SEED_INVOICES : localInvoices;
    const period =
      periodGrain === "month"
        ? monthKeyToPeriod(activeMonth)
        : periodGrain === "quarter"
          ? quarterKeyToPeriod(activeQuarter)
          : yearKeyToPeriod(activeYear);
    return buildDashboardSummary(invoices, period);
  }, [
    activeMonth,
    activeQuarter,
    activeYear,
    dataSource,
    localInvoices,
    periodGrain,
  ]);

  function syncSelectionsForYear(year: string) {
    setSelectedYear(year);
    setSelectedMonth(resolveMonthForYear(allMonthOptions, year, activeMonth));
    setSelectedQuarter(
      resolveQuarterForYear(allQuarterOptions, year, activeQuarter),
    );
  }

  function handleDataSourceChange(next: DashboardDataSource) {
    setDataSource(next);
    setIsCreating(false);
    if (next === "seed") {
      setSelectedMonth(DASHBOARD_SEED_DEFAULT_MONTH);
      setSelectedQuarter(monthKeyToQuarterKey(DASHBOARD_SEED_DEFAULT_MONTH));
      setSelectedYear(DASHBOARD_SEED_DEFAULT_MONTH.slice(0, 4));
      return;
    }
    const month = currentMonthKey();
    setSelectedMonth(month);
    setSelectedQuarter(monthKeyToQuarterKey(month));
    setSelectedYear(month.slice(0, 4));
  }

  function handlePeriodGrainChange(next: PeriodGrain) {
    setPeriodGrain(next);
    if (next === "year") {
      setSelectedYear(activeYear);
      return;
    }
    if (next === "quarter") {
      setSelectedQuarter(
        resolveQuarterForYear(allQuarterOptions, activeYear, activeQuarter),
      );
      return;
    }
    setSelectedMonth(
      resolveMonthForYear(allMonthOptions, activeYear, activeMonth),
    );
  }

  function handleYearChange(year: string) {
    syncSelectionsForYear(year);
  }

  function goToAdjacentPeriod(delta: -1 | 1) {
    if (periodGrain === "month") {
      const nextMonth = allMonthOptions[activeMonthIndex + delta];
      if (!nextMonth) return;
      setSelectedMonth(nextMonth);
      setSelectedYear(nextMonth.slice(0, 4));
      return;
    }
    if (periodGrain === "quarter") {
      const nextQuarter = allQuarterOptions[activeQuarterIndex + delta];
      if (!nextQuarter) return;
      setSelectedQuarter(nextQuarter);
      setSelectedYear(nextQuarter.slice(0, 4));
      return;
    }
    const nextYear = yearOptions[activeYearIndex + delta];
    if (!nextYear) return;
    syncSelectionsForYear(nextYear);
  }

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="dashboard-summary-heading"
    >
      <header className="flex items-start justify-between gap-3">
        <h2
          id="dashboard-summary-heading"
          className="font-heading text-lg font-medium leading-snug"
        >
          Synthèse des dépenses
        </h2>
        {dataSource === "local" ? (
          <Button
            type="button"
            className="shrink-0"
            onClick={() => setIsCreating(true)}
          >
            Ajouter une facture
          </Button>
        ) : null}
      </header>

      <section
        className="flex flex-wrap items-end gap-3"
        aria-label="Filtres du dashboard"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={dataSource === "local" ? "default" : "outline"}
            onClick={() => handleDataSourceChange("local")}
          >
            Mes factures
          </Button>
          <Button
            type="button"
            variant={dataSource === "seed" ? "default" : "outline"}
            onClick={() => handleDataSourceChange("seed")}
          >
            Données de démo
          </Button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Période</span>
          <select
            className={`${selectClassName} min-w-28`}
            value={periodGrain}
            aria-label="Granularité de période"
            onChange={(event) =>
              handlePeriodGrainChange(event.target.value as PeriodGrain)
            }
          >
            <option value="month">Mois</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Année</option>
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Année</span>
          <div className="flex items-center gap-1">
            {periodGrain === "year" ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Année précédente"
                disabled={!canGoPrevious}
                onClick={() => goToAdjacentPeriod(-1)}
              >
                <ChevronLeft />
              </Button>
            ) : null}
            <select
              className={`${selectClassName} min-w-24`}
              value={activeYear}
              aria-label="Année à afficher"
              onChange={(event) => handleYearChange(event.target.value)}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {periodGrain === "year" ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Année suivante"
                disabled={!canGoNext}
                onClick={() => goToAdjacentPeriod(1)}
              >
                <ChevronRight />
              </Button>
            ) : null}
          </div>
        </div>

        {periodGrain === "month" ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Mois</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Mois précédent"
                disabled={!canGoPrevious}
                onClick={() => goToAdjacentPeriod(-1)}
              >
                <ChevronLeft />
              </Button>
              <select
                className={`${selectClassName} min-w-36`}
                value={activeMonth}
                aria-label="Mois à afficher"
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setSelectedYear(event.target.value.slice(0, 4));
                }}
              >
                {monthOptions.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {formatMonthOnlyLabel(monthKey)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Mois suivant"
                disabled={!canGoNext}
                onClick={() => goToAdjacentPeriod(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : null}

        {periodGrain === "quarter" ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Trimestre</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Trimestre précédent"
                disabled={!canGoPrevious}
                onClick={() => goToAdjacentPeriod(-1)}
              >
                <ChevronLeft />
              </Button>
              <select
                className={`${selectClassName} min-w-24`}
                value={activeQuarter}
                aria-label="Trimestre à afficher"
                onChange={(event) => {
                  setSelectedQuarter(event.target.value);
                  setSelectedYear(event.target.value.slice(0, 4));
                }}
              >
                {quarterOptions.map((quarterKey) => (
                  <option key={quarterKey} value={quarterKey}>
                    {formatQuarterOnlyLabel(quarterKey)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Trimestre suivant"
                disabled={!canGoNext}
                onClick={() => goToAdjacentPeriod(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {dataSource === "local" && localInvoices.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aucune facture dans le stockage local. Affichez les données de démo
          ou enregistrez une extraction.
        </p>
      ) : null}

      {dataSource === "seed" ? (
        <p className="text-xs text-muted-foreground">
          Affichage des données de démo (le stockage local n’est pas modifié).
        </p>
      ) : null}

      <DashboardOverview
        summary={summary}
        invoicesEditable={dataSource === "local"}
        isCreating={isCreating}
        onCreatingChange={setIsCreating}
      />
    </section>
  );
}
