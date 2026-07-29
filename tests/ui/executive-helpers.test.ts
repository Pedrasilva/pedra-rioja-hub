/**
 * Phase 7 — executive and reporting helpers.
 *
 * These are the only figures computed outside the database, so they are tested
 * directly with deterministic fixtures and a fixed "today"; nothing here reads
 * the system clock.
 */
import { describe, expect, it } from "vitest";

import { sortAlerts, type ExecutiveAlert } from "@/modules/executive/queries";
import {
  buildInsights,
  portfolioTotals,
  presetRange,
  summariseIncomeStatement,
  toCsv,
  xirr,
  type IncomeStatementRow,
  type ProfitabilityRow,
} from "@/modules/executive/report-utils";

const TODAY = new Date(Date.UTC(2026, 4, 17)); // 17 May 2026, fixed

/* ------------------------------------------------------------- ranges */

describe("presetRange", () => {
  it("derives month, quarter and year to date from an injected date", () => {
    expect(presetRange("mtd", TODAY)).toEqual({ from: "2026-05-01", to: "2026-05-17" });
    expect(presetRange("qtd", TODAY)).toEqual({ from: "2026-04-01", to: "2026-05-17" });
    expect(presetRange("ytd", TODAY)).toEqual({ from: "2026-01-01", to: "2026-05-17" });
  });

  it("uses an inclusive rolling window for the last twelve months", () => {
    expect(presetRange("last12m", TODAY)).toEqual({ from: "2025-05-18", to: "2026-05-17" });
  });

  it("returns the whole previous calendar year", () => {
    expect(presetRange("lastyear", TODAY)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("handles a first-of-month boundary without slipping a month", () => {
    expect(presetRange("mtd", new Date(Date.UTC(2026, 0, 1)))).toEqual({
      from: "2026-01-01",
      to: "2026-01-01",
    });
  });
});

/* -------------------------------------------------- income statement */

const ROWS: IncomeStatementRow[] = [
  {
    bucket: "income",
    classification_code: "7.1",
    classification_name: "Rent",
    net_amount: 1000,
    vat_amount: 0,
    gross_amount: 1000,
    month: "2026-01-01",
  },
  {
    bucket: "income",
    classification_code: "7.1",
    classification_name: "Rent",
    net_amount: 500,
    vat_amount: 0,
    gross_amount: 500,
    month: "2026-02-01",
  },
  {
    bucket: "cost",
    classification_code: "6.1",
    classification_name: "Maintenance",
    net_amount: 300,
    vat_amount: 69,
    gross_amount: 369,
    month: "2026-01-01",
  },
];

describe("summariseIncomeStatement", () => {
  it("groups by classification and splits income from costs", () => {
    const s = summariseIncomeStatement(ROWS);
    expect(s.income).toHaveLength(1);
    expect(s.income[0].net).toBe(1500);
    expect(s.costs[0]).toMatchObject({ code: "6.1", net: 300, vat: 69 });
  });

  it("totals the operating result and margin on net amounts", () => {
    const s = summariseIncomeStatement(ROWS);
    expect(s.totalIncome).toBe(1500);
    expect(s.totalCosts).toBe(300);
    expect(s.operatingResult).toBe(1200);
    expect(s.margin).toBe(80);
  });

  it("reports no margin rather than zero when there is no income", () => {
    const s = summariseIncomeStatement(ROWS.filter((r) => r.bucket === "cost"));
    expect(s.totalIncome).toBe(0);
    expect(s.margin).toBeNull();
  });

  it("returns empty totals for an empty period", () => {
    expect(summariseIncomeStatement([])).toMatchObject({
      totalIncome: 0,
      totalCosts: 0,
      operatingResult: 0,
      margin: null,
    });
  });
});

/* -------------------------------------------------------- portfolio */

const prop = (over: Partial<ProfitabilityRow> = {}): ProfitabilityRow => ({
  rental_income: 24_000,
  other_income: 1_000,
  operating_costs: 6_000,
  financing_costs: 8_000,
  capex_spend: 5_000,
  taxes: 1_500,
  net_operating_income: 19_000,
  net_cash_flow: 4_500,
  current_valuation: 500_000,
  acquisition_total: 420_000,
  outstanding_debt: 300_000,
  ...over,
});

describe("portfolioTotals", () => {
  it("aggregates income, costs, value and debt across properties", () => {
    const t = portfolioTotals([prop(), prop({ current_valuation: 0 })]);
    expect(t.income).toBe(50_000);
    expect(t.capex).toBe(10_000);
    expect(t.debt).toBe(600_000);
    // The second property has no valuation, so acquisition total stands in.
    expect(t.value).toBe(920_000);
    expect(t.equity).toBe(320_000);
  });

  it("derives gross and net yield from portfolio value", () => {
    const t = portfolioTotals([prop()]);
    expect(t.grossYield).toBe(5);
    expect(t.netYield).toBe(3.8);
  });

  it("returns no yield rather than infinity when value is unknown", () => {
    const t = portfolioTotals([prop({ current_valuation: 0, acquisition_total: 0 })]);
    expect(t.grossYield).toBeNull();
    expect(t.netYield).toBeNull();
  });

  it("keeps an empty portfolio at zero without cross-company assumptions", () => {
    expect(portfolioTotals([])).toMatchObject({ income: 0, value: 0, grossYield: null });
  });
});

/* -------------------------------------------------------------- IRR */

describe("xirr", () => {
  it("solves a simple annual doubling to about 100%", () => {
    const r = xirr([
      { date: "2025-01-01", amount: -1000 },
      { date: "2026-01-01", amount: 2000 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(99);
    expect(r!).toBeLessThan(101);
  });

  it("solves a multi-period property series", () => {
    const r = xirr([
      { date: "2023-01-01", amount: -400_000 },
      { date: "2024-01-01", amount: 20_000 },
      { date: "2025-01-01", amount: 22_000 },
      { date: "2026-01-01", amount: 460_000 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(8);
    expect(r!).toBeLessThan(12);
  });

  it("returns null when every flow has the same sign", () => {
    expect(
      xirr([
        { date: "2025-01-01", amount: -1000 },
        { date: "2026-01-01", amount: -500 },
      ]),
    ).toBeNull();
  });

  it("returns null for a single flow or an empty series", () => {
    expect(xirr([{ date: "2025-01-01", amount: -1000 }])).toBeNull();
    expect(xirr([])).toBeNull();
  });

  it("ignores zero and unparseable entries", () => {
    expect(
      xirr([
        { date: "not-a-date", amount: 500 },
        { date: "2025-01-01", amount: 0 },
        { date: "2025-01-01", amount: -1000 },
      ]),
    ).toBeNull();
  });
});

/* -------------------------------------------------------------- CSV */

describe("toCsv", () => {
  it("writes a header row and the mapped values", () => {
    const csv = toCsv([{ a: 1, b: "x" }], [
      { key: "a", label: "A", value: (r) => r.a },
      { key: "b", label: "B", value: (r) => r.b },
    ]);
    expect(csv).toBe("A,B\n1,x");
  });

  it("quotes and escapes commas, quotes and newlines", () => {
    const csv = toCsv([{ v: 'Rua "A", 1\nPorto' }], [
      { key: "v", label: "Address", value: (r) => r.v },
    ]);
    expect(csv).toBe('Address\n"Rua ""A"", 1\nPorto"');
  });

  it("renders null and undefined as empty cells, not the word null", () => {
    const csv = toCsv([{ v: null as string | null }], [
      { key: "v", label: "V", value: (r) => r.v },
    ]);
    expect(csv).toBe("V\n");
  });
});

/* ------------------------------------------------------------ alerts */

const alert = (over: Partial<ExecutiveAlert>): ExecutiveAlert => ({
  key: "k",
  severity: "medium",
  category: "bookkeeping",
  title: "t",
  detail: null,
  due_date: null,
  amount: null,
  entity_type: null,
  entity_id: null,
  ...over,
});

describe("sortAlerts", () => {
  it("orders by severity, then by the soonest date, undated last", () => {
    const sorted = sortAlerts([
      alert({ key: "b", severity: "medium", due_date: "2026-01-01" }),
      alert({ key: "a", severity: "critical", due_date: null }),
      alert({ key: "c", severity: "high", due_date: "2026-06-01" }),
      alert({ key: "d", severity: "high", due_date: "2026-02-01" }),
    ]);
    expect(sorted.map((a) => a.key)).toEqual(["a", "d", "c", "b"]);
  });
});

/* ------------------------------------------------------- intelligence */

const baseInput = {
  totalCash: 100_000,
  forecast: [
    { horizon_days: 30, projected_balance: 95_000 },
    { horizon_days: 90, projected_balance: 90_000 },
    { horizon_days: 180, projected_balance: 88_000 },
    { horizon_days: 365, projected_balance: 85_000 },
  ],
  monthlyRent: 10_000,
  operatingCosts12m: 20_000,
  financingCosts12m: 30_000,
  projects: [] as { name: string; budget: number; committed: number; actual: number }[],
  occupancyPct: 100,
  weightedRate: 3,
  totalDebt: 500_000,
};

const keys = (i: ReturnType<typeof buildInsights>) => i.map((x) => x.key);

describe("buildInsights", () => {
  it("stays silent when everything is within tolerance", () => {
    expect(buildInsights(baseInput)).toEqual([]);
  });

  it("raises a critical alert when projected liquidity turns negative", () => {
    const out = buildInsights({
      ...baseInput,
      forecast: [{ horizon_days: 90, projected_balance: -5_000 }],
    });
    expect(out[0]).toMatchObject({ key: "liquidity-negative", severity: "critical" });
    expect(out[0].detail).toContain("90 days");
  });

  it("warns once the buffer thins below a quarter of today's cash", () => {
    const out = buildInsights({
      ...baseInput,
      forecast: [{ horizon_days: 180, projected_balance: 10_000 }],
    });
    expect(keys(out)).toContain("liquidity-thin");
    expect(keys(out)).not.toContain("liquidity-negative");
  });

  it("treats exactly a quarter of cash as still acceptable", () => {
    const out = buildInsights({
      ...baseInput,
      forecast: [{ horizon_days: 180, projected_balance: 25_000 }],
    });
    expect(keys(out)).not.toContain("liquidity-thin");
  });

  it("flags a budget overrun using committed plus actual spend", () => {
    const out = buildInsights({
      ...baseInput,
      projects: [{ name: "Roof", budget: 50_000, committed: 20_000, actual: 40_000 }],
    });
    expect(out.find((i) => i.key === "budget-overrun:Roof")).toMatchObject({ severity: "high" });
  });

  it("warns before the overrun once 90% is consumed, without double-reporting", () => {
    const out = buildInsights({
      ...baseInput,
      projects: [{ name: "Roof", budget: 50_000, committed: 0, actual: 47_000 }],
    });
    expect(keys(out)).toEqual(["budget-tight:Roof"]);
  });

  it("ignores projects with no approved budget", () => {
    const out = buildInsights({
      ...baseInput,
      projects: [{ name: "Unbudgeted", budget: 0, committed: 5_000, actual: 5_000 }],
    });
    expect(out).toEqual([]);
  });

  it("detects a cost ratio above 45% of contracted annual rent", () => {
    const out = buildInsights({ ...baseInput, operatingCosts12m: 60_000 });
    expect(keys(out)).toContain("cost-ratio");
  });

  it("detects debt service absorbing most of the rent", () => {
    const out = buildInsights({ ...baseInput, financingCosts12m: 100_000 });
    expect(keys(out)).toContain("debt-service");
  });

  it("says nothing about ratios when there is no contracted rent", () => {
    const out = buildInsights({ ...baseInput, monthlyRent: 0, operatingCosts12m: 60_000 });
    expect(keys(out)).not.toContain("cost-ratio");
    expect(keys(out)).not.toContain("debt-service");
  });

  it("observes vacancy below 80% and stays quiet at the boundary", () => {
    expect(keys(buildInsights({ ...baseInput, occupancyPct: 79 }))).toContain("vacancy");
    expect(keys(buildInsights({ ...baseInput, occupancyPct: 80 }))).not.toContain("vacancy");
    expect(keys(buildInsights({ ...baseInput, occupancyPct: null }))).not.toContain("vacancy");
  });

  it("suggests refinancing at or above a 5% weighted rate, only with drawn debt", () => {
    expect(keys(buildInsights({ ...baseInput, weightedRate: 5 }))).toContain("refinance");
    expect(
      keys(buildInsights({ ...baseInput, weightedRate: 7, totalDebt: 0 })),
    ).not.toContain("refinance");
  });

  it("emits several insights at once, most severe first, with unique keys", () => {
    const out = buildInsights({
      ...baseInput,
      forecast: [{ horizon_days: 30, projected_balance: -1 }],
      projects: [
        { name: "Roof", budget: 10_000, committed: 0, actual: 20_000 },
        { name: "Lift", budget: 10_000, committed: 0, actual: 20_000 },
      ],
      operatingCosts12m: 90_000,
      occupancyPct: 50,
      weightedRate: 6,
    });
    expect(out[0].severity).toBe("critical");
    expect(new Set(keys(out)).size).toBe(out.length);
    expect(keys(out)).toEqual(
      expect.arrayContaining([
        "liquidity-negative",
        "budget-overrun:Roof",
        "budget-overrun:Lift",
        "cost-ratio",
        "vacancy",
        "refinance",
      ]),
    );
  });

  it("copes with a portfolio that has no data at all", () => {
    expect(
      buildInsights({
        totalCash: 0,
        forecast: [],
        monthlyRent: 0,
        operatingCosts12m: 0,
        financingCosts12m: 0,
        projects: [],
        occupancyPct: null,
        weightedRate: 0,
        totalDebt: 0,
      }),
    ).toEqual([]);
  });
});
