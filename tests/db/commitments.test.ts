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
  sqlRows,
  userClient,
} from "../support/client";
import { createTestCompany, dropTestCompany, type TestCompany } from "../support/fixtures";

/**
 * Phase 8A — commitment domain.
 *
 * The commitment is the canonical owner of expected expenditure (§5C.1).
 * Cash flow only ever projects approved, active commitment schedule lines
 * (§5C.2), drawdowns consume commitments without touching bookkeeping values
 * (§5C.3), and schedule history is immutable (§5C.4).
 */

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const MANAGE_ROLES: Role[] = ["owner", "manager"];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
const APPROVE_ROLES: Role[] = ["owner", "manager", "approver"];
const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let other: TestCompany;
let counterpartyId: string;
let projectId: string;
let projectDimensionId: string;
const clients = {} as Record<Role, SupabaseClient>;
const userIds = {} as Record<Role, string>;

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

async function createRoleUser(role: Role, companyId: string) {
  const email = `qa-cm-${role}@pedrarioja.test`;
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
  userIds[role] = user.id;
  return userClient(session.access_token);
}

type Args = Record<string, unknown>;
function rpc<T = unknown>(role: Role, fn: string, args: Args) {
  return clients[role].rpc(fn, args) as unknown as Promise<{ data: T; error: unknown }>;
}

async function draft(
  role: Role = "manager",
  overrides: Args = {},
  companyId = company.id,
): Promise<string> {
  const res = await rpc<string>(role, "create_commitment_draft", {
    _company_id: companyId,
    _title: `Commitment ${Math.random().toString(36).slice(2, 8)}`,
    _commitment_type: "capex_contract",
    _authorised_amount: 100_000,
    _counterparty_id: counterpartyId,
    ...overrides,
  });
  expectNoError(res, "create commitment draft");
  return res.data;
}

/** Draft → pending → approved → active, with a distinct requester and approver. */
async function activeCommitment(amount = 100_000, overrides: Args = {}) {
  const id = await draft("manager", { _authorised_amount: amount, ...overrides });
  expectNoError(
    await rpc("manager", "request_commitment_approval", { _commitment_id: id, _reason: "budgeted" }),
    "request approval",
  );
  expectNoError(
    await rpc("approver", "approve_commitment", { _commitment_id: id, _comment: "ok" }),
    "approve",
  );
  expectNoError(await rpc("manager", "activate_commitment", { _commitment_id: id }), "activate");
  return id;
}

async function scheduleVersion(
  commitmentId: string,
  lines: { expected_date: string; amount: number; line_type?: string }[],
  effectiveFrom: string,
  extra: Args = {},
) {
  const res = await rpc<string>("manager", "create_commitment_schedule_version", {
    _commitment_id: commitmentId,
    _effective_from: effectiveFrom,
    _lines: lines,
    _schedule_type: "milestone",
    ...extra,
  });
  expectNoError(res, "create schedule version");
  return res.data;
}

async function makeDocument(gross: number, companyId = company.id) {
  const doc = await admin
    .from("financial_documents")
    .insert({
      company_id: companyId,
      direction: "inbound",
      doc_type: "invoice",
      issue_date: "2026-03-01",
      counterparty_id: companyId === company.id ? counterpartyId : null,
    })
    .select("id")
    .single();
  expectNoError(doc, "insert document");
  const line = await admin.from("financial_document_lines").insert({
    company_id: companyId,
    document_id: doc.data!.id,
    line_no: 1,
    description: "Works",
    quantity: 1,
    unit_price: gross,
    vat_rate: 0,
  });
  expectNoError(line, "insert document line");
  return doc.data!.id as string;
}

/**
 * Freezes a schedule line the way invoicing, settlement or reconciliation does.
 * The guard trigger refuses direct writes, so this goes through psql with the
 * same internal flag the server functions set.
 */
function freezeLine(versionId: string, expectedDate: string, status: string) {
  sqlRows(
    `select set_config('pedra.commitment_fn','on',false);` +
      ` update public.commitment_schedule_lines set status = '${status}'` +
      ` where version_id = '${versionId}' and expected_date = '${expectedDate}';` +
      ` select set_config('pedra.commitment_fn','off',false);`,
  );
}

async function commitmentRow(id: string) {
  const res = await admin.from("commitments").select("*").eq("id", id).single();
  expectNoError(res, "reload commitment");
  return res.data!;
}

async function summary(id: string) {
  const res = await admin.from("v_commitment_summary").select("*").eq("commitment_id", id).single();
  expectNoError(res, "commitment summary");
  return res.data!;
}

async function projections(commitmentId: string) {
  const lines = await admin
    .from("commitment_schedule_lines")
    .select("id")
    .eq("commitment_id", commitmentId);
  const ids = (lines.data ?? []).map((l) => l.id);
  if (ids.length === 0) return [];
  const res = await admin
    .from("cash_flow_entries")
    .select("*")
    .eq("source_type", "commitment_schedule_line")
    .in("source_id", ids);
  expectNoError(res, "load projections");
  return res.data!;
}

