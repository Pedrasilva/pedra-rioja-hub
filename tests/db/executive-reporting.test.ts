/**
 * Phase 7 — executive dashboard and management reporting database contracts.
 *
 * The dashboard and the /reports suite read almost exclusively from the views
 * and RPCs asserted here, so these tests pin the contract rather than the UI:
 * company scoping, which document statuses and cash-flow states are eligible,
 * and that no figure is counted twice across buckets.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admin, anonKey, authAdminUrl, authUrl, serviceRoleKey, userClient } from "../support/client";
import { createTestCompany, dropTestCompany, type TestCompany } from "../support/fixtures";

const FROM = "2026-01-01";
const TO = "2026-12-31";

let company: TestCompany;
let other: TestCompany;
let propertyId: string;
let otherPropertyId: string;
// The executive RPCs are membership-guarded, so they are exercised as a real
// signed-in owner rather than with the service role.
let owner: SupabaseClient;
let ownerUserId: string;

const PASSWORD = "QaPedraRioja!2026";

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

async function createOwner(companyId: string) {
  const email = "qa-exec-owner@pedrarioja.test";
  const list = await authFetch("/users?page=1&per_page=200");
  const body = (await list.json()) as { users?: { id: string; email: string }[] };
  const existing = body.users?.find((u) => u.email === email);
  if (existing) await authFetch(`/users/${existing.id}`, { method: "DELETE" });

  const res = await authFetch("/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const user = (await res.json()) as { id: string };
  ownerUserId = user.id;
  await admin.from("user_roles").delete().eq("user_id", user.id);
  const grant = await admin
    .from("user_roles")
    .insert({ user_id: user.id, company_id: companyId, role: "owner" });
  expectNoError(grant, "grant owner role");

  const tokenRes = await fetch(`${authUrl}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const session = (await tokenRes.json()) as { access_token?: string };
  if (!session.access_token) throw new Error("owner sign-in failed");
  return userClient(session.access_token);
}

function expectNoError(res: { error: unknown }, label: string) {
  if (res.error) throw new Error(`${label}: ${JSON.stringify(res.error)}`);
}

async function makeProperty(companyId: string, code: string) {
  const res = await admin
    .from("properties")
    .insert({ company_id: companyId, code, name: `Exec ${code}`, status: "rented" })
    .select("id")
    .single();
  expectNoError(res, "insert property");
  return res.data!.id as string;
}

async function entry(overrides: Record<string, unknown> = {}) {
  const res = await admin
    .from("cash_flow_entries")
    .insert({
      company_id: company.id,
      property_id: propertyId,
      source_type: "manual",
      source_id: null,
      is_manual: true,
      category: "rent",
      direction: "inflow",
      state: "actual",
      description: "Exec fixture",
      currency: "EUR",
      amount_net: 1000,
      vat: 0,
      amount_total: 1000,
      entry_date: "2026-03-15",
      expected_date: "2026-03-15",
      confidence: "high",
      ...overrides,
    })
    .select("id")
    .single();
  expectNoError(res, "insert cash flow entry");
  return res.data!.id as string;
}

// Line amounts are always derived by the database from quantity x unit price,
// so fixtures set the drivers and let the trigger compute net, VAT and gross.
async function postedDocument(
  companyId: string,
  doc: Record<string, unknown>,
  lines: Record<string, unknown>[] = [{}],
) {
  const created = await admin
    .from("financial_documents")
    .insert({
      company_id: companyId,
      direction: "inbound",
      doc_type: "invoice",
      issue_date: "2026-02-10",
      due_date: "2026-03-10",
      counterparty_name: "Exec Supplier",
      ...doc,
    })
    .select("id")
    .single();
  expectNoError(created, "insert document");
  const id = created.data!.id as string;

  const added = await admin.from("financial_document_lines").insert(
    lines.map((line, index) => ({
      company_id: companyId,
      document_id: id,
      line_no: index + 1,
      description: "Exec line",
      quantity: 1,
      unit_price: 1000,
      vat_rate: 23,
      ...line,
    })),
  );
  expectNoError(added, "insert document line");

  const posted = await admin.from("financial_documents").update({ status: "posted" }).eq("id", id);
  expectNoError(posted, "post document");
  return id;
}


async function profitability(companyId = company.id) {
  const res = await admin.rpc("property_profitability", {
    _company_id: companyId,
    _from: FROM,
    _to: TO,
  });
  expectNoError(res, "property_profitability");
  return (res.data ?? []) as Record<string, number | string>[];
}

async function rowFor(propId: string) {
  const rows = await profitability();
  const row = rows.find((r) => r.property_id === propId);
  if (!row) throw new Error("property missing from profitability output");
  return row;
}

beforeAll(async () => {
  company = await createTestCompany("executive");
  other = await createTestCompany("executive-other");
  propertyId = await makeProperty(company.id, "EXEC-1");
  otherPropertyId = await makeProperty(other.id, "EXEC-OTHER-1");
  owner = await createOwner(company.id);
}, 120_000);

afterAll(async () => {
  if (ownerUserId) {
    await admin.from("user_roles").delete().eq("user_id", ownerUserId);
    await authFetch(`/users/${ownerUserId}`, { method: "DELETE" });
  }
  await dropTestCompany(company);
  await dropTestCompany(other);
}, 120_000);

/* ------------------------------------------------ profitability RPC */

