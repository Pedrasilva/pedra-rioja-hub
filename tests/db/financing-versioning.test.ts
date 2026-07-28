import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  admin,
  anonKey,
  authAdminUrl,
  authUrl,
  serviceRoleKey,
  userClient,
} from "../support/client";
import {
  createPropertyLikeServerFn,
  createTestCompany,
  dropTestCompany,
  type TestCompany,
} from "../support/fixtures";
import { generateSchedule, scheduleFingerprint } from "../../src/modules/realestate/financing-schemas";

const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let otherCompany: TestCompany;
let propertyId: string;
let agreementId: string;
let otherAgreementId: string;
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
  const email = `qa-fin-${label}@pedrarioja.test`;
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

async function createAgreement(companyId: string, propId: string | null, lender: string) {
  const { data, error } = await admin
    .from("financing_agreements")
    .insert({
      company_id: companyId,
      property_id: propId,
      type: "mortgage",
      lender,
      principal: 120000,
      currency: "EUR",
      start_date: "2026-01-10",
      term_months: 12,
      rate_type: "euribor_spread",
      index_name: "Euribor",
      index_tenor: "6M",
      spread: 1.2,
      repayment_type: "annuity",
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`createAgreement: ${error.message}`);
  return data!.id as string;
}

function rowsFrom(firstDueDate: string, termMonths: number, ratePct: number, principal = 120000) {
  return generateSchedule({
    principal,
    annualRatePct: ratePct,
    termMonths,
    firstDueDate,
    repaymentType: "annuity",
    monthlyCommission: 4,
    vatRatePct: 23,
  });
}

async function applySchedule(
  client: SupabaseClient,
  agreement: string,
  effectiveFrom: string,
  reason: string,
  rows: unknown,
) {
  return client.rpc("apply_financing_schedule", {
    _agreement_id: agreement,
    _effective_from: effectiveFrom,
    _reason: reason,
    _rows: rows as never,
  });
}

async function liveRows(agreement: string) {
  const { data, error } = await admin
    .from("financing_schedule_rows")
    .select("id, period_no, due_date, status, total_payment, superseded_at, version_id")
    .eq("company_id", company.id)
    .is("superseded_at", null)
    .order("due_date");
  if (error) throw new Error(error.message);
  const versionIds = await versionIdsFor(agreement);
  return (data ?? []).filter((r) => versionIds.includes(r.version_id));
}

async function versionIdsFor(agreement: string) {
  const { data } = await admin
    .from("financing_schedule_versions")
    .select("id")
    .eq("agreement_id", agreement);
  return (data ?? []).map((v) => v.id as string);
}

beforeAll(async () => {
  company = await createTestCompany("financing");
  otherCompany = await createTestCompany("financing-other");

  const { property } = await createPropertyLikeServerFn(company.id, {
    name: "QA Financing Asset",
    purchasePrice: 150000,
    acquisition_date: "2025-12-01",
  });
  propertyId = property.id;

  const other = await createPropertyLikeServerFn(otherCompany.id, { name: "QA Other Asset" });

  agreementId = await createAgreement(company.id, propertyId, "QA Bank");
  otherAgreementId = await createAgreement(otherCompany.id, other.property.id, "Other Bank");

  clients.owner = await createRoleUser("owner", "owner", company.id);
  clients.manager = await createRoleUser("manager", "manager", company.id);
  clients.bookkeeper = await createRoleUser("bookkeeper", "bookkeeper", company.id);
  clients.viewer = await createRoleUser("viewer", "viewer", company.id);
}, 120_000);

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(otherCompany);
});

describe("financing schedule versioning", () => {
  it("creates version 1 with every instalment from the origination schedule", async () => {
    const rows = rowsFrom("2026-02-10", 12, 3.6);
    const { data: versionId, error } = await applySchedule(
      clients.owner,
      agreementId,
      "2026-02-10",
      "origination",
      rows,
    );
    expect(error).toBeNull();
    expect(versionId).toBeTruthy();

    const live = await liveRows(agreementId);
    expect(live).toHaveLength(12);
    expect(live.every((r) => r.status === "scheduled")).toBe(true);
  });

  it("syncs committed instalments into the projected cash-flow ledger", async () => {
    const { data, error } = await admin
      .from("cash_flow_entries")
      .select("id, direction, category, principal, interest, vat, commissions, amount_total, state")
      .eq("agreement_id", agreementId);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(12);
    const first = data![0];
    expect(first.direction).toBe("outflow");
    expect(Number(first.amount_total)).toBeGreaterThan(0);
    expect(
      Math.abs(
        Number(first.amount_total) -
          (Number(first.principal) +
            Number(first.interest) +
            Number(first.vat) +
            Number(first.commissions) +
            Number((first as unknown as { insurance?: number }).insurance ?? 0)),
      ),
    ).toBeLessThan(0.05);
  });

  it("keeps settled and reconciled instalments immutable", async () => {
    const live = await liveRows(agreementId);
    const target = live[0];
    const settle = await admin
      .from("financing_schedule_rows")
      .update({ status: "settled", settled_on: "2026-02-10", settled_amount: target.total_payment })
      .eq("id", target.id);
    expect(settle.error).toBeNull();

    const amend = await admin
      .from("financing_schedule_rows")
      .update({ total_payment: 1 })
      .eq("id", target.id);
    expect(amend.error).not.toBeNull();

    const remove = await admin.from("financing_schedule_rows").delete().eq("id", target.id);
    expect(remove.error).not.toBeNull();
  });

  it("replaces only future unreconciled projections from the effective date", async () => {
    const before = await liveRows(agreementId);
    const settled = before.filter((r) => r.status === "settled");
    expect(settled.length).toBeGreaterThan(0);

    const revised = rowsFrom("2026-06-10", 8, 5.4, 90000);
    const { error } = await applySchedule(
      clients.manager,
      agreementId,
      "2026-06-10",
      "rate_reset",
      revised,
    );
    expect(error).toBeNull();

    const after = await liveRows(agreementId);
    // Settled instalments survive untouched.
    for (const row of settled) {
      const kept = after.find((r) => r.id === row.id);
      expect(kept).toBeTruthy();
      expect(Number(kept!.total_payment)).toBe(Number(row.total_payment));
    }
    // Nothing on or after the effective date belongs to the old version.
    const oldFuture = before.filter((r) => r.due_date >= "2026-06-10" && r.status !== "settled");
    for (const row of oldFuture) {
      expect(after.find((r) => r.id === row.id)).toBeUndefined();
    }
    // Pre-effective-date scheduled rows are preserved as history.
    const earlier = before.filter((r) => r.due_date < "2026-06-10");
    for (const row of earlier) {
      expect(after.find((r) => r.id === row.id)).toBeTruthy();
    }
    expect(after.filter((r) => r.due_date >= "2026-06-10")).toHaveLength(8);
  });

  it("records a second version and marks the first as superseded", async () => {
    const { data } = await admin
      .from("financing_schedule_versions")
      .select("version_no, is_current, reason")
      .eq("agreement_id", agreementId)
      .order("version_no");
    expect(data).toHaveLength(2);
    expect(data![0].is_current).toBe(false);
    expect(data![1].is_current).toBe(true);
    expect(data![1].reason).toBe("rate_reset");
  });

  it("points the agreement at the current version", async () => {
    const { data } = await admin
      .from("financing_agreements")
      .select("current_version_id")
      .eq("id", agreementId)
      .single();
    const { data: current } = await admin
      .from("financing_schedule_versions")
      .select("id")
      .eq("agreement_id", agreementId)
      .eq("is_current", true)
      .single();
    expect(data!.current_version_id).toBe(current!.id);
  });
});