beforeAll(async () => {
  company = await createTestCompany("commitments");
  other = await createTestCompany("commitments-other");

  const cp = await admin
    .from("counterparties")
    .insert({ company_id: company.id, name: "QA Contractor", counterparty_type: "supplier" })
    .select("id")
    .single();
  expectNoError(cp, "insert counterparty");
  counterpartyId = cp.data!.id;

  const property = await admin
    .from("properties")
    .insert({ company_id: company.id, name: "Commitment Asset", property_type: "apartment" })
    .select("id")
    .single();
  expectNoError(property, "insert property");

  const project = await admin
    .from("capex_projects")
    .insert({
      company_id: company.id,
      property_id: property.data!.id,
      name: "Roof renewal",
      budget_amount: 120_000,
      status: "in_progress",
    })
    .select("id")
    .single();
  expectNoError(project, "insert capex project");
  projectId = project.data!.id;

  const dim = await admin
    .from("dimensions")
    .select("id")
    .eq("company_id", company.id)
    .eq("code", "project")
    .single();
  expectNoError(dim, "load project dimension");
  projectDimensionId = dim.data!.id;

  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
}, 180_000);

afterAll(async () => {
  for (const role of ROLES) {
    const id = userIds[role];
    if (id) await authFetch(`/users/${id}`, { method: "DELETE" });
  }
  await dropTestCompany(company);
  await dropTestCompany(other);
});

/* ------------------------------------------------------------- access control */

describe("commitment access control", () => {
  it("denies anonymous reads of every Phase 8A table", async () => {
    const anon = anonClient();
    for (const table of [
      "commitments",
      "commitment_schedule_versions",
      "commitment_schedule_lines",
      "commitment_drawdowns",
      "approval_requests",
      "maintenance_jobs",
    ]) {
      const res = await anon.from(table).select("id").limit(1);
      expect(res.data ?? [], `${table} must not be readable anonymously`).toHaveLength(0);
    }
  });

  it("denies anonymous execution of the commitment server functions", async () => {
    const res = await anonClient().rpc("create_commitment_draft", {
      _company_id: company.id,
      _title: "Anonymous",
    });
    expect(res.error).not.toBeNull();
  });

  it.each(ROLES)("%s create-draft permission matches the capability matrix", async (role) => {
    const res = await rpc<string>(role, "create_commitment_draft", {
      _company_id: company.id,
      _title: `Draft by ${role}`,
      _authorised_amount: 1_000,
    });
    if (RECORD_ROLES.includes(role)) {
      expect(res.error, `${role} should be able to draft`).toBeNull();
      await admin.from("commitments").delete().eq("id", res.data);
    } else {
      expect(res.error, `${role} must not be able to draft`).not.toBeNull();
    }
  });

  it.each(ROLES)("%s approval authority matches the capability matrix", async (role) => {
    const id = await draft("assistant", { _authorised_amount: 5_000 });
    expectNoError(
      await rpc("assistant", "request_commitment_approval", { _commitment_id: id }),
      "request",
    );
    const res = await rpc(role, "approve_commitment", { _commitment_id: id, _comment: "x" });
    if (APPROVE_ROLES.includes(role)) {
      expect(res.error, `${role} should approve`).toBeNull();
    } else {
      expect(res.error, `${role} must not approve`).not.toBeNull();
    }
    await admin.from("commitments").delete().eq("id", id);
  });

  it.each(ROLES)("%s activation permission matches the manage capability", async (role) => {
    const id = await draft("assistant", { _authorised_amount: 5_000 });
    expectNoError(
      await rpc("assistant", "request_commitment_approval", { _commitment_id: id }),
      "request",
    );
    expectNoError(
      await rpc("approver", "approve_commitment", { _commitment_id: id, _comment: "ok" }),
      "approve",
    );
    const res = await rpc(role, "activate_commitment", { _commitment_id: id });
    if (MANAGE_ROLES.includes(role)) expect(res.error, `${role} should activate`).toBeNull();
    else expect(res.error, `${role} must not activate`).not.toBeNull();
    await admin.from("commitments").delete().eq("id", id);
  });

  it("enforces company isolation on writes", async () => {
    const res = await rpc("manager", "create_commitment_draft", {
      _company_id: other.id,
      _title: "Foreign draft",
      _authorised_amount: 1_000,
    });
    expect(res.error, "a user cannot write into another company").not.toBeNull();
  });

  it("refuses a draft in a company the user has no role in", async () => {
    const res = await rpc("manager", "create_commitment_draft", {
      _company_id: other.id,
      _title: "Cross company",
    });
    expect(res.error).not.toBeNull();
  });

  it("hides another company's commitments from the register", async () => {
    const foreign = await admin
      .from("commitments")
      .insert({ company_id: other.id, title: "Foreign", authorised_amount: 10 })
      .select("id")
      .single();
    expectNoError(foreign, "insert foreign commitment");
    const visible = await clients.owner.from("commitments").select("id").eq("id", foreign.data!.id);
    expect(visible.data ?? []).toHaveLength(0);
  });

  it("blocks direct row writes that bypass the server functions", async () => {
    const id = await draft();
    const res = await clients.manager.from("commitments").update({ status: "active" }).eq("id", id);
    expect(res.error, "direct lifecycle regression must be blocked").not.toBeNull();
  });
});

