import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admin, anonKey, authAdminUrl, authUrl, serviceRoleKey, userClient } from "../support/client";
import {
  createPropertyLikeServerFn,
  createTestCompany,
  dropTestCompany,
  type TestCompany,
} from "../support/fixtures";
import { generateSchedule } from "../../src/modules/realestate/financing-schemas";
import { ruleOccurrences } from "../../src/modules/cashflow/schemas";

const PASSWORD = "QaPedraRioja!2026";
const HORIZON = "2027-12-31";

let company: TestCompany;
let otherCompany: TestCompany;
let propertyId: string;
let soldPropertyId: string;
let otherPropertyId: string;
let bankAccountId: string;
const clients: Record<string, SupabaseClient> = {};

async function authFetch(path: string, init: RequestInit = {}) {
  return fetch(`${authAdminUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function createRoleUser(label: string, role: string, companyId: string) {
  const email = `qa-cf-${label}@pedrarioja.test`;
  const list = await authFetch(`/users?page=1&per_page=200`);
  const body = (await list.json()) as { users?: { id: string; email: string }[] };
  const existing = body.users?.find((u) => u.email === email);
  if (existing) await authFetch(`/users/${existing.id}`, { method: "DELETE" });

  const res = await authFetch("/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const user = (await res.json()) as { id: string };
  await admin.from("user_roles").delete().eq("user_id", user.id);
  const grant = await admin
    .from("user_roles")
    .insert({ user_id: user.id, company_id: companyId, role });
  if (grant.error) throw new Error(`grant ${role}: ${grant.error.message}`);

  const tokenRes = await fetch(`${authUrl}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const session = (await tokenRes.json()) as { access_token?: string };
  if (!session.access_token) throw new Error(`sign-in failed for ${label}`);
  return userClient(session.access_token);
}

async function makeRule(overrides: Record<string, unknown> = {}) {
  const { data, error } = await admin
    .from("cash_flow_recurring_rules")
    .insert({
      company_id: company.id,
      property_id: propertyId,
      name: "Condominium fee",
      category: "maintenance",
      direction: "outflow",
      state: "committed",
      currency: "EUR",
      amount_net: 100,
      vat: 23,
      amount_total: 123,
      frequency: "monthly",
      interval_count: 1,
      start_date: "2026-08-01",
      end_date: "2026-12-01",
      confidence: "high",
      ...overrides,
    })
    .select("*")
    .single();
  if (error) throw new Error(`makeRule: ${error.message}`);
  return data!;
}

async function occurrencesOf(ruleId: string) {
  const { data } = await admin
    .from("cash_flow_entries")
    .select("id, expected_date, amount_total, state, occurrence_key")
    .eq("rule_id", ruleId)
    .order("expected_date");
  return data ?? [];
}

async function manualEntry(overrides: Record<string, unknown> = {}) {
  const { data, error } = await admin
    .from("cash_flow_entries")
    .insert({
      company_id: company.id,
      property_id: propertyId,
      source_type: "manual",
      source_id: null,
      is_manual: true,
      category: "other",
      direction: "outflow",
      state: "forecast",
      description: "Manual scenario item",
      currency: "EUR",
      amount_net: 1000,
      vat: 0,
      amount_total: 1000,
      entry_date: "2026-09-15",
      expected_date: "2026-09-15",
      confidence: "medium",
      ...overrides,
    })
    .select("*")
    .single();
  if (error) throw new Error(`manualEntry: ${error.message}`);
  return data!;
}

async function monthly(client: SupabaseClient, args: Record<string, unknown> = {}) {
  const { data, error } = await client.rpc("cash_flow_monthly", {
    _company_id: company.id,
    _from: "2026-08-01",
    _months: 6,
    _scenario: "base",
    ...args,
  });
  if (error) throw new Error(`cash_flow_monthly: ${error.message}`);
  return (data ?? []) as Record<string, number | string>[];
}

beforeAll(async () => {
  company = await createTestCompany("cashflow");
  otherCompany = await createTestCompany("cashflow-other");

  propertyId = (
    await createPropertyLikeServerFn(company.id, { name: "Cash Flow Asset", status: "owned" })
  ).property.id;
  soldPropertyId = (
    await createPropertyLikeServerFn(company.id, { name: "Disposed Asset", status: "sold" })
  ).property.id;
  otherPropertyId = (
    await createPropertyLikeServerFn(otherCompany.id, { name: "Foreign Asset", status: "owned" })
  ).property.id;

  const acc = await admin
    .from("bank_accounts")
    .insert({
      company_id: company.id,
      name: "Main current account",
      currency: "EUR",
      opening_balance: 50000,
      opening_balance_date: "2026-01-01",
    })
    .select("id")
    .single();
  if (acc.error) throw new Error(acc.error.message);
  bankAccountId = acc.data!.id as string;

  clients.owner = await createRoleUser("owner", "owner", company.id);
  clients.bookkeeper = await createRoleUser("bookkeeper", "bookkeeper", company.id);
  clients.viewer = await createRoleUser("viewer", "viewer", company.id);
  clients.outsider = await createRoleUser("outsider", "owner", otherCompany.id);
}, 120_000);

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(otherCompany);
  for (const label of ["owner", "bookkeeper", "viewer", "outsider"]) {
    const list = await authFetch(`/users?page=1&per_page=200`);
    const body = (await list.json()) as { users?: { id: string; email: string }[] };
    const u = body.users?.find((x) => x.email === `qa-cf-${label}@pedrarioja.test`);
    if (u) await authFetch(`/users/${u.id}`, { method: "DELETE" });
  }
});

