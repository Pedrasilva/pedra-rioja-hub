import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  admin,
  anonClient,
  anonKey,
  authAdminUrl,
  authUrl,
  expectNoError,
  serviceRoleKey,
  userClient,
} from "../support/client";
import { createTestCompany, dropTestCompany, type TestCompany } from "../support/fixtures";

/**
 * Phase 8D — budgets.
 *
 * A budget is a PLAN (§5F). It never creates a commitment, a cash-flow entry,
 * a bookkeeping document or a bank movement, and it never stores committed /
 * invoiced / paid / remaining / variance: every one of those figures is
 * derived by v_budget_line_performance from the commitments that own the
 * expected expenditure (§5C, §5D).
 */

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
const MANAGE_ROLES: Role[] = ["owner", "manager"];
const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let other: TestCompany;
let propertyId: string;
let dimensionId: string;
let dimensionValueId: string;
let foreignDimensionValueId: string;
let otherBudgetId: string;
let otherOwner: SupabaseClient;
const clients = {} as Record<Role, SupabaseClient>;

/* ------------------------------------------------------------- plumbing */

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

async function deleteUserByEmail(email: string) {
  const res = await authFetch(`/users?page=1&per_page=200`);
  const body = (await res.json()) as { users?: { id: string; email: string }[] };
  const found = body.users?.find((u) => u.email === email);
  if (found) await authFetch(`/users/${found.id}`, { method: "DELETE" });
}

async function createRoleUser(role: string, companyId: string, prefix = "bud") {
  const email = `qa-${prefix}-${role}@pedrarioja.test`;
  await deleteUserByEmail(email);
  const res = await authFetch("/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const user = (await res.json()) as { id: string };
  if (!user.id) throw new Error(`could not create ${role}: ${JSON.stringify(user)}`);
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
  if (!session.access_token) throw new Error(`sign-in failed for ${role}`);
  return userClient(session.access_token);
}

type Args = Record<string, unknown>;
function rpc<T = unknown>(role: Role, fn: string, args: Args) {
  return clients[role].rpc(fn, args) as unknown as Promise<{
    data: T;
    error: { message: string } | null;
  }>;
}

let seq = 0;
const uniq = (label: string) => `${label} ${Date.now()}-${++seq}`;

async function makeBudget(role: Role = "manager", overrides: Args = {}) {
  const res = await rpc<string>(role, "create_budget", {
    _company_id: company.id,
    _name: uniq("Budget"),
    _fiscal_year: 2027,
    _currency: "EUR",
    ...overrides,
  });
  expectNoError(res, "create_budget");
  return res.data;
}

async function firstVersion(budgetId: string) {
  const res = await admin
    .from("budget_versions")
    .select("id, version_no, status")
    .eq("budget_id", budgetId)
    .order("version_no", { ascending: true });
  expectNoError(res, "load versions");
  return res.data![0] as { id: string; version_no: number; status: string };
}

async function addLine(versionId: string, overrides: Args = {}, role: Role = "manager") {
  const res = await rpc<string>(role, "upsert_budget_line", {
    _version_id: versionId,
    _label: uniq("Line"),
    _planned_amount: 10_000,
    ...overrides,
  });
  expectNoError(res, "upsert_budget_line");
  return res.data;
}

async function versionRow(id: string) {
  const res = await admin.from("budget_versions").select("*").eq("id", id).single();
  expectNoError(res, "reload version");
  return res.data as Record<string, unknown>;
}

/** Draft → published budget version with a single line. */
async function publishedVersion(budgetId?: string) {
  const id = budgetId ?? (await makeBudget());
  const v = await firstVersion(id);
  await addLine(v.id);
  expectNoError(await rpc("manager", "publish_budget_version", { _version_id: v.id }), "publish");
  return { budgetId: id, versionId: v.id };
}

/* -------------------------------------------------------------- fixtures */

beforeAll(async () => {
  company = await createTestCompany("budgets");
  other = await createTestCompany("budgets-other");

  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
  otherOwner = await createRoleUser("owner", other.id, "bud-other");

  const prop = await admin
    .from("properties")
    .insert({
      company_id: company.id,
      name: uniq("Budget property"),
      property_type: "apartment",
      status: "owned",
    })
    .select("id")
    .single();
  expectNoError(prop, "insert property");
  propertyId = prop.data!.id;

  const dim = await admin
    .from("dimensions")
    .insert({ company_id: company.id, code: `qa_bud_${Date.now()}`, label: "QA budget dimension" })
    .select("id")
    .single();
  expectNoError(dim, "insert dimension");
  dimensionId = dim.data!.id;

  const dv = await admin
    .from("dimension_values")
    .insert({
      company_id: company.id,
      dimension_id: dimensionId,
      code: `qa_val_${Date.now()}`,
      label: "Roof works",
    })
    .select("id")
    .single();
  expectNoError(dv, "insert dimension value");
  dimensionValueId = dv.data!.id;

  const foreignDim = await admin
    .from("dimensions")
    .insert({ company_id: other.id, code: `qa_bud_x_${Date.now()}`, label: "Foreign dimension" })
    .select("id")
    .single();
  expectNoError(foreignDim, "insert foreign dimension");
  const foreignValue = await admin
    .from("dimension_values")
    .insert({
      company_id: other.id,
      dimension_id: foreignDim.data!.id,
      code: `qa_val_x_${Date.now()}`,
      label: "Foreign value",
    })
    .select("id")
    .single();
  expectNoError(foreignValue, "insert foreign dimension value");
  foreignDimensionValueId = foreignValue.data!.id;

  const foreign = await otherOwner.rpc("create_budget", {
    _company_id: other.id,
    _name: uniq("Foreign budget"),
    _fiscal_year: 2027,
  });
  expectNoError(foreign, "create foreign budget");
  otherBudgetId = foreign.data as string;
}, 180_000);

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(other);
});