/* ------------------------------------------------------------------ lifecycle */

describe("commitment lifecycle", () => {
  it("creates a draft with no approval and no committed cash flow", async () => {
    const id = await draft();
    const row = await commitmentRow(id);
    expect(row.status).toBe("draft");
    expect(row.approval_status).toBe("not_requested");
    expect(await projections(id)).toHaveLength(0);
  });

  it("allows draft edits and blocks edits once approved", async () => {
    const id = await draft();
    expectNoError(
      await rpc("manager", "update_commitment_draft", {
        _commitment_id: id,
        _title: "Renamed draft",
        _authorised_amount: 90_000,
      }),
      "update draft",
    );
    expect((await commitmentRow(id)).authorised_amount).toBe(90_000);

    expectNoError(
      await rpc("manager", "request_commitment_approval", { _commitment_id: id }),
      "request",
    );
    expectNoError(
      await rpc("approver", "approve_commitment", { _commitment_id: id, _comment: "ok" }),
      "approve",
    );
    const res = await rpc("manager", "update_commitment_draft", {
      _commitment_id: id,
      _title: "Too late",
    });
    expect(res.error, "an approved commitment is read-only").not.toBeNull();
  });

  it("records an approval request with requester and audit event", async () => {
    const id = await draft();
    const req = await rpc<string>("manager", "request_commitment_approval", {
      _commitment_id: id,
      _reason: "board approved",
    });
    expectNoError(req, "request approval");
    const row = await admin.from("approval_requests").select("*").eq("id", req.data).single();
    expect(row.data!.decision).toBe("pending");
    expect(row.data!.requested_by).toBe(userIds.manager);
    expect(row.data!.target_type).toBe("commitment");
    const events = await admin.from("approval_events").select("event").eq("request_id", req.data);
    expect(events.data!.map((e) => e.event)).toContain("requested");
  });

  it("blocks self-approval unless an explicit override reason is given", async () => {
    const id = await draft("owner");
    expectNoError(
      await rpc("owner", "request_commitment_approval", { _commitment_id: id }),
      "request",
    );
    const selfApprove = await rpc("owner", "approve_commitment", { _commitment_id: id });
    expect(selfApprove.error, "self-approval must be blocked").not.toBeNull();

    const overridden = await rpc("owner", "approve_commitment", {
      _commitment_id: id,
      _override_reason: "sole director, documented in board minute",
    });
    expect(overridden.error).toBeNull();
    const row = await commitmentRow(id);
    expect(row.approval_status).toBe("approved");
    expect(row.approval_override_reason).toContain("sole director");
  });

  it("treats a missing approval record as no approval", async () => {
    const id = await draft();
    await admin.from("commitments").update({ status: "pending_approval" }).eq("id", id);
    const res = await rpc("approver", "approve_commitment", { _commitment_id: id });
    expect(res.error, "no pending request means no approval").not.toBeNull();
  });

  it("rejects with a mandatory reason and refuses activation afterwards", async () => {
    const id = await draft();
    expectNoError(
      await rpc("manager", "request_commitment_approval", { _commitment_id: id }),
      "request",
    );
    const noReason = await rpc("approver", "reject_commitment", { _commitment_id: id, _reason: "" });
    expect(noReason.error).not.toBeNull();

    expectNoError(
      await rpc("approver", "reject_commitment", { _commitment_id: id, _reason: "over budget" }),
      "reject",
    );
    const row = await commitmentRow(id);
    expect(row.approval_status).toBe("rejected");
    const activate = await rpc("manager", "activate_commitment", { _commitment_id: id });
    expect(activate.error, "a rejected commitment cannot be activated").not.toBeNull();
  });

  it("refuses activation of an unapproved commitment", async () => {
    const id = await draft();
    const res = await rpc("manager", "activate_commitment", { _commitment_id: id });
    expect(res.error).not.toBeNull();
  });

  it("requires a reason to cancel and keeps the row (archive, not delete)", async () => {
    const id = await activeCommitment(20_000);
    const noReason = await rpc("manager", "cancel_commitment", { _commitment_id: id, _reason: "" });
    expect(noReason.error).not.toBeNull();

    expectNoError(
      await rpc("manager", "cancel_commitment", {
        _commitment_id: id,
        _reason: "contract terminated",
      }),
      "cancel",
    );
    const row = await commitmentRow(id);
    expect(row.status).toBe("cancelled");
    expect(row.cancellation_reason).toBe("contract terminated");
    expect(row.deleted_at).toBeNull();
  });

  it("completes an active commitment and forbids lifecycle regression", async () => {
    const id = await activeCommitment(15_000);
    expectNoError(
      await rpc("manager", "complete_commitment", { _commitment_id: id, _notes: "works done" }),
      "complete",
    );
    expect((await commitmentRow(id)).status).toBe("completed");
    const back = await clients.manager.from("commitments").update({ status: "draft" }).eq("id", id);
    expect(back.error).not.toBeNull();
  });

  it("never hard-deletes commitments from the client", async () => {
    const id = await draft();
    const res = await clients.owner.from("commitments").delete().eq("id", id);
    expect(res.error ?? (await commitmentRow(id))).toBeTruthy();
  });
});

