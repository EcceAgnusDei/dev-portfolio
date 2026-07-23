export const PAY_FLOW_CURRENCY = "eur";

export const PAY_FLOW_RATE_LIMIT_MAX = 10;
export const PAY_FLOW_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export function getPayFlowSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}