describe("scenarios", () => {
  it("seeds Base, Conservative and Optimistic for a new company", async () => {
    const { data } = await admin
      .from("cash_flow_scenarios")
      .select("code, is_default")
      .eq("company_id", company.id)
      .order("sort_order");
    expect((data ?? []).map((s) => s.code)).toEqual(["base", "conservative", "optimistic"]);
    expect(data?.find((s) => s.code === "base")?.is_default).toBe(true);
  });
});

describe("recurring generation", () => {
  it("generates one occurrence per period over the horizon", async () => {
    const rule = await makeRule();
    const { data: created, error } = await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: rule.id,
      _through: HORIZON,
    });
    expect(error).toBeNull();
    expect(created).toBe(5);

    const rows = await occurrencesOf(rule.id as string);
    expect(rows.map((r) => r.expected_date)).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
    ]);
    expect(Number(rows[0].amount_total)).toBe(123);
  });

  it("matches the client-side occurrence preview", async () => {
    const rule = await makeRule({ name: "Quarterly audit", frequency: "quarterly" });
    await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: rule.id,
      _through: HORIZON,
    });
    const rows = await occurrencesOf(rule.id as string);
    expect(rows.map((r) => r.expected_date)).toEqual(
      ruleOccurrences(rule as never, HORIZON),
    );
  });

  it("supports annual and custom-interval rules", async () => {
    const annual = await makeRule({
      name: "IMI",
      category: "tax",
      frequency: "annual",
      start_date: "2026-09-30",
      end_date: "2027-12-31",
    });
    await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: annual.id,
      _through: HORIZON,
    });
    expect((await occurrencesOf(annual.id as string)).length).toBe(2);

    const custom = await makeRule({
      name: "Every two months",
      frequency: "custom",
      interval_count: 2,
      start_date: "2026-08-01",
      end_date: "2026-12-31",
    });
    await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: custom.id,
      _through: HORIZON,
    });
    expect((await occurrencesOf(custom.id as string)).length).toBe(3);
  });

  it("never duplicates when regenerated over the same or a longer horizon", async () => {
    const rule = await makeRule({ name: "Insurance", end_date: null });
    await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: rule.id,
      _through: "2026-12-31",
    });
    const first = await occurrencesOf(rule.id as string);
    const { data: again } = await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: rule.id,
      _through: "2026-12-31",
    });
    expect(again).toBe(0);
    expect((await occurrencesOf(rule.id as string)).length).toBe(first.length);

    const { data: extended } = await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: rule.id,
      _through: "2027-03-31",
    });
    expect(extended).toBe(3);
    expect((await occurrencesOf(rule.id as string)).length).toBe(first.length + 3);
  });

  it("honours max_occurrences and inactive rules", async () => {
    const capped = await makeRule({ name: "Three payments", end_date: null, max_occurrences: 3 });
    await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: capped.id,
      _through: HORIZON,
    });
    expect((await occurrencesOf(capped.id as string)).length).toBe(3);

    const inactive = await makeRule({ name: "Paused", is_active: false });
    const { data: made } = await clients.owner.rpc("generate_recurring_cash_flow", {
      _rule_id: inactive.id,
      _through: HORIZON,
    });
    expect(made).toBe(0);
  });
});