/* --------------------------------------------------------------- schedules */

describe("commitment schedule versioning", () => {
  it("creates version 1 and validates the total against the authorised amount", async () => {
    const id = await activeCommitment(30_000);
    const v1 = await scheduleVersion(
      id,
      [
        { expected_date: "2026-06-01", amount: 10_000 },
        { expected_date: "2026-07-01", amount: 20_000 },
      ],
      "2026-06-01",
    );
    const check = await rpc<Record<string, unknown>>("manager", "validate_commitment_schedule", {
      _version_id: v1,
    });
    expectNoError(check, "validate schedule");
    expect(check.data.balanced).toBe(true);
    expect(Number(check.data.scheduled_total)).toBe(30_000);
  });

  it("refuses to activate an unbalanced schedule without an approved variance", async () => {
    const id = await activeCommitment(30_000);
    const v = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 45_000 }], "2026-06-01");
    const res = await rpc("manager", "activate_commitment_schedule_version", { _version_id: v });
    expect(res.error).not.toBeNull();
  });

  it("keeps exactly one active version and supersedes the previous one", async () => {
    const id = await activeCommitment(30_000);
    const v1 = await scheduleVersion(
      id,
      [
        { expected_date: "2026-06-01", amount: 10_000 },
        { expected_date: "2026-07-01", amount: 20_000 },
      ],
      "2026-06-01",
    );
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate v1",
    );
    const v2 = await scheduleVersion(
      id,
      [
        { expected_date: "2026-06-01", amount: 12_000 },
        { expected_date: "2026-08-01", amount: 18_000 },
      ],
      "2026-06-01",
      { _reason: "re-phased" },
    );
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v2 }),
      "activate v2",
    );

    const versions = await admin
      .from("commitment_schedule_versions")
      .select("id, status, is_current")
      .eq("commitment_id", id);
    expect(versions.data!.filter((v) => v.is_current)).toHaveLength(1);
    expect(versions.data!.find((v) => v.id === v1)!.status).toBe("superseded");
    expect(versions.data!.find((v) => v.id === v2)!.is_current).toBe(true);
  });

  it("retains every superseded version and line for audit", async () => {
    const id = await activeCommitment(20_000);
    const v1 = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 20_000 }], "2026-06-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate v1",
    );
    const v2 = await scheduleVersion(id, [{ expected_date: "2026-09-01", amount: 20_000 }], "2026-06-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v2 }),
      "activate v2",
    );
    const oldLines = await admin
      .from("commitment_schedule_lines")
      .select("id, status")
      .eq("version_id", v1);
    expect(oldLines.data).toHaveLength(1);
    expect(oldLines.data![0].status).toBe("superseded");
  });

  it("replaces only future projections and preserves earlier lines", async () => {
    const id = await activeCommitment(30_000);
    const v1 = await scheduleVersion(
      id,
      [
        { expected_date: "2026-01-15", amount: 10_000 },
        { expected_date: "2026-12-01", amount: 20_000 },
      ],
      "2026-01-01",
    );
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate v1",
    );
    // freeze the historical line the way invoicing and settlement would
    freezeLine(v1, "2026-01-15", "paid");

    const v2 = await scheduleVersion(
      id,
      [{ expected_date: "2026-12-01", amount: 20_000 }],
      "2026-06-01",
    );
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v2 }),
      "activate v2",
    );

    const kept = await admin
      .from("commitment_schedule_lines")
      .select("status")
      .eq("version_id", v1)
      .eq("expected_date", "2026-01-15")
      .single();
    expect(kept.data!.status, "a paid line must survive a revision").toBe("paid");
  });

  it("refuses a revision whose effective date overlaps invoiced, paid or reconciled lines", async () => {
    for (const frozen of ["invoiced", "paid", "reconciled"]) {
      const id = await activeCommitment(10_000);
      const v1 = await scheduleVersion(
        id,
        [{ expected_date: "2026-05-01", amount: 10_000 }],
        "2026-01-01",
      );
      expectNoError(
        await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
        "activate",
      );
      freezeLine(v1, "2026-05-01", frozen);
      const res = await rpc("manager", "create_commitment_schedule_version", {
        _commitment_id: id,
        _effective_from: "2026-01-01",
        _lines: [{ expected_date: "2026-05-01", amount: 12_000 }],
      });
      expect(res.error, `a ${frozen} line must block the revision`).not.toBeNull();
    }
  });

  it("blocks in-place edits of schedule lines outside the server functions", async () => {
    const id = await activeCommitment(10_000);
    const v1 = await scheduleVersion(id, [{ expected_date: "2026-05-01", amount: 10_000 }], "2026-01-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate",
    );
    const res = await clients.manager
      .from("commitment_schedule_lines")
      .update({ amount: 99_999 })
      .eq("version_id", v1);
    expect(res.error).not.toBeNull();
  });

  it("requires an approved variance for a material replacement", async () => {
    const id = await activeCommitment(10_000);
    const v1 = await scheduleVersion(id, [{ expected_date: "2026-05-01", amount: 10_000 }], "2026-01-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate v1",
    );
    const v2 = await scheduleVersion(id, [{ expected_date: "2026-05-01", amount: 14_000 }], "2026-01-01");
    const blocked = await rpc("manager", "activate_commitment_schedule_version", { _version_id: v2 });
    expect(blocked.error, "an unapproved overrun must be blocked").not.toBeNull();

    const byRecorder = await rpc("bookkeeper", "approve_commitment_variance", {
      _version_id: v2,
      _reason: "agreed variation",
    });
    expect(byRecorder.error, "variance approval needs approval authority").not.toBeNull();

    expectNoError(
      await rpc("approver", "approve_commitment_variance", {
        _version_id: v2,
        _reason: "agreed variation order 3",
      }),
      "approve variance",
    );
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v2 }),
      "activate v2",
    );
    const s = await summary(id);
    expect(Number(s.approved_variance)).toBeCloseTo(4_000, 2);
    expect(Number(s.unapproved_variance)).toBe(0);
  });

  it("is idempotent when the same version is activated twice", async () => {
    const id = await activeCommitment(10_000);
    const v1 = await scheduleVersion(id, [{ expected_date: "2026-05-01", amount: 10_000 }], "2026-01-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate once",
    );
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate twice",
    );
    expect(await projections(id)).toHaveLength(1);
  });
});

