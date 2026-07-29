/**
 * Executive layer — pure presentation helpers.
 *
 * Kept free of React and of the database client so the aggregation rules can
 * be tested directly.
 */

export type CsvColumn<T> = { key: string; label: string; value: (row: T) => unknown };

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(c.value(r))).join(","));
  return [head, ...body].join("\n");
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const csv = toCsv(rows, columns);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------- ranges */

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type RangePreset = "mtd" | "qtd" | "ytd" | "last12m" | "lastyear";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "mtd", label: "This month" },
  { value: "qtd", label: "This quarter" },
  { value: "ytd", label: "Year to date" },
  { value: "last12m", label: "Last 12 months" },
  { value: "lastyear", label: "Last calendar year" },
];

export function presetRange(preset: RangePreset, today = new Date()): { from: string; to: string } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const to = isoDate(today);
  switch (preset) {
    case "mtd":
      return { from: isoDate(new Date(Date.UTC(y, m, 1))), to };
    case "qtd":
      return { from: isoDate(new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1))), to };
    case "ytd":
      return { from: isoDate(new Date(Date.UTC(y, 0, 1))), to };
    case "last12m":
      return { from: isoDate(new Date(Date.UTC(y - 1, m, today.getUTCDate() + 1))), to };
    case "lastyear":
      return {
        from: isoDate(new Date(Date.UTC(y - 1, 0, 1))),
        to: isoDate(new Date(Date.UTC(y - 1, 11, 31))),
      };
  }
}

/* --------------------------------------------------- income statement */

export type IncomeStatementRow = {
  bucket: string;
  classification_code: string;
  classification_name: string;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  month: string;
};

export type IncomeStatementLine = {
  bucket: "income" | "cost";
  code: string;
  name: string;
  net: number;
  vat: number;
  gross: number;
};

export type IncomeStatementSummary = {
  income: IncomeStatementLine[];
  costs: IncomeStatementLine[];
  totalIncome: number;
  totalCosts: number;
  operatingResult: number;
  margin: number | null;
};

/** Groups posted document lines into an operational income statement. */
export function summariseIncomeStatement(rows: IncomeStatementRow[]): IncomeStatementSummary {
  const map = new Map<string, IncomeStatementLine>();
  for (const r of rows) {
    const bucket = r.bucket === "income" ? "income" : "cost";
    const key = `${bucket}:${r.classification_code}`;
    const line =
      map.get(key) ??
      ({
        bucket,
        code: r.classification_code,
        name: r.classification_name,
        net: 0,
        vat: 0,
        gross: 0,
      } as IncomeStatementLine);
    line.net += r.net_amount;
    line.vat += r.vat_amount;
    line.gross += r.gross_amount;
    map.set(key, line);
  }
  const all = [...map.values()].sort((a, b) => b.net - a.net);
  const income = all.filter((l) => l.bucket === "income");
  const costs = all.filter((l) => l.bucket === "cost");
  const totalIncome = income.reduce((s, l) => s + l.net, 0);
  const totalCosts = costs.reduce((s, l) => s + l.net, 0);
  const operatingResult = totalIncome - totalCosts;
  return {
    income,
    costs,
    totalIncome,
    totalCosts,
    operatingResult,
    margin: totalIncome > 0 ? round2((operatingResult / totalIncome) * 100) : null,
  };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/* ------------------------------------------------------- profitability */

export type ProfitabilityRow = {
  rental_income: number;
  other_income: number;
  operating_costs: number;
  financing_costs: number;
  capex_spend: number;
  taxes: number;
  net_operating_income: number;
  net_cash_flow: number;
  current_valuation: number;
  acquisition_total: number;
  outstanding_debt: number;
};

export function portfolioTotals(rows: ProfitabilityRow[]) {
  const sum = (pick: (r: ProfitabilityRow) => number) => rows.reduce((s, r) => s + pick(r), 0);
  const income = sum((r) => r.rental_income) + sum((r) => r.other_income);
  const value = sum((r) => r.current_valuation || r.acquisition_total);
  const noi = sum((r) => r.net_operating_income);
  return {
    income,
    operatingCosts: sum((r) => r.operating_costs),
    financingCosts: sum((r) => r.financing_costs),
    capex: sum((r) => r.capex_spend),
    taxes: sum((r) => r.taxes),
    noi,
    netCashFlow: sum((r) => r.net_cash_flow),
    value,
    debt: sum((r) => r.outstanding_debt),
    equity: value - sum((r) => r.outstanding_debt),
    grossYield: value > 0 ? round2((income / value) * 100) : null,
    netYield: value > 0 ? round2((noi / value) * 100) : null,
  };
}

/* ------------------------------------------------------------------ IRR */

/**
 * Internal rate of return for a dated cash-flow series (XIRR, ACT/365).
 * Returns null when the series has no sign change or does not converge —
 * "insufficient data" is a legitimate answer for a young portfolio.
 */
export function xirr(
  flows: { date: string; amount: number }[],
  guess = 0.1,
): number | null {
  const items = flows
    .filter((f) => Number.isFinite(f.amount) && f.amount !== 0)
    .map((f) => ({ t: Date.parse(f.date), amount: f.amount }))
    .filter((f) => Number.isFinite(f.t))
    .sort((a, b) => a.t - b.t);
  if (items.length < 2) return null;
  const hasPositive = items.some((f) => f.amount > 0);
  const hasNegative = items.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const t0 = items[0].t;
  const years = (t: number) => (t - t0) / (365 * 24 * 3600 * 1000);
  const npv = (rate: number) =>
    items.reduce((s, f) => s + f.amount / Math.pow(1 + rate, years(f.t)), 0);

  let rate = guess;
  for (let i = 0; i < 100; i += 1) {
    const value = npv(rate);
    const derivative = items.reduce(
      (s, f) => s - (years(f.t) * f.amount) / Math.pow(1 + rate, years(f.t) + 1),
      0,
    );
    if (!Number.isFinite(derivative) || derivative === 0) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < 1e-7) return round2(next * 100);
    rate = next;
  }
  return null;
}

