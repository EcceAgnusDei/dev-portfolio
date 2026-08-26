import {
  calendarMonthPeriod,
  calendarQuarterPeriod,
  calendarYearPeriod,
  type DashboardPeriod,
} from "@/features/spend-dashboard/lib/build-dashboard-summary";
import type { InvoiceRecord } from "@/features/spend-dashboard/lib/invoice-store";
import {
  SPEND_DASHBOARD_DEFAULT_CURRENCY,
  type SpendDashboardInvoiceCategory,
} from "@/features/spend-dashboard/lib/spend-dashboard-config";

export const DASHBOARD_SEED_DEFAULT_MONTH = "2026-03";

type SeedLine = {
  day: number;
  vendor: string;
  category: SpendDashboardInvoiceCategory;
  ttcCents: number;
  invoiceNumber?: string | null;
  confidence?: InvoiceRecord["confidence"];
  sourceFileName?: string;
};

function splitTtc(ttcCents: number): {
  amountHtCents: number;
  amountTvaCents: number;
  amountTtcCents: number;
} {
  const amountHtCents = Math.round(ttcCents / 1.2);
  return {
    amountHtCents,
    amountTvaCents: ttcCents - amountHtCents,
    amountTtcCents: ttcCents,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function buildInvoice(
  year: number,
  month: number,
  index: number,
  line: SeedLine,
): InvoiceRecord {
  const date = `${year}-${pad2(month)}-${pad2(line.day)}`;
  return {
    id: `seed-${year}-${pad2(month)}-${index}`,
    createdAt: `${date}T10:00:00.000Z`,
    vendor: line.vendor,
    invoiceDate: date,
    invoiceNumber: line.invoiceNumber ?? null,
    currency: SPEND_DASHBOARD_DEFAULT_CURRENCY,
    ...splitTtc(line.ttcCents),
    category: line.category,
    confidence: line.confidence ?? "high",
    ...(line.sourceFileName
      ? { sourceFileName: line.sourceFileName }
      : {}),
  };
}

function monthLines(year: number, month: number): SeedLine[] {
  const rent: SeedLine = {
    day: 1,
    vendor: "Bail Commercial SA",
    category: "rent",
    ttcCents: 72_000,
    invoiceNumber: `BAIL-${year}-${pad2(month)}`,
  };

  const hostingTtc = 22_000 + month * 400 + (year - 2024) * 1_200;
  const hosting: SeedLine = {
    day: 5 + (month % 3),
    vendor: "OVH SAS",
    category: "software",
    ttcCents: hostingTtc,
    invoiceNumber: `OVH-${year}-${pad2(month)}`,
  };

  const extrasByMonth: Record<number, SeedLine[]> = {
    1: [
      {
        day: 20,
        vendor: "Le Comptoir",
        category: "meals",
        ttcCents: 11_500 + (year - 2024) * 800,
        confidence: "medium",
      },
    ],
    2: [
      {
        day: 15,
        vendor: "SNCF Connect",
        category: "transport",
        ttcCents: 14_400,
        confidence: "medium",
      },
      {
        day: 22,
        vendor: "Bureau Vallée",
        category: "office",
        ttcCents: 7_000,
        invoiceNumber: `BV-${year}02`,
      },
    ],
    3: [
      {
        day: 1,
        vendor: "Adobe",
        category: "software",
        ttcCents: 12_500,
        invoiceNumber: `ADOBE-${year}-8841`,
      },
      {
        day: 10,
        vendor: "OVH SAS",
        category: "software",
        ttcCents: 4_500,
        invoiceNumber: `OVH-${year}-03B`,
      },
      {
        day: 12,
        vendor: "SNCF Connect",
        category: "transport",
        ttcCents: 18_200,
        confidence: "medium",
      },
      {
        day: 14,
        vendor: "Uber",
        category: "transport",
        ttcCents: 8_150,
        confidence: "medium",
      },
      {
        day: 15,
        vendor: "Le Comptoir",
        category: "meals",
        ttcCents: 21_500,
        confidence: "low",
      },
      {
        day: 18,
        vendor: "Bureau Vallée",
        category: "office",
        ttcCents: 11_000,
        invoiceNumber: `BV-${year}03`,
      },
      {
        day: 20,
        vendor: "Assurance Pro",
        category: "other",
        ttcCents: 5_000,
        invoiceNumber: `ASS-${year}-440`,
      },
      ...(year === 2026
        ? [
            {
              day: 22,
              vendor: "OVH SAS",
              category: "software" as const,
              ttcCents: 7_000,
              invoiceNumber: `OVH-${year}-03C`,
            },
          ]
        : []),
    ],
    4: [
      {
        day: 5,
        vendor: "Adobe",
        category: "software",
        ttcCents: 12_500,
        invoiceNumber: `ADOBE-${year}-9012`,
      },
      {
        day: 16,
        vendor: "SNCF Connect",
        category: "transport",
        ttcCents: 10_500,
        confidence: "medium",
      },
      {
        day: 22,
        vendor: "Le Comptoir",
        category: "meals",
        ttcCents: 15_500,
        confidence: "medium",
      },
    ],
    5: [
      {
        day: 8,
        vendor: "SNCF Connect",
        category: "transport",
        ttcCents: 16_800,
        confidence: "medium",
      },
      {
        day: 19,
        vendor: "Bureau Vallée",
        category: "office",
        ttcCents: 9_200,
        invoiceNumber: `BV-${year}05`,
      },
    ],
    6: [
      {
        day: 3,
        vendor: "Adobe",
        category: "software",
        ttcCents: 12_500,
        invoiceNumber: `ADOBE-${year}-06`,
      },
      {
        day: 12,
        vendor: "Le Comptoir",
        category: "meals",
        ttcCents: 13_800,
        confidence: "medium",
      },
      {
        day: 27,
        vendor: "Uber",
        category: "transport",
        ttcCents: 6_400,
        confidence: "medium",
      },
    ],
    7: [
      {
        day: 9,
        vendor: "SNCF Connect",
        category: "transport",
        ttcCents: 22_100,
        confidence: "medium",
      },
      {
        day: 21,
        vendor: "Le Comptoir",
        category: "meals",
        ttcCents: 19_200,
        confidence: "low",
      },
    ],
    8: [
      {
        day: 14,
        vendor: "Bureau Vallée",
        category: "office",
        ttcCents: 5_600,
        invoiceNumber: `BV-${year}08`,
      },
    ],
    9: [
      {
        day: 2,
        vendor: "Adobe",
        category: "software",
        ttcCents: 12_500,
        invoiceNumber: `ADOBE-${year}-09`,
      },
      {
        day: 11,
        vendor: "SNCF Connect",
        category: "transport",
        ttcCents: 17_400,
        confidence: "medium",
      },
      {
        day: 25,
        vendor: "Assurance Pro",
        category: "other",
        ttcCents: 5_000,
        invoiceNumber: `ASS-${year}-920`,
      },
    ],
    10: [
      {
        day: 7,
        vendor: "Le Comptoir",
        category: "meals",
        ttcCents: 14_100,
        confidence: "medium",
      },
      {
        day: 18,
        vendor: "Uber",
        category: "transport",
        ttcCents: 9_300,
        confidence: "medium",
      },
    ],
    11: [
      {
        day: 4,
        vendor: "Adobe",
        category: "software",
        ttcCents: 12_500,
        invoiceNumber: `ADOBE-${year}-11`,
      },
      {
        day: 15,
        vendor: "Bureau Vallée",
        category: "office",
        ttcCents: 12_800,
        invoiceNumber: `BV-${year}11`,
      },
      {
        day: 28,
        vendor: "Le Comptoir",
        category: "meals",
        ttcCents: 16_400,
        confidence: "medium",
      },
    ],
    12: [
      {
        day: 6,
        vendor: "SNCF Connect",
        category: "transport",
        ttcCents: 24_600,
        confidence: "medium",
      },
      {
        day: 12,
        vendor: "Assurance Pro",
        category: "other",
        ttcCents: 5_000,
        invoiceNumber: `ASS-${year}-1200`,
      },
      {
        day: 20,
        vendor: "Le Comptoir",
        category: "meals",
        ttcCents: 28_900,
        confidence: "low",
      },
    ],
  };

  const lines = [rent, hosting, ...(extrasByMonth[month] ?? [])];
  if (year === 2026 && month === 3) {
    lines[0] = { ...rent, sourceFileName: "bail-mars.pdf" };
  }
  return [...lines, ...smallVendorLines(year, month)];
}

const SMALL_VENDORS: ReadonlyArray<{
  vendor: string;
  category: SpendDashboardInvoiceCategory;
  ttcCents: number;
}> = [
  { vendor: "Fnac Pro", category: "office", ttcCents: 2_450 },
  { vendor: "Cultura", category: "office", ttcCents: 1_890 },
  { vendor: "Decathlon", category: "other", ttcCents: 2_100 },
  { vendor: "Starbucks", category: "meals", ttcCents: 1_240 },
  { vendor: "Deliveroo", category: "meals", ttcCents: 2_780 },
  { vendor: "Bolt", category: "transport", ttcCents: 1_650 },
  { vendor: "Free Mobile", category: "other", ttcCents: 2_990 },
  { vendor: "La Poste", category: "office", ttcCents: 1_120 },
  { vendor: "Amazon Business", category: "office", ttcCents: 2_680 },
  { vendor: "Notion Labs", category: "software", ttcCents: 1_800 },
  { vendor: "Canva", category: "software", ttcCents: 1_440 },
  { vendor: "Figma", category: "software", ttcCents: 2_160 },
  { vendor: "GitHub", category: "software", ttcCents: 2_520 },
  { vendor: "Slack Technologies", category: "software", ttcCents: 2_880 },
  { vendor: "Zoom", category: "software", ttcCents: 1_920 },
  { vendor: "Monoprix", category: "office", ttcCents: 1_560 },
  { vendor: "Franprix", category: "meals", ttcCents: 980 },
  { vendor: "Total Energies", category: "transport", ttcCents: 2_340 },
  { vendor: "Parkings Indigo", category: "transport", ttcCents: 1_380 },
  { vendor: "Clean Services", category: "other", ttcCents: 2_700 },
  { vendor: "Flower Power", category: "other", ttcCents: 1_050 },
  { vendor: "Print Express", category: "office", ttcCents: 1_710 },
  { vendor: "Coffee Shop Pro", category: "meals", ttcCents: 2_050 },
  { vendor: "Taxi G7", category: "transport", ttcCents: 2_430 },
];

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

function smallVendorLines(year: number, month: number): SeedLine[] {
  const perMonth = 5;
  const offset = ((year - 2020) * 12 + (month - 1)) * perMonth;
  const lines: SeedLine[] = [];

  for (let i = 0; i < perMonth; i += 1) {
    const entry =
      SMALL_VENDORS[positiveModulo(offset + i, SMALL_VENDORS.length)]!;
    const day = Math.min(28, 16 + i * 2);
    lines.push({
      day,
      vendor: entry.vendor,
      category: entry.category,
      ttcCents: entry.ttcCents + ((year + month + i) % 5) * 40,
      invoiceNumber: `SMALL-${year}${pad2(month)}-${pad2(i + 1)}`,
      confidence: "medium",
    });
  }

  return lines;
}

function buildSeedInvoices(): InvoiceRecord[] {
  const invoices: InvoiceRecord[] = [];
  for (const year of [2020, 2021, 2022, 2023, 2024, 2025, 2026] as const) {
    for (let month = 1; month <= 12; month += 1) {
      monthLines(year, month).forEach((line, index) => {
        invoices.push(buildInvoice(year, month, index + 1, line));
      });
    }
  }
  return invoices;
}

export const DASHBOARD_SEED_INVOICES: InvoiceRecord[] = buildSeedInvoices();

function invoiceMonthKey(invoiceDate: string): string {
  return invoiceDate.slice(0, 7);
}

export function listDashboardSeedMonths(): string[] {
  const months = new Set(
    DASHBOARD_SEED_INVOICES.map((invoice) =>
      invoiceMonthKey(invoice.invoiceDate),
    ),
  );
  return Array.from(months).sort();
}

export function listYearsFromMonthKeys(monthKeys: readonly string[]): string[] {
  const years = new Set(
    monthKeys.map((monthKey) => monthKey.slice(0, 4)).filter(Boolean),
  );
  return Array.from(years).sort();
}

export function monthKeysForYear(
  monthKeys: readonly string[],
  year: string,
): string[] {
  const prefix = `${year}-`;
  return monthKeys.filter((monthKey) => monthKey.startsWith(prefix));
}

export function monthKeyToPeriod(monthKey: string): DashboardPeriod {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  return calendarMonthPeriod(year, month);
}

export function monthKeyToQuarterKey(monthKey: string): string {
  const year = monthKey.slice(0, 4);
  const month = Number.parseInt(monthKey.slice(5, 7), 10);
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

export function listQuartersFromMonthKeys(
  monthKeys: readonly string[],
): string[] {
  const quarters = new Set(monthKeys.map(monthKeyToQuarterKey));
  return Array.from(quarters).sort();
}

export function quarterKeysForYear(
  quarterKeys: readonly string[],
  year: string,
): string[] {
  const prefix = `${year}-`;
  return quarterKeys.filter((quarterKey) => quarterKey.startsWith(prefix));
}

export function quarterKeyToPeriod(quarterKey: string): DashboardPeriod {
  const [yearRaw, quarterRaw] = quarterKey.split("-Q");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const quarter = Number.parseInt(quarterRaw ?? "", 10);
  return calendarQuarterPeriod(year, quarter);
}

export function yearKeyToPeriod(yearKey: string): DashboardPeriod {
  return calendarYearPeriod(Number.parseInt(yearKey, 10));
}

export function formatQuarterOnlyLabel(quarterKey: string): string {
  const quarter = Number.parseInt(quarterKey.split("-Q")[1] ?? "", 10);
  return `T${quarter}`;
}

export function resolveQuarterForYear(
  quarterKeys: readonly string[],
  year: string,
  preferredQuarterKey: string,
): string {
  const quartersInYear = quarterKeysForYear(quarterKeys, year);
  if (quartersInYear.length === 0) {
    return preferredQuarterKey;
  }
  const preferredQuarter = preferredQuarterKey.split("-Q")[1];
  const sameQuarter = quartersInYear.find((key) =>
    key.endsWith(`-Q${preferredQuarter}`),
  );
  return sameQuarter ?? quartersInYear[quartersInYear.length - 1]!;
}

export function formatMonthKeyLabel(monthKey: string): string {
  const period = monthKeyToPeriod(monthKey);
  const [year, month, day] = period.from.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthOnlyLabel(monthKey: string): string {
  const period = monthKeyToPeriod(monthKey);
  const [year, month, day] = period.from.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function currentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function listMonthsFromInvoices(
  invoices: readonly InvoiceRecord[],
): string[] {
  const months = new Set(
    invoices.map((invoice) => invoiceMonthKey(invoice.invoiceDate)),
  );
  months.add(currentMonthKey());
  return Array.from(months).sort();
}

export function resolveMonthForYear(
  monthKeys: readonly string[],
  year: string,
  preferredMonthKey: string,
): string {
  const monthsInYear = monthKeysForYear(monthKeys, year);
  if (monthsInYear.length === 0) {
    return preferredMonthKey;
  }
  const preferredMonth = preferredMonthKey.slice(5, 7);
  const sameMonth = monthsInYear.find((key) => key.endsWith(`-${preferredMonth}`));
  return sameMonth ?? monthsInYear[monthsInYear.length - 1]!;
}