/* --------------------------------------------------- committed cash flow */

describe("committed cash-flow projection", () => {
  it("creates exactly one included committed entry per eligible line", async () => {
    const id = await activeCommitment(30_000);
    const v1 = await scheduleVersion(
      id,
      [
        { expected_date: "2026-06-01", amount: 10_000 },
        { expected_date: "2026-07-01", amount: 20_000 },
      ],
      "2026-06-01",
    );
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate",
    );
    const entries = await projections(id);
    expect(entries).toHaveLength(2);
    for (const e of entries) {
      expect(e.state).toBe("committed");
      expect(e.is_included).toBe(true);
      expect(e.direction).toBe("outflow");
      expect(e.source_type).toBe("commitment_schedule_line");
      expect(e.is_manual).toBe(false);
    }
    expect(entries.reduce((s, e) => s + Number(e.amount_total), 0)).toBe(30_000);
  });

  it("creates no projection for an unapproved commitment", async () => {
    const id = await draft();
    const v = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 100_000 }], "2026-06-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v }),
      "activate",
    );
    expect(await projections(id)).toHaveLength(0);
  });

  it("synchronisation is idempotent", async () => {
    const id = await activeCommitment(10_000);
    const v = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 10_000 }], "2026-06-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v }),
      "activate",
    );
    for (let i = 0; i < 3; i++) {
      expectNoError(await rpc("manager", "sync_commitment_cash_flow", { _commitment_id: id }), "sync");
    }
    expect(await projections(id)).toHaveLength(1);
  });

  it("supersedes future projections when a new version becomes active", async () => {
    const id = await activeCommitment(10_000);
    const v1 = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 10_000 }], "2026-06-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate v1",
    );
    const v2 = await scheduleVersion(id, [{ expected_date: "2026-10-01", amount: 10_000 }], "2026-06-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v2 }),
      "activate v2",
    );
    const entries = await projections(id);
    expect(entries).toHaveLength(1);
    expect(entries[0].expected_date).toBe("2026-10-01");
  });

  it("withdraws projections when the commitment is cancelled", async () => {
    const id = await activeCommitment(10_000);
    const v = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 10_000 }], "2026-06-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v }),
      "activate",
    );
    expectNoError(
      await rpc("manager", "cancel_commitment", { _commitment_id: id, _reason: "cancelled" }),
      "cancel",
    );
    expect(await projections(id)).toHaveLength(0);
  });

  it("protects commitment-owned entries from direct cash-flow edits", async () => {
    const id = await activeCommitment(10_000);
    const v = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 10_000 }], "2026-06-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v }),
      "activate",
    );
    const entry = (await projections(id))[0];
    const res = await clients.manager
      .from("cash_flow_entries")
      .update({ amount_total: 1 })
      .eq("id", entry.id);
    expect(res.error, "source-owned projections are not editable").not.toBeNull();
    const del = await clients.manager.from("cash_flow_entries").delete().eq("id", entry.id);
    expect(del.error ?? (await projections(id)).length).toBeTruthy();
  });

  it("keeps a reconciled projection untouched when the schedule is revised", async () => {
    const id = await activeCommitment(10_000);
    const v1 = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 10_000 }], "2026-01-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v1 }),
      "activate v1",
    );
    const entry = (await projections(id))[0];
    await admin
      .from("cash_flow_entries")
      .update({ reconciliation_state: "reconciled" })
      .eq("id", entry.id);
    expectNoError(await rpc("manager", "sync_commitment_cash_flow", { _commitment_id: id }), "sync");
    const still = await admin.from("cash_flow_entries").select("id").eq("id", entry.id).maybeSingle();
    expect(still.data, "a reconciled projection is immutable").not.toBeNull();
  });
});