describe("scenario inclusion", () => {
  it("excluded items stay in the ledger but leave the projection", async () => {
    const entry = await manualEntry({ description: "Optional refurbishment", amount_total: 5000, amount_net: 5000 });
    const before = await monthly(clients.owner);
    const sept = before.find((m) => String(m.month).startsWith("2026-09"))!;

    await admin.from("cash_flow_entries").update({ is_included: false }).eq("id", entry.id);
    const after = await monthly(clients.owner);
    const septAfter = after.find((m) => String(m.month).startsWith("2026-09"))!;

    expect(Number(sept.outflows) - Number(septAfter.outflows)).toBe(5000);
    const { data: still } = await admin
      .from("cash_flow_entries")
      .select("id, is_included")
      .eq("id", entry.id)
      .maybeSingle();
    expect(still?.is_included).toBe(false);
  });

  it("scenario-scoped items only appear in their own scenario", async () => {
    await manualEntry({
      description: "Optimistic disposal proceeds",
      direction: "inflow",
      amount_net: 250000,
      amount_total: 250000,
      scenario_code: "optimistic",
      expected_date: "2026-10-10",
      entry_date: "2026-10-10",
    });
    const base = await monthly(clients.owner, { _scenario: "base" });
    const optimistic = await monthly(clients.owner, { _scenario: "optimistic" });
    const oct = (rows: Record<string, number | string>[]) =>
      Number(rows.find((m) => String(m.month).startsWith("2026-10"))!.inflows);
    expect(oct(optimistic) - oct(base)).toBe(250000);

    const conservative = await monthly(clients.owner, { _scenario: "conservative" });
    expect(oct(conservative)).toBe(oct(base));
  });
});

describe("monthly balances", () => {
  it("carries the opening bank balance and chains opening to closing", async () => {
    const rows = await monthly(clients.owner, { _bank_account_id: bankAccountId, _months: 4 });
    expect(rows.length).toBe(4);
    for (let i = 1; i < rows.length; i += 1) {
      expect(Number(rows[i].opening_balance)).toBeCloseTo(Number(rows[i - 1].closing_balance), 2);
    }
    for (const r of rows) {
      expect(Number(r.closing_balance)).toBeCloseTo(
        Number(r.opening_balance) + Number(r.net_movement),
        2,
      );
      expect(Number(r.cumulative_liquidity)).toBeCloseTo(Number(r.closing_balance), 2);
    }
  });

  it("reports actual-versus-forecast variance", async () => {
    const entry = await manualEntry({
      description: "Paid legal fee",
      category: "professional_fees",
      amount_net: 400,
      amount_total: 400,
      expected_date: "2026-11-05",
      entry_date: "2026-11-05",
    });
    const before = await monthly(clients.owner);
    const nov = before.find((m) => String(m.month).startsWith("2026-11"))!;
    expect(Number(nov.forecast_net)).toBeLessThan(0);

    await admin
      .from("cash_flow_entries")
      .update({ state: "actual", actual_date: "2026-11-05" })
      .eq("id", entry.id);
    const after = await monthly(clients.owner);
    const novAfter = after.find((m) => String(m.month).startsWith("2026-11"))!;
    expect(Number(novAfter.actual_net)).toBeLessThanOrEqual(-400);
    expect(Number(novAfter.variance)).toBeCloseTo(
      Number(novAfter.actual_net) - Number(novAfter.forecast_net),
      2,
    );
  });
});

