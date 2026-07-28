/** en-GB formatting helpers shared across the app. */

const currencyCache = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string) {
  const key = currency.toUpperCase();
  let fmt = currencyCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: key,
      maximumFractionDigits: 0,
    });
    currencyCache.set(key, fmt);
  }
  return fmt;
}

export function formatMoney(
  value: number | string | null | undefined,
  currency = "EUR",
  fallback = "—",
) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return fallback;
  return currencyFormatter(currency).format(n);
}

export function formatMoneyPrecise(
  value: number | string | null | undefined,
  currency = "EUR",
  fallback = "—",
) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return fallback;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatNumber(
  value: number | string | null | undefined,
  digits = 0,
  fallback = "—",
) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return fallback;
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatPercent(value: number | string | null | undefined, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return fallback;
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(n)}%`;
}

export function formatArea(value: number | string | null | undefined, fallback = "—") {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n as number)) return fallback;
  return `${formatNumber(n, 0)} m²`;
}

export function titleCase(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