/* -------------------------------------------------------------- drawdowns */

describe("drawdowns and commitment consumption", () => {
  it("records a partial drawdown and derives remaining commitment", async () => {
    const id = await activeCommitment(50_000);
    const doc = await makeDocument(20_000);
    expectNoError(
      await rpc("bookkeeper", "create_commitment_drawdown", {
        _commitment_id: id,
        _document_id: doc,
        _amount: 20_000,
      }),
      "drawdown",
    );
    const s = await summary(id);
    expect(Number(s.invoiced_amount)).toBe(20_000);
    expect(Number(s.remaining_commitment)).toBe(30_000);
    expect(Number(s.available_drawdown)).toBe(30_000);
  });

  it("allows one commitment to be consumed by several documents", async () => {
    const id = await activeCommitment(50_000);
    const a = await makeDocument(20_000);
    const b = await makeDocument(15_000);
    for (const [doc, amount] of [
      [a, 20_000],
      [b, 15_000],
    ] as const) {
      expectNoError(
        await rpc("manager", "create_commitment_drawdown", {
          _commitment_id: id,
          _document_id: doc,
          _amount: amount,
        }),
        "drawdown",
      );
    }
    expect(Number((await summary(id)).invoiced_amount)).toBe(35_000);
  });

  it("allows one document to be allocated across several commitments", async () => {
    const first = await activeCommitment(10_000);
    const second = await activeCommitment(10_000);
    const doc = await makeDocument(15_000);
    for (const id of [first, second]) {
      expectNoError(
        await rpc("manager", "create_commitment_drawdown", {
          _commitment_id: id,
          _document_id: doc,
          _amount: 7_500,
        }),
        "drawdown",
      );
    }
    expect(Number((await summary(first)).invoiced_amount)).toBe(7_500);
    expect(Number((await summary(second)).invoiced_amount)).toBe(7_500);
  });

  it("never allocates more than the document total", async () => {
    const id = await activeCommitment(50_000);
    const doc = await makeDocument(10_000);
    const res = await rpc("manager", "create_commitment_drawdown", {
      _commitment_id: id,
      _document_id: doc,
      _amount: 12_000,
    });
    expect(res.error).not.toBeNull();
  });

  it("prevents over-commitment unless an approved variance exists", async () => {
    const id = await activeCommitment(10_000);
    const doc = await makeDocument(14_000);
    const blocked = await rpc("manager", "create_commitment_drawdown", {
      _commitment_id: id,
      _document_id: doc,
      _amount: 14_000,
    });
    expect(blocked.error, "over-commitment must be blocked").not.toBeNull();

    const v = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 14_000 }], "2026-01-01");
    expectNoError(
      await rpc("approver", "approve_commitment_variance", {
        _version_id: v,
        _reason: "variation order",
      }),
      "approve variance",
    );
    expectNoError(
      await rpc("manager", "create_commitment_drawdown", {
        _commitment_id: id,
        _document_id: doc,
        _amount: 14_000,
      }),
      "drawdown after variance",
    );
  });

  it("never mutates document, VAT or payment values", async () => {
    const id = await activeCommitment(50_000);
    const doc = await makeDocument(20_000);
    const before = await admin.from("financial_documents").select("*").eq("id", doc).single();
    expectNoError(
      await rpc("manager", "create_commitment_drawdown", {
        _commitment_id: id,
        _document_id: doc,
        _amount: 20_000,
      }),
      "drawdown",
    );
    const after = await admin.from("financial_documents").select("*").eq("id", doc).single();
    expect(after.data!.gross_amount).toBe(before.data!.gross_amount);
    expect(after.data!.vat_amount).toBe(before.data!.vat_amount);
    expect(after.data!.paid_amount).toBe(before.data!.paid_amount);
    expect(after.data!.payment_state).toBe(before.data!.payment_state);
  });

  it("reverses with a reason and preserves the original allocation lineage", async () => {
    const id = await activeCommitment(50_000);
    const doc = await makeDocument(20_000);
    const dd = await rpc<string>("manager", "create_commitment_drawdown", {
      _commitment_id: id,
      _document_id: doc,
      _amount: 20_000,
    });
    expectNoError(dd, "drawdown");

    const noReason = await rpc("manager", "reverse_commitment_drawdown", {
      _drawdown_id: dd.data,
      _reason: "",
    });
    expect(noReason.error).not.toBeNull();

    const rev = await rpc<string>("manager", "reverse_commitment_drawdown", {
      _drawdown_id: dd.data,
      _reason: "credit note issued",
    });
    expectNoError(rev, "reverse");

    const rows = await admin.from("commitment_drawdowns").select("*").eq("commitment_id", id);
    const original = rows.data!.find((r) => r.id === dd.data)!;
    const reversal = rows.data!.find((r) => r.id === rev.data)!;
    expect(original.status).toBe("reversed");
    expect(original.reversal_reason).toBe("credit note issued");
    expect(reversal.reverses_drawdown_id).toBe(original.id);
    expect(Number((await summary(id)).invoiced_amount)).toBe(0);
  });

  it("cannot reverse the same drawdown twice", async () => {
    const id = await activeCommitment(50_000);
    const doc = await makeDocument(10_000);
    const dd = await rpc<string>("manager", "create_commitment_drawdown", {
      _commitment_id: id,
      _document_id: doc,
      _amount: 10_000,
    });
    expectNoError(
      await rpc("manager", "reverse_commitment_drawdown", { _drawdown_id: dd.data, _reason: "x1" }),
      "reverse",
    );
    const again = await rpc("manager", "reverse_commitment_drawdown", {
      _drawdown_id: dd.data,
      _reason: "x2",
    });
    expect(again.error).not.toBeNull();
  });

  it("refuses a drawdown against another company's document", async () => {
    const id = await activeCommitment(50_000);
    const foreignDoc = await makeDocument(5_000, other.id);
    const res = await rpc("manager", "create_commitment_drawdown", {
      _commitment_id: id,
      _document_id: foreignDoc,
      _amount: 1_000,
    });
    expect(res.error).not.toBeNull();
  });

  it("refuses a drawdown against a draft commitment", async () => {
    const id = await draft();
    const doc = await makeDocument(5_000);
    const res = await rpc("manager", "create_commitment_drawdown", {
      _commitment_id: id,
      _document_id: doc,
      _amount: 1_000,
    });
    expect(res.error).not.toBeNull();
  });

  it("derives paid amount from document settlement, not from the drawdown", async () => {
    const id = await activeCommitment(50_000);
    const doc = await makeDocument(20_000);
    expectNoError(
      await rpc("manager", "create_commitment_drawdown", {
        _commitment_id: id,
        _document_id: doc,
        _amount: 20_000,
      }),
      "drawdown",
    );
    expect(Number((await summary(id)).paid_amount)).toBe(0);
    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc);
    const pay = await admin.from("financial_payments").insert({
      company_id: company.id,
      document_id: doc,
      payment_date: "2026-03-20",
      amount: 10_000,
    });
    expectNoError(pay, "record payment");
    expect(Number((await summary(id)).paid_amount)).toBeCloseTo(10_000, 2);
  });

  it("handles concurrent drawdowns without exceeding capacity", async () => {
    const id = await activeCommitment(10_000);
    const docs = await Promise.all([makeDocument(8_000), makeDocument(8_000)]);
    const results = await Promise.all(
      docs.map((doc) =>
        rpc("manager", "create_commitment_drawdown", {
          _commitment_id: id,
          _document_id: doc,
          _amount: 8_000,
        }),
      ),
    );
    const ok = results.filter((r) => !r.error).length;
    expect(ok, "only one of two competing drawdowns may succeed").toBe(1);
    expect(Number((await summary(id)).invoiced_amount)).toBeLessThanOrEqual(10_000);
  });
});