describe("financing integration", () => {
  it("committed instalments reach the ledger with components preserved", async () => {
    const ag = await admin
      .from("financing_agreements")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        type: "mortgage",
        lender: "Banco QA",
        principal: 60000,
        currency: "EUR",
        start_date: "2026-08-01",
        term_months: 6,
        rate_type: "fixed",
        fixed_rate: 4,
        repayment_type: "annuity",
        status: "active",
      })
      .select("id")
      .single();
    const agreementId = ag.data!.id as string;

    const rows = generateSchedule({
      principal: 60000,
      annualRatePct: 4,
      termMonths: 6,
      firstDueDate: "2026-08-10",
      repaymentType: "annuity",
      monthlyCommission: 4,
      vatRatePct: 23,
    });
    const { error } = await clients.owner.rpc("apply_financing_schedule", {
      _agreement_id: agreementId,
      _effective_from: "2026-08-01",
      _reason: "origination",
      _rows: rows as never,
    });
    expect(error).toBeNull();

    const { data: entries } = await admin
      .from("cash_flow_entries")
      .select("*")
      .eq("agreement_id", agreementId)
      .order("expected_date");
    expect(entries?.length).toBe(6);
    const first = entries![0];
    expect(first.category).toBe("financing");
    expect(first.state).toBe("committed");
    expect(first.is_manual).toBe(false);
    expect(Number(first.principal) + Number(first.interest)).toBeGreaterThan(0);
    expect(Number(first.amount_total)).toBeCloseTo(
      Number(first.principal) +
        Number(first.interest) +
        Number(first.vat) +
        Number(first.commissions) +
        Number(first.insurance),
      2,
    );

    const rowsMonthly = await monthly(clients.owner);
    const aug = rowsMonthly.find((m) => String(m.month).startsWith("2026-08"))!;
    expect(Number(aug.financing)).toBeCloseTo(Number(first.amount_total), 2);
  });

  it("refuses to let a user re-type a linked entry's amounts", async () => {
    const { data: linked } = await admin
      .from("cash_flow_entries")
      .select("id")
      .eq("company_id", company.id)
      .eq("source_type", "financing_schedule_row")
      .limit(1)
      .maybeSingle();
    const res = await clients.owner
      .from("cash_flow_entries")
      .update({ amount_total: 1 })
      .eq("id", linked!.id);
    expect(res.error?.message ?? "").toMatch(/maintained by its source record/i);
  });

  it("allows recording the actual settlement date on a linked entry", async () => {
    const { data: linked } = await admin
      .from("cash_flow_entries")
      .select("id")
      .eq("company_id", company.id)
      .eq("source_type", "financing_schedule_row")
      .limit(1)
      .maybeSingle();
    const res = await clients.bookkeeper
      .from("cash_flow_entries")
      .update({ actual_date: "2026-08-11", state: "actual", reconciliation_state: "matched" })
      .eq("id", linked!.id);
    expect(res.error).toBeNull();
  });
});

describe("immutability", () => {
  it("reconciled entries cannot be changed or deleted", async () => {
    const entry = await manualEntry({ description: "Reconciled rent", direction: "inflow" });
    await admin
      .from("cash_flow_entries")
      .update({ state: "reconciled", reconciliation_state: "reconciled", actual_date: "2026-09-15" })
      .eq("id", entry.id);

    const upd = await clients.owner
      .from("cash_flow_entries")
      .update({ amount_total: 99 })
      .eq("id", entry.id);
    expect(upd.error?.message ?? "").toMatch(/immutable/i);

    const del = await clients.owner.from("cash_flow_entries").delete().eq("id", entry.id);
    expect(del.error?.message ?? "").toMatch(/cannot be deleted/i);
  });

  it("an actual movement cannot be pushed back to a projected status", async () => {
    const entry = await manualEntry({ description: "Settled fee" });
    await admin
      .from("cash_flow_entries")
      .update({ state: "actual", actual_date: "2026-09-15" })
      .eq("id", entry.id);
    const res = await clients.owner
      .from("cash_flow_entries")
      .update({ state: "forecast" })
      .eq("id", entry.id);
    expect(res.error?.message ?? "").toMatch(/cannot go back/i);
  });

  it("linked entries cannot be created by hand", async () => {
    const res = await clients.owner.from("cash_flow_entries").insert({
      company_id: company.id,
      source_type: "financing_schedule_row",
      source_id: null,
      is_manual: false,
      category: "financing",
      direction: "outflow",
      state: "committed",
      entry_date: "2026-09-01",
      expected_date: "2026-09-01",
      amount_total: 500,
    });
    expect(res.error?.message ?? "").toMatch(/Only source modules/i);
  });
});