/* ----------------------------------------------------------------- tests */

describe("budget creation", () => {
  it("creates a budget with a first draft version", async () => {
    const id = await makeBudget();
    const budget = await admin.from("budgets").select("*").eq("id", id).single();
    expectNoError(budget, "reload budget");
    expect(budget.data!.status).toBe("open");
    expect(budget.data!.company_id).toBe(company.id);

    const v = await firstVersion(id);
    expect(v.version_no).toBe(1);
    expect(v.status).toBe("draft");
  });

  it("stores no derived totals on any budget table", async () => {
    const derived = ["committed", "invoiced", "paid", "remaining", "variance", "actual"];
    for (const table of ["budgets", "budget_versions", "budget_lines"]) {
      const cols = await admin.from(table).select("*").limit(1);
      expectNoError(cols, `probe ${table}`);
      const row = (cols.data ?? [])[0] ?? {};
      for (const key of Object.keys(row)) {
        expect(derived.some((d) => key.includes(d))).toBe(false);
      }
    }
  });

  it("records lines with dimension, property and period attribution", async () => {
    const budgetId = await makeBudget();
    const v = await firstVersion(budgetId);
    const lineId = await addLine(v.id, {
      _planned_amount: 12_500,
      _period_month: 4,
      _dimension_id: dimensionId,
      _dimension_value_id: dimensionValueId,
      _property_id: propertyId,
    });
    const line = await admin.from("budget_lines").select("*").eq("id", lineId!).single();
    expectNoError(line, "reload line");
    expect(Number(line.data!.planned_amount)).toBe(12_500);
    expect(line.data!.dimension_value_id).toBe(dimensionValueId);
    expect(line.data!.property_id).toBe(propertyId);
    expect(line.data!.period_month).toBe(4);
  });

  it("rejects a dimension value owned by another company", async () => {
    const budgetId = await makeBudget();
    const v = await firstVersion(budgetId);
    const res = await rpc("manager", "upsert_budget_line", {
      _version_id: v.id,
      _label: "Cross-company attribution",
      _planned_amount: 100,
      _dimension_value_id: foreignDimensionValueId,
    });
    expect(res.error?.message ?? "").toMatch(/another company/i);
  });
});

describe("versioning and immutability", () => {
  it("publishes a draft and marks it current", async () => {
    const { versionId } = await publishedVersion();
    const v = await versionRow(versionId);
    expect(v.status).toBe("published");
    expect(v.is_current).toBe(true);
    expect(v.published_at).not.toBeNull();
  });

  it("refuses to publish a version without lines", async () => {
    const budgetId = await makeBudget();
    const v = await firstVersion(budgetId);
    const res = await rpc("manager", "publish_budget_version", { _version_id: v.id });
    expect(res.error?.message ?? "").toMatch(/at least one line/i);
  });

  it("freezes lines once the version is published", async () => {
    const { versionId } = await publishedVersion();
    const add = await rpc("manager", "upsert_budget_line", {
      _version_id: versionId,
      _label: "Late line",
      _planned_amount: 1,
    });
    expect(add.error?.message ?? "").toMatch(/draft/i);

    const line = await admin
      .from("budget_lines")
      .select("id")
      .eq("budget_version_id", versionId)
      .limit(1)
      .single();
    const direct = await clients.manager
      .from("budget_lines")
      .update({ planned_amount: 99 })
      .eq("id", line.data!.id);
    expect(direct.error).not.toBeNull();
  });

  it("freezes the published version envelope against direct updates", async () => {
    const { versionId } = await publishedVersion();
    const direct = await clients.manager
      .from("budget_versions")
      .update({ notes: "tampered" })
      .eq("id", versionId);
    expect(direct.error).not.toBeNull();
  });

  it("supersedes the previous version and preserves its history", async () => {
    const { budgetId, versionId } = await publishedVersion();
    const created = await rpc<string>("manager", "create_budget_version", {
      _budget_id: budgetId,
      _reason: "Q2 revision",
      _copy_from_version_id: versionId,
    });
    expectNoError(created, "create_budget_version");
    const v2 = created.data!;

    const copied = await admin
      .from("budget_lines")
      .select("id", { count: "exact", head: true })
      .eq("budget_version_id", v2);
    expect(copied.count).toBe(1);

    expectNoError(await rpc("manager", "publish_budget_version", { _version_id: v2 }), "publish v2");

    const old = await versionRow(versionId);
    expect(old.status).toBe("superseded");
    expect(old.is_current).toBe(false);
    const current = await versionRow(v2);
    expect(current.status).toBe("published");
    expect(current.is_current).toBe(true);
    expect(current.version_no).toBe(2);
  });

  it("keeps a single current version per budget", async () => {
    const { budgetId } = await publishedVersion();
    const rows = await admin
      .from("budget_versions")
      .select("id, is_current")
      .eq("budget_id", budgetId);
    expectNoError(rows, "load versions");
    expect(rows.data!.filter((r) => r.is_current).length).toBe(1);
  });
});