/* ----------------------------------------------------- capex + maintenance */

describe("capex and maintenance ownership", () => {
  async function attributeToProject(commitmentId: string) {
    // capex projects already publish themselves as a dimension value
    const value = await admin
      .from("dimension_values")
      .select("id")
      .eq("dimension_id", projectDimensionId)
      .eq("entity_id", projectId)
      .single();
    expectNoError(value, "load project dimension value");
    const link = await admin.from("transaction_dimensions").insert({
      company_id: company.id,
      source_type: "commitment",
      source_id: commitmentId,
      dimension_id: projectDimensionId,
      dimension_value_id: value.data!.id,
      is_primary: true,
    });
    expectNoError(link, "link dimension");
  }

  it("derives the capex summary from commitments, documents and payments", async () => {
    const id = await activeCommitment(60_000, { _commitment_type: "capex_contract" });
    await attributeToProject(id);
    const v = await scheduleVersion(id, [{ expected_date: "2026-06-01", amount: 60_000 }], "2026-01-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v }),
      "activate",
    );
    const doc = await makeDocument(25_000);
    expectNoError(
      await rpc("manager", "create_commitment_drawdown", {
        _commitment_id: id,
        _document_id: doc,
        _amount: 25_000,
      }),
      "drawdown",
    );

    const row = await admin
      .from("v_capex_summary")
      .select("*")
      .eq("project_id", projectId)
      .single();
    expectNoError(row, "capex summary");
    expect(Number(row.data!.budget_amount)).toBe(120_000);
    expect(Number(row.data!.approved_commitments)).toBeGreaterThanOrEqual(60_000);
    expect(Number(row.data!.active_commitments)).toBeGreaterThanOrEqual(60_000);
    expect(Number(row.data!.invoiced_amount)).toBeGreaterThanOrEqual(25_000);
    expect(row.data!).toHaveProperty("paid_amount");
    expect(row.data!).toHaveProperty("remaining_budget");
    expect(row.data!).toHaveProperty("commitment_variance");
    expect(row.data!).toHaveProperty("invoice_variance");
  });

  it("keeps capex projects free of stored expenditure totals", async () => {
    const cols = await admin.from("capex_projects").select("*").eq("id", projectId).single();
    expectNoError(cols, "load project");
    for (const forbidden of ["invoiced_amount", "paid_amount", "committed_amount", "actual_amount"]) {
      expect(Object.keys(cols.data!), `capex must not store ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("creates a maintenance job that owns no financial values", async () => {
    const job = await rpc<string>("assistant", "create_maintenance_job", {
      _company_id: company.id,
      _title: "Replace boiler",
      _priority: "high",
      _target_date: "2026-08-01",
    });
    expectNoError(job, "create maintenance job");
    const row = await admin.from("maintenance_jobs").select("*").eq("id", job.data).single();
    expectNoError(row, "load job");
    for (const forbidden of [
      "expected_cost",
      "committed_amount",
      "invoice_amount",
      "paid_amount",
      "bank_amount",
      "amount",
    ]) {
      expect(Object.keys(row.data!), `maintenance must not own ${forbidden}`).not.toContain(forbidden);
    }
    expect(row.data!.status).toBe("requested");
  });

  it("takes maintenance expected cost only from a linked commitment", async () => {
    const id = await activeCommitment(4_000, { _commitment_type: "maintenance" });
    const v = await scheduleVersion(id, [{ expected_date: "2026-09-01", amount: 4_000 }], "2026-01-01");
    expectNoError(
      await rpc("manager", "activate_commitment_schedule_version", { _version_id: v }),
      "activate",
    );
    const job = await rpc<string>("manager", "create_maintenance_job", {
      _company_id: company.id,
      _title: "Lift service",
      _commitment_id: id,
    });
    expectNoError(job, "create job");
    const row = await admin
      .from("v_maintenance_job_summary")
      .select("*")
      .eq("job_id", job.data)
      .single();
    expectNoError(row, "maintenance summary");
    expect(Number(row.data!.committed_amount)).toBe(4_000);
  });

  it("gives a maintenance job without a commitment no cash-flow effect", async () => {
    const job = await rpc<string>("manager", "create_maintenance_job", {
      _company_id: company.id,
      _title: "Gutter inspection",
    });
    expectNoError(job, "create job");
    const row = await admin
      .from("v_maintenance_job_summary")
      .select("*")
      .eq("job_id", job.data)
      .single();
    expect(Number(row.data!.committed_amount ?? 0)).toBe(0);
  });

  it.each(ROLES)("%s maintenance write permission matches the record capability", async (role) => {
    const res = await rpc<string>(role, "create_maintenance_job", {
      _company_id: company.id,
      _title: `Job by ${role}`,
    });
    if (RECORD_ROLES.includes(role)) {
      expect(res.error).toBeNull();
      await admin.from("maintenance_jobs").delete().eq("id", res.data);
    } else {
      expect(res.error).not.toBeNull();
    }
  });

  it("archives maintenance jobs instead of deleting them", async () => {
    const job = await rpc<string>("manager", "create_maintenance_job", {
      _company_id: company.id,
      _title: "Archivable",
    });
    expectNoError(
      await rpc("manager", "update_maintenance_job", {
        _job_id: job.data,
        _status: "cancelled",
        _cancellation_reason: "no longer required",
      }),
      "cancel job",
    );
    const row = await admin.from("maintenance_jobs").select("*").eq("id", job.data).single();
    expect(row.data!.status).toBe("cancelled");
    expect(row.data!.deleted_at).toBeNull();
  });
});

/* -------------------------------------------------------------- evidence */

describe("evidence and audit", () => {
  it("links evidence through the shared documents model", async () => {
    const id = await draft();
    const doc = await admin
      .from("documents")
      .insert({
        company_id: company.id,
        title: "Signed contract",
        category: "legal",
      })
      .select("id")
      .single();
    expectNoError(doc, "insert document metadata");
    const link = await admin.from("document_links").insert({
      company_id: company.id,
      document_id: doc.data!.id,
      entity_type: "commitment",
      entity_id: id,
      relation: "primary",
    });
    expectNoError(link, "link evidence");
    const read = await clients.viewer
      .from("document_links")
      .select("document_id")
      .eq("entity_id", id);
    expect(read.data).toHaveLength(1);
  });

  it("writes an audit row for every lifecycle transition", async () => {
    const id = await activeCommitment(5_000);
    const audit = await admin
      .from("audit_log")
      .select("id, action")
      .eq("entity_id", id)
      .eq("entity_type", "commitments");
    expectNoError(audit, "load audit rows");
    expect(audit.data!.length).toBeGreaterThanOrEqual(3);
  });
});