/* -------------------------------------------------------- intelligence */

export type Insight = {
  key: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
};

/**
 * Operational intelligence derived from figures already on screen. These are
 * observations, never automatic actions.
 */
export function buildInsights(input: {
  totalCash: number;
  forecast: { horizon_days: number; projected_balance: number }[];
  monthlyRent: number;
  operatingCosts12m: number;
  financingCosts12m: number;
  projects: { name: string; budget: number; committed: number; actual: number }[];
  occupancyPct: number | null;
  weightedRate: number;
  totalDebt: number;
}): Insight[] {
  const out: Insight[] = [];

  const worst = [...input.forecast].sort((a, b) => a.projected_balance - b.projected_balance)[0];
  if (worst && worst.projected_balance < 0) {
    out.push({
      key: "liquidity-negative",
      severity: "critical",
      title: "Projected liquidity turns negative",
      detail: `Committed and forecast movements take cash below zero within ${worst.horizon_days} days.`,
    });
  } else if (worst && input.totalCash > 0 && worst.projected_balance < input.totalCash * 0.25) {
    out.push({
      key: "liquidity-thin",
      severity: "high",
      title: "Liquidity buffer thinning",
      detail: `Projected cash falls to under a quarter of today's balance within ${worst.horizon_days} days.`,
    });
  }

  for (const p of input.projects) {
    if (p.budget > 0 && p.actual + p.committed > p.budget) {
      out.push({
        key: `budget-overrun:${p.name}`,
        severity: "high",
        title: `Budget overrun — ${p.name}`,
        detail: `Actual and committed spend exceeds the approved budget by ${Math.round(
          p.actual + p.committed - p.budget,
        )}.`,
      });
    } else if (p.budget > 0 && p.actual + p.committed > p.budget * 0.9) {
      out.push({
        key: `budget-tight:${p.name}`,
        severity: "medium",
        title: `Budget nearly consumed — ${p.name}`,
        detail: "Over 90% of the approved budget is spent or committed.",
      });
    }
  }

  const annualRent = input.monthlyRent * 12;
  if (annualRent > 0 && input.operatingCosts12m > annualRent * 0.45) {
    out.push({
      key: "cost-ratio",
      severity: "medium",
      title: "Operating costs are high relative to rent",
      detail: "Costs over the last twelve months exceed 45% of contracted annual rent.",
    });
  }
  if (annualRent > 0 && input.financingCosts12m > annualRent * 0.7) {
    out.push({
      key: "debt-service",
      severity: "high",
      title: "Debt service absorbs most of the rent",
      detail: "Financing outflows over twelve months exceed 70% of contracted annual rent.",
    });
  }
  if (input.occupancyPct !== null && input.occupancyPct < 80) {
    out.push({
      key: "vacancy",
      severity: "medium",
      title: "Vacancy is reducing income",
      detail: `Portfolio occupancy is ${input.occupancyPct}%; vacant units carry cost without rent.`,
    });
  }
  if (input.totalDebt > 0 && input.weightedRate >= 5) {
    out.push({
      key: "refinance",
      severity: "medium",
      title: "Refinancing may be worthwhile",
      detail: `Weighted average rate across drawn debt is ${input.weightedRate}%.`,
    });
  }

  return out;
}