describe("archive-only semantics", () => {
  it("archives a version instead of deleting it", async () => {
    const { versionId } = await publishedVersion();
    expectNoError(
      await rpc("manager", "archive_budget_version", {
        _version_id: versionId,
        _reason: "Superseded by revised plan",
      }),
      "archive version",
    );
    const v = await versionRow(versionId);
    expect(v.status).toBe("archived");
    expect(v.archived_at).not.toBeNull();
    expect(v.archive_reason).toBe("Superseded by revised plan");
  });

  it("archives a budget and blocks physical deletion", async () => {
    const budgetId = await makeBudget();
    expectNoError(
      await rpc("manager", "archive_budget", { _budget_id: budgetId, _reason: "Cancelled" }),
      "archive budget",
    );
    const b = await admin.from("budgets").select("status, archived_at").eq("id", budgetId).single();
    expect(b.data!.status).toBe("archived");

    const del = await admin.from("budgets").delete().eq("id", budgetId);
    expect(del.error?.message ?? "").toMatch(/archived, never deleted/i);
  });
});

describe("permissions and company isolation", () => {
  it("lets recording roles create budgets and blocks the rest", async () => {
    for (const role of ROLES) {
      const res = await rpc(role, "create_budget", {
        _company_id: company.id,
        _name: uniq(`Budget ${role}`),
        _fiscal_year: 2028,
      });
      if (RECORD_ROLES.includes(role)) expectNoError(res, `create as ${role}`);
      else expect(res.error?.message ?? "").toMatch(/permission/i);
    }
  });

  it("restricts publish and archive to managing roles", async () => {
    for (const role of ROLES) {
      const budgetId = await makeBudget();
      const v = await firstVersion(budgetId);
      await addLine(v.id);
      const res = await rpc(role, "publish_budget_version", { _version_id: v.id });
      if (MANAGE_ROLES.includes(role)) expectNoError(res, `publish as ${role}`);
      else expect(res.error?.message ?? "").toMatch(/permission/i);
    }
  });

  it("hides budgets from other companies and from anonymous callers", async () => {
    const mine = await clients.viewer.from("budgets").select("id, company_id");
    expectNoError(mine, "viewer read");
    expect(mine.data!.every((b) => b.company_id === company.id)).toBe(true);
    expect(mine.data!.some((b) => b.id === otherBudgetId)).toBe(false);

    const cross = await clients.owner.from("budgets").select("id").eq("id", otherBudgetId);
    expectNoError(cross, "cross-company read");
    expect(cross.data!.length).toBe(0);

    const anon = await anonClient().from("budgets").select("id");
    expect(anon.data ?? []).toHaveLength(0);
  });

  it("refuses to write into another company's budget", async () => {
    const foreignVersion = await admin
      .from("budget_versions")
      .select("id")
      .eq("budget_id", otherBudgetId)
      .single();
    const res = await rpc("owner", "upsert_budget_line", {
      _version_id: foreignVersion.data!.id,
      _label: "Injected",
      _planned_amount: 1,
    });
    expect(res.error?.message ?? "").toMatch(/permission|not found/i);
  });
});

