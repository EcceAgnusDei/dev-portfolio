export const SPEND_DASHBOARD_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type SpendDashboardAcceptedMime =
  (typeof SPEND_DASHBOARD_ACCEPTED_MIME_TYPES)[number];

export const SPEND_DASHBOARD_ACCEPT_ATTR =
  SPEND_DASHBOARD_ACCEPTED_MIME_TYPES.join(",");

export const SPEND_DASHBOARD_MAX_FILE_BYTES = 8 * 1024 * 1024;

export const SPEND_DASHBOARD_INVOICE_CATEGORIES = [
  "software",
  "transport",
  "meals",
  "office",
  "rent",
  "other",
] as const;

export type SpendDashboardInvoiceCategory =
  (typeof SPEND_DASHBOARD_INVOICE_CATEGORIES)[number];

export const SPEND_DASHBOARD_CATEGORY_LABELS: Record<
  SpendDashboardInvoiceCategory,
  string
> = {
  software: "Logiciel / hébergement",
  transport: "Transport",
  meals: "Restauration",
  office: "Fournitures",
  rent: "Loyer",
  other: "Autre",
};

export const SPEND_DASHBOARD_CONFIDENCE_LEVELS = [
  "high",
  "medium",
  "low",
] as const;

export type SpendDashboardConfidence =
  (typeof SPEND_DASHBOARD_CONFIDENCE_LEVELS)[number];

export const SPEND_DASHBOARD_CONFIDENCE_LABELS: Record<
  SpendDashboardConfidence,
  string
> = {
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

export const SPEND_DASHBOARD_DEFAULT_CURRENCY = "EUR";

export const SPEND_DASHBOARD_DEFAULT_LLM_MODEL = "gemini-3.5-flash-lite";
export const SPEND_DASHBOARD_MAX_OUTPUT_TOKENS = 2048;

export const SPEND_DASHBOARD_RATE_LIMIT_MAX = 10;
export const SPEND_DASHBOARD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