describe("property_profitability", () => {
  it("returns one row per property of the requested company only", async () => {
    const rows = await profitability();
    expect(rows.map((r) => r.property_id)).toContain(propertyId);
    expect(rows.map((r) => r.property_id)).not.toContain(otherPropertyId);
  });

  it("counts settled rent as rental income and derives the operating result", async () => {
    await entry({ category: "rent", amount_total: 2400, state: "reconciled" });
    const row = await rowFor(propertyId);
    expect(Number(row.rental_income)).toBe(2400);
    expect(Number(row.net_operating_income)).toBe(2400);
  });

  it("keeps forecast and committed movements out of realised performance", async () => {
    const before = Number((await rowFor(propertyId)).rental_income);
    await entry({ category: "rent", amount_total: 5000, state: "forecast" });
    await entry({ category: "rent", amount_total: 7000, state: "committed" });
    expect(Number((await rowFor(propertyId)).rental_income)).toBe(before);
  });

  it("excludes entries the user has flagged as not included", async () => {
    const before = Number((await rowFor(propertyId)).rental_income);
    await entry({ category: "rent", amount_total: 900, is_included: false });
    expect(Number((await rowFor(propertyId)).rental_income)).toBe(before);
  });

  it("ignores movements outside the requested period", async () => {
    const before = Number((await rowFor(propertyId)).rental_income);
    await entry({ category: "rent", amount_total: 3000, entry_date: "2025-06-01", expected_date: "2025-06-01" });
    expect(Number((await rowFor(propertyId)).rental_income)).toBe(before);
  });

  it("separates operating, financing, capex and tax outflows without overlap", async () => {
    await entry({ direction: "outflow", category: "maintenance", amount_total: 400 });
    await entry({ direction: "outflow", category: "financing", amount_total: 1000 });
    await entry({ direction: "outflow", category: "capex", amount_total: 2000 });
    await entry({ direction: "outflow", category: "tax", amount_total: 150 });

    const row = await rowFor(propertyId);
    expect(Number(row.operating_costs)).toBe(400);
    expect(Number(row.financing_costs)).toBe(1000);
    expect(Number(row.capex_spend)).toBe(2000);
    expect(Number(row.taxes)).toBe(150);

    const income = Number(row.rental_income) + Number(row.other_income);
    expect(Number(row.net_operating_income)).toBe(income - 400);
    expect(Number(row.net_cash_flow)).toBe(income - 400 - 1000 - 2000 - 150);
  });

  it("treats non-rent inflows as other income", async () => {
    await entry({ category: "other", direction: "inflow", amount_total: 600 });
    expect(Number((await rowFor(propertyId)).other_income)).toBe(600);
  });

  it("leaves a property with no movements at zero rather than null", async () => {
    const quiet = await makeProperty(company.id, "EXEC-QUIET");
    const row = await rowFor(quiet);
    expect(Number(row.rental_income)).toBe(0);
    expect(Number(row.net_cash_flow)).toBe(0);
  });
});

/* ----------------------------------------------------- income statement */

