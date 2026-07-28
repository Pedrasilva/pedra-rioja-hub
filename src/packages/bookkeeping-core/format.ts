/**
 * Shared bookkeeping core — self-contained en-GB formatting.
 *
 * Duplicated deliberately: the core must not import host utilities. Hosts keep
 * their own formatting for the rest of the application.
 */

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

export function titleCase(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