describe("filtering", () => {
  it("filters by property", async () => {
    const all = await monthly(clients.owner);
    const scoped = await monthly(clients.owner, { _property_id: propertyId });
    const sum = (rows: Record<string, number | string>[]) =>
      rows.reduce((s, r) => s + Number(r.outflows), 0);
    expect(sum(scoped)).toBeGreaterThan(0);
    expect(sum(scoped)).toBeLessThanOrEqual(sum(all));
  });

  it("excludes archived and sold assets unless asked", async () => {
    await manualEntry({
      property_id: soldPropertyId,
      description: "Legacy cost on sold asset",
      amount_net: 7777,
      amount_total: 7777,
      expected_date: "2026-12-01",
      entry_date: "2026-12-01",
    });
    const hidden = await monthly(clients.owner);
    const shown = await monthly(clients.owner, { _include_inactive: true });
    const dec = (rows: Record<string, number | string>[]) =>
      Number(rows.find((m) => String(m.month).startsWith("2026-12"))!.outflows);
    expect(dec(shown) - dec(hidden)).toBe(7777);
  });

  it("filters by category", async () => {
    const taxes = await monthly(clients.owner, { _category: "tax" });
    expect(taxes.every((r) => Number(r.financing) === 0)).toBe(true);
  });

  it("filters by status", async () => {
    const committed = await monthly(clients.owner, { _states: ["committed"] });
    const total = committed.reduce((s, r) => s + Number(r.outflows), 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe("isolation and roles", () => {
  it("another company sees none of these entries", async () => {
    const { data } = await clients.outsider
      .from("v_cash_flow_entries")
      .select("id")
      .eq("company_id", company.id);
    expect(data ?? []).toHaveLength(0);

    const res = await clients.outsider.rpc("cash_flow_monthly", {
      _company_id: company.id,
      _from: "2026-08-01",
      _months: 3,
    });
    const rows = (res.data ?? []) as Record<string, number>[];
    expect(rows.every((r) => Number(r.inflows) === 0 && Number(r.outflows) === 0)).toBe(true);
  });

  it("a foreign property cannot be attached to this company's rules", async () => {
    const res = await clients.owner.from("cash_flow_recurring_rules").insert({
      company_id: otherCompany.id,
      property_id: otherPropertyId,
      name: "Cross-company rule",
      start_date: "2026-08-01",
    });
    expect(res.error).not.toBeNull();
  });

  it("viewers can read but not write", async () => {
    const read = await clients.viewer.from("v_cash_flow_entries").select("id").eq("company_id", company.id);
    expect(read.error).toBeNull();
    expect((read.data ?? []).length).toBeGreaterThan(0);

    const write = await clients.viewer.from("cash_flow_entries").insert({
      company_id: company.id,
      source_type: "manual",
      category: "other",
      direction: "outflow",
      state: "forecast",
      entry_date: "2026-09-01",
      expected_date: "2026-09-01",
      amount_total: 10,
    });
    expect(write.error).not.toBeNull();

    const gen = await clients.viewer.rpc("generate_company_cash_flow", {
      _company_id: company.id,
      _through: HORIZON,
    });
    expect(gen.error?.message ?? "").toMatch(/Not allowed/i);
  });

  it("bookkeepers may generate occurrences but not manage rules", async () => {
    const gen = await clients.bookkeeper.rpc("generate_company_cash_flow", {
      _company_id: company.id,
      _through: HORIZON,
    });
    expect(gen.error).toBeNull();

    const rule = await clients.bookkeeper.from("cash_flow_recurring_rules").insert({
      company_id: company.id,
      name: "Bookkeeper rule",
      start_date: "2026-08-01",
    });
    expect(rule.error).not.toBeNull();
  });
});