describe("v_income_statement", () => {
  async function lines(companyId = company.id) {
    const res = await admin
      .from("v_income_statement")
      .select("*")
      .eq("company_id", companyId);
    expectNoError(res, "read income statement");
    return (res.data ?? []) as Record<string, unknown>[];
  }

  it("includes posted documents and buckets them by direction", async () => {
    await postedDocument(company.id, { direction: "outbound", doc_type: "invoice", document_number: "EXEC-OUT-1" });
    await postedDocument(company.id, { direction: "inbound", document_number: "EXEC-IN-1" });
    const rows = await lines();
    const buckets = new Set(rows.map((r) => r.bucket));
    expect(buckets).toContain("income");
    expect(buckets).toContain("cost");
  });

  it("omits drafts, so unposted work never reaches the reports", async () => {
    const draft = await admin
      .from("financial_documents")
      .insert({
        company_id: company.id,
        direction: "inbound",
        doc_type: "invoice",
        issue_date: "2026-04-01",
        document_number: "EXEC-DRAFT-1",
      })
      .select("id")
      .single();
    expectNoError(draft, "insert draft");
    await admin.from("financial_document_lines").insert({
      company_id: company.id,
      document_id: draft.data!.id,
      line_no: 1,
      quantity: 1,
      unit_price: 5000,
      vat_rate: 0,
    });

    const rows = await lines();
    expect(rows.some((r) => r.document_id === draft.data!.id)).toBe(false);
  });

  it("drops a document again once it is cancelled", async () => {
    const id = await postedDocument(company.id, { document_number: "EXEC-CANCEL-1" });
    expect((await lines()).some((r) => r.document_id === id)).toBe(true);
    const cancelled = await admin
      .from("financial_documents")
      .update({ status: "cancelled", cancellation_reason: "issued in error" })
      .eq("id", id);
    expectNoError(cancelled, "cancel document");
    expect((await lines()).some((r) => r.document_id === id)).toBe(false);
  });

  it("labels unclassified lines instead of hiding them", async () => {
    const id = await postedDocument(company.id, { document_number: "EXEC-UNCL-1" }, [{ classification_id: null }]);
    const row = (await lines()).find((r) => r.document_id === id);
    expect(row?.classification_code).toBe("unclassified");
  });

  it("never leaks lines across companies", async () => {
    const foreign = await postedDocument(other.id, { document_number: "EXEC-FOREIGN-1" });
    expect((await lines()).some((r) => r.document_id === foreign)).toBe(false);
    expect((await lines(other.id)).some((r) => r.document_id === foreign)).toBe(true);
  });
});

/* ------------------------------------------------------------ VAT */

describe("vat_summary", () => {
  it("groups posted lines by direction and rate, counting each document once", async () => {
    const id = await postedDocument(
      company.id,
      { direction: "outbound", doc_type: "invoice", document_number: "EXEC-VAT-1", issue_date: "2026-05-02" },
      [
        { unit_price: 2000, vat_rate: 23 },
        { unit_price: 1000, vat_rate: 23 },
      ],
    );
    expect(id).toBeTruthy();

    const res = await admin.rpc("vat_summary", {
      _company_id: company.id,
      _from: "2026-05-01",
      _to: "2026-05-31",
    });
    expectNoError(res, "vat_summary");
    const row = (res.data ?? []).find(
      (r: Record<string, unknown>) => r.direction === "outbound" && Number(r.vat_rate) === 23,
    );
    expect(row).toBeTruthy();
    expect(Number(row!.net_amount)).toBe(3000);
    expect(Number(row!.vat_amount)).toBe(690);
    expect(Number(row!.document_count)).toBe(1);
  });

  it("returns nothing for a period with no posted documents", async () => {
    const res = await admin.rpc("vat_summary", {
      _company_id: company.id,
      _from: "2020-01-01",
      _to: "2020-12-31",
    });
    expectNoError(res, "vat_summary empty");
    expect(res.data).toEqual([]);
  });
});

/* --------------------------------------------------------- ageing */

describe("v_counterparty_ageing", () => {
  it("buckets an overdue payable and reports the oldest due date", async () => {
    const overdue = new Date();
    overdue.setUTCDate(overdue.getUTCDate() - 45);
    const dueDate = overdue.toISOString().slice(0, 10);

    await postedDocument(
      company.id,
      { document_number: "EXEC-AGE-1", issue_date: dueDate, due_date: dueDate, counterparty_name: "Ageing Co" },
    );

    const res = await admin
      .from("v_counterparty_ageing")
      .select("*")
      .eq("company_id", company.id)
      .eq("counterparty_name", "Ageing Co")
      .single();
    expectNoError(res, "read ageing");
    expect(Number(res.data!.due_31_60)).toBeGreaterThan(0);
    expect(Number(res.data!.not_due)).toBe(0);
    expect(res.data!.oldest_due_date).toBe(dueDate);
  });

  it("excludes fully settled documents", async () => {
    const id = await postedDocument(
      company.id,
      { document_number: "EXEC-AGE-2", counterparty_name: "Settled Co" },
    );
    await admin.from("financial_documents").update({ outstanding_amount: 0 }).eq("id", id);
    const res = await admin
      .from("v_counterparty_ageing")
      .select("counterparty_name")
      .eq("company_id", company.id)
      .eq("counterparty_name", "Settled Co");
    expectNoError(res, "read settled ageing");
    expect(res.data).toEqual([]);
  });
});