describe("duplicate import protection", () => {
  it("produces a stable fingerprint for identical row sets", () => {
    const a = rowsFrom("2026-02-10", 6, 3.6);
    const b = rowsFrom("2026-02-10", 6, 3.6);
    expect(scheduleFingerprint(a)).toBe(scheduleFingerprint(b));
    expect(scheduleFingerprint(a)).not.toBe(scheduleFingerprint(rowsFrom("2026-02-10", 6, 4.1)));
  });

  it("rejects a second import with the same fingerprint for the same agreement", async () => {
    const rows = rowsFrom("2027-02-10", 4, 3.6, 20000);
    const fingerprint = scheduleFingerprint(rows);
    const base = {
      company_id: company.id,
      agreement_id: agreementId,
      source: "csv",
      file_name: "dup.csv",
      effective_from: "2027-02-10",
      reason: "rate_reset",
      row_count: rows.length,
      content_hash: fingerprint,
      status: "committed",
    };
    const first = await admin.from("financing_schedule_imports").insert(base);
    expect(first.error).toBeNull();
    const second = await admin.from("financing_schedule_imports").insert(base);
    expect(second.error).not.toBeNull();
  });
});

describe("role permissions and company isolation", () => {
  it("lets owners and managers apply a schedule", async () => {
    const res = await applySchedule(
      clients.owner,
      agreementId,
      "2027-06-10",
      "rate_reset",
      rowsFrom("2027-06-10", 3, 4.0, 30000),
    );
    expect(res.error).toBeNull();
  });

  it("blocks bookkeepers and viewers from applying a schedule", async () => {
    for (const role of ["bookkeeper", "viewer"]) {
      const res = await applySchedule(
        clients[role],
        agreementId,
        "2027-09-10",
        "rate_reset",
        rowsFrom("2027-09-10", 3, 4.0, 30000),
      );
      expect(res.error, `${role} must not apply schedules`).not.toBeNull();
    }
  });

  it("lets bookkeepers settle an instalment but keeps viewers read-only", async () => {
    const live = await liveRows(agreementId);
    const open = live.find((r) => r.status === "scheduled")!;

    const viewerWrite = await clients.viewer
      .from("financing_schedule_rows")
      .update({ status: "settled" })
      .eq("id", open.id)
      .select("id");
    expect(viewerWrite.data ?? []).toHaveLength(0);

    const bookkeeperWrite = await clients.bookkeeper
      .from("financing_schedule_rows")
      .update({ status: "settled", settled_on: "2027-06-10" })
      .eq("id", open.id)
      .select("id");
    expect(bookkeeperWrite.error).toBeNull();
    expect(bookkeeperWrite.data ?? []).toHaveLength(1);
  });

  it("keeps every role read-only across companies", async () => {
    for (const role of Object.keys(clients)) {
      const { data } = await clients[role]
        .from("financing_agreements")
        .select("id")
        .eq("id", otherAgreementId);
      expect(data ?? [], `${role} must not read another company's agreement`).toHaveLength(0);
    }
    const cross = await applySchedule(
      clients.owner,
      otherAgreementId,
      "2026-02-10",
      "origination",
      rowsFrom("2026-02-10", 3, 3.6),
    );
    expect(cross.error).not.toBeNull();
  });

  it("exposes the current schedule and cash-flow views to viewers of the same company", async () => {
    const schedule = await clients.viewer
      .from("v_financing_schedule_current")
      .select("id")
      .eq("agreement_id", agreementId);
    expect(schedule.error).toBeNull();
    expect((schedule.data ?? []).length).toBeGreaterThan(0);

    const cash = await clients.viewer
      .from("v_cash_flow_projection")
      .select("month")
      .eq("agreement_id", agreementId);
    expect(cash.error).toBeNull();
  });
});