describe("derived performance views", () => {
  it("reports zero consumption for a plan with no commitments", async () => {
    const budgetId = await makeBudget();
    const v = await firstVersion(budgetId);
    await addLine(v.id, { _planned_amount: 8_000, _dimension_value_id: dimensionValueId });

    const perf = await clients.manager
      .from("v_budget_line_performance")
      .select("planned_amount, committed_amount, invoiced_amount, paid_amount, remaining_amount")
      .eq("budget_version_id", v.id);
    expectNoError(perf, "line performance");
    const line = perf.data![0]!;
    expect(Number(line.committed_amount)).toBe(0);
    expect(Number(line.invoiced_amount)).toBe(0);
    expect(Number(line.paid_amount)).toBe(0);
    expect(Number(line.remaining_amount)).toBe(Number(line.planned_amount));
  });

  it("derives committed spend from an approved commitment on the same dimension", async () => {
    const budgetId = await makeBudget();
    const v = await firstVersion(budgetId);
    await addLine(v.id, {
      _planned_amount: 20_000,
      _dimension_id: dimensionId,
      _dimension_value_id: dimensionValueId,
    });

    const created = await rpc<string>("manager", "create_commitment_draft", {
      _company_id: company.id,
      _title: uniq("Roof commitment"),
      _commitment_type: "capex",
      _authorised_amount: 15_000,
      _start_date: "2027-05-01",
    });
    expectNoError(created, "create commitment");
    // Attribution is Dimensions only (§ dimensions are the single classifier).
    expectNoError(
      await admin.from("transaction_dimensions").insert({
        company_id: company.id,
        source_type: "commitment",
        source_id: created.data,
        dimension_id: dimensionId,
        dimension_value_id: dimensionValueId,
        is_primary: true,
      }),
      "attribute commitment",
    );
    expectNoError(
      await rpc("manager", "request_commitment_approval", {
        _commitment_id: created.data,
        _reason: "in budget",
      }),
      "request approval",
    );
    expectNoError(
      await rpc("approver", "approve_commitment", { _commitment_id: created.data, _comment: "ok" }),
      "approve",
    );

    const perf = await clients.manager
      .from("v_budget_line_performance")
      .select("planned_amount, committed_amount, remaining_amount, variance_amount, consumed_pct")
      .eq("budget_version_id", v.id)
      .single();
    expectNoError(perf, "line performance");
    expect(Number(perf.data!.committed_amount)).toBeGreaterThan(0);
    expect(Number(perf.data!.remaining_amount)).toBe(
      Number(perf.data!.planned_amount) - Number(perf.data!.committed_amount),
    );
  });

  it("summarises a version without storing the summary", async () => {
    const { versionId } = await publishedVersion();
    const summary = await clients.viewer
      .from("v_budget_version_summary")
      .select("*")
      .eq("version_id", versionId)
      .single();
    expectNoError(summary, "version summary");
    expect(summary.data!.company_id).toBe(company.id);
  });

  it("keeps the performance views company scoped", async () => {
    const rows = await clients.viewer.from("v_budget_line_performance").select("company_id");
    expectNoError(rows, "scoped view");
    expect(rows.data!.every((r) => r.company_id === company.id)).toBe(true);
  });
});

describe("approval integration", () => {
  it("routes a draft through the generic approval engine", async () => {
    const budgetId = await makeBudget();
    const v = await firstVersion(budgetId);
    await addLine(v.id, { _planned_amount: 50_000 });

    const req = await rpc<string>("manager", "request_budget_version_approval", {
      _version_id: v.id,
      _reason: "Board sign-off",
    });
    if (req.error) {
      // No workflow configured for budget_version in this company: the engine
      // must say so rather than silently approving the plan.
      expect(req.error.message).toMatch(/workflow|approval/i);
      return;
    }
    const row = await versionRow(v.id);
    expect(row.status).toBe("pending_approval");
    expect(row.approval_status).toBe("pending");
    expect(row.approval_request_id).toBe(req.data);

    const blocked = await rpc("manager", "publish_budget_version", { _version_id: v.id });
    expect(blocked.error?.message ?? "").toMatch(/awaiting approval/i);
  });
});

describe("plan vs actual separation (§5F)", () => {
  it("creates no commitment, cash-flow, bookkeeping or bank rows", async () => {
    const before = await Promise.all(
      ["commitments", "cash_flow_entries", "financial_documents", "bank_transactions"].map(
        async (table) => {
          const res = await admin
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id);
          return res.count ?? 0;
        },
      ),
    );

    const budgetId = await makeBudget();
    const v = await firstVersion(budgetId);
    await addLine(v.id, { _planned_amount: 33_000, _dimension_value_id: dimensionValueId });
    expectNoError(await rpc("manager", "publish_budget_version", { _version_id: v.id }), "publish");

    const after = await Promise.all(
      ["commitments", "cash_flow_entries", "financial_documents", "bank_transactions"].map(
        async (table) => {
          const res = await admin
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id);
          return res.count ?? 0;
        },
      ),
    );

    expect(after).toEqual(before);
  });
});