/* ----------------------------------------------------------- capex */

describe("v_capex_summary", () => {
  it("keeps actual costs, commitments and forecast in separate columns", async () => {
    const project = await admin
      .from("capex_projects")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        code: "EXEC-P1",
        name: "Roof renewal",
        status: "in_progress",
        budget_amount: 10_000,
      })
      .select("id")
      .single();
    expectNoError(project, "insert capex project");
    const projectId = project.data!.id as string;

    const cost = await admin.from("capex_project_costs").insert({
      company_id: company.id,
      project_id: projectId,
      description: "Scaffolding",
      amount: 2_000,
      incurred_on: "2026-03-01",
    });
    expectNoError(cost, "insert capex cost");
    await entry({ direction: "outflow", category: "capex", state: "committed", amount_total: 3_000, project_id: projectId });
    await entry({ direction: "outflow", category: "capex", state: "forecast", amount_total: 1_500, project_id: projectId });

    const res = await admin
      .from("v_capex_summary")
      .select("*")
      .eq("project_id", projectId)
      .single();
    expectNoError(res, "read capex summary");
    expect(Number(res.data!.actual_amount)).toBe(2_000);
    expect(Number(res.data!.committed_amount)).toBe(3_000);
    expect(Number(res.data!.forecast_amount)).toBe(1_500);
    expect(Number(res.data!.remaining_budget)).toBe(5_000);
    expect(Number(res.data!.spend_pct)).toBe(50);
  });

  it("reports no spend percentage when a project has no approved budget", async () => {
    const project = await admin
      .from("capex_projects")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        code: "EXEC-P2",
        name: "Unbudgeted study",
        status: "planned",
      })
      .select("id")
      .single();
    expectNoError(project, "insert unbudgeted project");
    const res = await admin
      .from("v_capex_summary")
      .select("spend_pct, budget_amount")
      .eq("project_id", project.data!.id)
      .single();
    expectNoError(res, "read unbudgeted summary");
    expect(res.data!.spend_pct).toBeNull();
  });
});

/* ---------------------------------------------- executive snapshot */

describe("executive_snapshot and executive_alerts", () => {
  it("returns a single scoped snapshot payload for the dashboard", async () => {
    const res = await owner.rpc("executive_snapshot", { _company_id: company.id });
    expectNoError(res, "executive_snapshot");
    const snap = res.data as Record<string, unknown>;
    expect(snap).toBeTruthy();
    for (const key of [
      "portfolio",
      "liquidity",
      "financing",
      "maturity",
      "income_costs",
      "upcoming_costs",
      "projects",
      "bookkeeping",
    ]) {
      expect(snap).toHaveProperty(key);
    }
  });

  it("refuses a company the signed-in user is not a member of", async () => {
    const res = await owner.rpc("executive_snapshot", { _company_id: other.id });
    expect(res.error).not.toBeNull();
  });

  it("returns alerts with the severity and category the panel groups on", async () => {
    const res = await owner.rpc("executive_alerts", { _company_id: company.id });
    expectNoError(res, "executive_alerts");
    const alerts = (res.data ?? []) as Record<string, unknown>[];
    for (const a of alerts) {
      expect(["critical", "high", "medium", "low"]).toContain(a.severity);
      expect(typeof a.title).toBe("string");
      expect(typeof a.category).toBe("string");
    }
  });

  it("raises an overdue-payable alert once a document is past due", async () => {
    const res = await owner.rpc("executive_alerts", { _company_id: company.id });
    expectNoError(res, "executive_alerts overdue");
    const alerts = (res.data ?? []) as Record<string, unknown>[];
    expect(alerts.some((a) => String(a.category) === "bookkeeping")).toBe(true);
  });
});
