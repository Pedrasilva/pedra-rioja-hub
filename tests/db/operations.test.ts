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
 * Phase 8B — operational obligations, service contracts, insurance, utilities
 * and tax schedules.
 *
 * The operational layer owns the work, the dates and the paperwork. It owns no
 * money: every financial figure it shows is read from the linked commitment
 * through the derived summary views (§5C.1), and no operational action may
 * create cash flow, bookkeeping or banking rows (§5C.2, §5D).
 */

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const VIEW_ROLES: Role[] = [...ROLES];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
const MANAGE_ROLES: Role[] = ["owner", "manager"];
const PASSWORD = "QaPedraRioja!2026";

const ENTITY_TABLES: Record<string, string> = {
  operational_obligation: "operational_obligations",
  service_contract: "service_contracts",
  insurance_policy: "insurance_policies",
  utility_contract: "utility_contracts",
  tax_schedule: "tax_schedules",
};

let company: TestCompany;
let other: TestCompany;
let counterpartyId: string;
let otherCounterpartyId: string;
let propertyId: string;
let otherCommitmentId: string;
let otherOwner: SupabaseClient;
const clients = {} as Record<Role, SupabaseClient>;
const userIds = {} as Record<Role, string>;

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

async function createRoleUser(role: Role, companyId: string, prefix = "op") {
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
  userIds[role] = user.id;
  return userClient(session.access_token);
}

type Args = Record<string, unknown>;
function rpc<T = unknown>(role: Role, fn: string, args: Args) {
  return clients[role].rpc(fn, args) as unknown as Promise<{ data: T; error: { message: string } | null }>;
}

/* ------------------------------------------------------ domain factories */

let seq = 0;
const uniq = (label: string) => `${label} ${Date.now()}-${++seq}`;

async function makeObligation(role: Role = "manager", overrides: Args = {}) {
  const res = await rpc<string>(role, "create_operational_obligation", {
    _company_id: company.id,
    _obligation_type: "statutory_compliance",
    _title: uniq("Obligation"),
    _priority: "medium",
    _due_date: "2027-03-31",
    ...overrides,
  });
  expectNoError(res, "create obligation");
  return res.data;
}

async function makeServiceContract(role: Role = "manager", overrides: Args = {}) {
  const res = await rpc<string>(role, "create_service_contract", {
    _company_id: company.id,
    _title: uniq("Service contract"),
    _service_type: "cleaning",
    ...overrides,
  });
  expectNoError(res, "create service contract");
  return res.data;
}

async function makeInsurance(role: Role = "manager", overrides: Args = {}) {
  const res = await rpc<string>(role, "create_insurance_policy", {
    _company_id: company.id,
    _title: uniq("Policy"),
    _policy_type: "buildings",
    ...overrides,
  });
  expectNoError(res, "create insurance policy");
  return res.data;
}

async function makeUtility(role: Role = "manager", overrides: Args = {}) {
  const res = await rpc<string>(role, "create_utility_contract", {
    _company_id: company.id,
    _title: uniq("Utility"),
    _utility_type: "electricity",
    ...overrides,
  });
  expectNoError(res, "create utility contract");
  return res.data;
}

async function makeTaxSchedule(role: Role = "manager", overrides: Args = {}) {
  const res = await rpc<string>(role, "create_tax_schedule", {
    _company_id: company.id,
    _title: uniq("Tax schedule"),
    _tax_type: "imi",
    _jurisdiction: "Lisboa",
    ...overrides,
  });
  expectNoError(res, "create tax schedule");
  return res.data;
}

const FACTORIES: Record<string, (role?: Role, overrides?: Args) => Promise<string>> = {
  operational_obligation: makeObligation,
  service_contract: makeServiceContract,
  insurance_policy: makeInsurance,
  utility_contract: makeUtility,
  tax_schedule: makeTaxSchedule,
};

async function row(entityType: string, id: string) {
  const res = await admin.from(ENTITY_TABLES[entityType]).select("*").eq("id", id).single();
  expectNoError(res, `reload ${entityType}`);
  return res.data as Record<string, unknown>;
}

async function draftCommitment(amount = 25_000, companyId = company.id, role: Role = "manager") {
  const res = await rpc<string>(role, "create_commitment_draft", {
    _company_id: companyId,
    _title: uniq("Commitment"),
    _commitment_type: "service_contract",
    _authorised_amount: amount,
  });
  expectNoError(res, "create commitment draft");
  return res.data;
}

/** Draft → pending → approved → active, requested and approved by different users. */
async function activeCommitment(amount = 25_000) {
  const id = await draftCommitment(amount);
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

async function commitmentProjections(commitmentId: string) {
  const lines = await admin
    .from("commitment_schedule_lines")
    .select("id")
    .eq("commitment_id", commitmentId);
  const ids = (lines.data ?? []).map((l) => l.id as string);
  if (ids.length === 0) return [];
  const res = await admin
    .from("cash_flow_entries")
    .select("*")
    .eq("source_type", "commitment_schedule_line")
    .in("source_id", ids);
  expectNoError(res, "load projections");
  return res.data ?? [];
}

async function countCompanyRows(table: string, companyId = company.id) {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

/* ---------------------------------------------------------------- setup */

beforeAll(async () => {
  company = await createTestCompany("operations");
  other = await createTestCompany("operations-other");

  const cp = await admin
    .from("counterparties")
    .insert({ company_id: company.id, name: "QA Facilities", counterparty_type: "supplier" })
    .select("id")
    .single();
  expectNoError(cp, "insert counterparty");
  counterpartyId = cp.data!.id;

  const otherCp = await admin
    .from("counterparties")
    .insert({ company_id: other.id, name: "Foreign Supplier", counterparty_type: "supplier" })
    .select("id")
    .single();
  expectNoError(otherCp, "insert other counterparty");
  otherCounterpartyId = otherCp.data!.id;

  const property = await admin
    .from("properties")
    .insert({ company_id: company.id, name: "Operational Asset", property_type: "apartment" })
    .select("id")
    .single();
  expectNoError(property, "insert property");
  propertyId = property.data!.id;

  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
  otherOwner = await createRoleUser("owner", other.id, "op-other");

  const foreign = await admin
    .from("commitments")
    .insert({
      company_id: other.id,
      title: "Foreign commitment",
      commitment_type: "service_contract",
      authorised_amount: 10_000,
      currency: "EUR",
    })
    .select("id")
    .single();
  expectNoError(foreign, "insert foreign commitment");
  otherCommitmentId = foreign.data!.id;
}, 120_000);

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(other);
  for (const role of ROLES) await deleteUserByEmail(`qa-op-${role}@pedrarioja.test`);
  await deleteUserByEmail("qa-op-other-owner@pedrarioja.test");
}, 120_000);

/* ------------------------------------------- 1. security and tenancy */

describe("security and tenancy", () => {
  it("keeps every operational register scoped to its own company", async () => {
    await makeObligation();
    await makeServiceContract();
    await makeInsurance();
    await makeUtility();
    await makeTaxSchedule();

    for (const table of Object.values(ENTITY_TABLES)) {
      const mine = await clients.viewer.from(table).select("id, company_id");
      expectNoError(mine, `viewer reads ${table}`);
      expect(mine.data!.length).toBeGreaterThan(0);
      expect(mine.data!.every((r) => r.company_id === company.id)).toBe(true);

      const foreign = await otherOwner.from(table).select("id").eq("company_id", company.id);
      expectNoError(foreign, `foreign owner reads ${table}`);
      expect(foreign.data).toHaveLength(0);
    }
  });

  it("keeps the derived summary views scoped to the caller's company", async () => {
    const views = [
      "v_operational_obligation_summary",
      "v_service_contract_summary",
      "v_insurance_policy_summary",
      "v_utility_contract_summary",
      "v_tax_schedule_summary",
      "v_operational_reminders",
    ];
    for (const view of views) {
      const res = await otherOwner.from(view).select("company_id").eq("company_id", company.id);
      expectNoError(res, `foreign read of ${view}`);
      expect(res.data).toHaveLength(0);
    }
  });

  it("returns nothing to an anonymous client", async () => {
    const anon = anonClient();
    for (const table of [...Object.values(ENTITY_TABLES), "operational_reminders", "tax_schedule_dates"]) {
      const res = await anon.from(table).select("id");
      expect(res.data ?? []).toHaveLength(0);
    }
  });

  it("refuses privileged operational functions to an anonymous caller", async () => {
    const anon = anonClient();
    const res = await anon.rpc("create_operational_obligation", {
      _company_id: company.id,
      _obligation_type: "other",
      _title: "Anonymous obligation",
    });
    expect(res.error).toBeTruthy();
    expect(await countCompanyRows("operational_obligations")).toBeGreaterThan(0);
  });

  it("denies a caller with no role in the target company", async () => {
    const res = await otherOwner.rpc("create_operational_obligation", {
      _company_id: company.id,
      _obligation_type: "other",
      _title: "Cross-company obligation",
    });
    expect(res.error?.message ?? "").toMatch(/permission/i);
  });

  it("denies creation when the company context is missing", async () => {
    const res = await clients.manager.rpc("create_operational_obligation", {
      _company_id: null,
      _obligation_type: "other",
      _title: "No company",
    });
    expect(res.error).toBeTruthy();
  });

  it("applies the six-role matrix to every create function", async () => {
    const creators: [string, Args][] = [
      ["create_operational_obligation", { _company_id: company.id, _obligation_type: "other", _title: uniq("Role obligation") }],
      ["create_service_contract", { _company_id: company.id, _title: uniq("Role contract"), _service_type: "other" }],
      ["create_insurance_policy", { _company_id: company.id, _title: uniq("Role policy"), _policy_type: "other" }],
      ["create_utility_contract", { _company_id: company.id, _title: uniq("Role utility"), _utility_type: "other" }],
      ["create_tax_schedule", { _company_id: company.id, _title: uniq("Role tax"), _tax_type: "other" }],
    ];
    for (const [fn, args] of creators) {
      for (const role of ROLES) {
        const res = await rpc(role, fn, { ...args, _title: `${args._title} ${role}` });
        if (RECORD_ROLES.includes(role)) {
          expect(res.error, `${role} should be able to call ${fn}`).toBeNull();
        } else {
          expect(res.error?.message ?? "", `${role} must not call ${fn}`).toMatch(/permission/i);
        }
      }
    }
  });

  it("allows every role to read but only recording roles to write", async () => {
    const id = await makeObligation();
    for (const role of VIEW_ROLES) {
      const read = await clients[role]
        .from("v_operational_obligation_summary")
        .select("obligation_id")
        .eq("obligation_id", id);
      expectNoError(read, `${role} reads the obligation summary`);
      expect(read.data).toHaveLength(1);
    }
    const denied = await rpc("viewer", "update_operational_obligation", {
      _obligation_id: id,
      _title: "Viewer rename",
    });
    expect(denied.error?.message ?? "").toMatch(/permission/i);
    expect((await row("operational_obligation", id)).title).not.toBe("Viewer rename");
  });

  it("restricts archiving to managing roles", async () => {
    for (const role of ROLES) {
      const id = await makeObligation();
      const res = await rpc(role, "archive_operational_record", {
        _entity_type: "operational_obligation",
        _entity_id: id,
        _reason: `archived by ${role}`,
      });
      if (MANAGE_ROLES.includes(role)) {
        expect(res.error, `${role} should archive`).toBeNull();
        expect((await row("operational_obligation", id)).archived_at).not.toBeNull();
      } else {
        expect(res.error?.message ?? "", `${role} must not archive`).toMatch(/permission/i);
        expect((await row("operational_obligation", id)).archived_at).toBeNull();
      }
    }
  });

  it("refuses a direct row insert that names another company", async () => {
    const res = await clients.manager.from("operational_obligations").insert({
      company_id: other.id,
      obligation_type: "other",
      title: "Injected",
    });
    expect(res.error).toBeTruthy();
    expect(await countCompanyRows("operational_obligations", other.id)).toBe(0);
  });

  it("refuses a direct row insert from a role without the record capability", async () => {
    const res = await clients.viewer.from("service_contracts").insert({
      company_id: company.id,
      title: "Viewer contract",
      service_type: "other",
    });
    expect(res.error).toBeTruthy();
  });

  it("blocks cross-company commitment links at creation and at link time", async () => {
    const created = await rpc("manager", "create_service_contract", {
      _company_id: company.id,
      _title: uniq("Foreign linked"),
      _service_type: "other",
      _commitment_id: otherCommitmentId,
    });
    expect(created.error?.message ?? "").toMatch(/another company/i);

    const id = await makeServiceContract();
    const linked = await rpc("manager", "link_operational_commitment", {
      _entity_type: "service_contract",
      _entity_id: id,
      _commitment_id: otherCommitmentId,
    });
    expect(linked.error?.message ?? "").toMatch(/another company/i);
    expect((await row("service_contract", id)).commitment_id).toBeNull();
  });

  it("blocks a cross-company evidence link", async () => {
    const id = await makeInsurance();
    const doc = await admin
      .from("documents")
      .insert({ company_id: other.id, title: "Foreign policy schedule", doc_type: "other" })
      .select("id")
      .single();
    expectNoError(doc, "insert foreign document");

    const res = await clients.manager.from("document_links").insert({
      company_id: other.id,
      document_id: doc.data!.id,
      entity_type: "insurance_policy",
      entity_id: id,
      relation: "evidence",
    });
    expect(res.error).toBeTruthy();
  });

  it("rejects an unknown operational entity type", async () => {
    const res = await rpc("manager", "archive_operational_record", {
      _entity_type: "mortgage",
      _entity_id: propertyId,
      _reason: "wrong type",
    });
    expect(res.error?.message ?? "").toMatch(/unknown/i);
  });
});

/* ------------------------------------------------------- 2. lifecycle */

describe("lifecycle", () => {
  for (const entityType of Object.keys(ENTITY_TABLES)) {
    it(`creates, updates, transitions, archives and never deletes a ${entityType}`, async () => {
      const id = await FACTORIES[entityType]();
      const created = await row(entityType, id);
      expect(created.company_id).toBe(company.id);
      expect(created.archived_at).toBeNull();

      const updateFn = {
        operational_obligation: ["update_operational_obligation", "_obligation_id"],
        service_contract: ["update_service_contract", "_contract_id"],
        insurance_policy: ["update_insurance_policy", "_policy_id"],
        utility_contract: ["update_utility_contract", "_contract_id"],
        tax_schedule: ["update_tax_schedule", "_schedule_id"],
      }[entityType]!;
      const renamed = `${created.title} (revised)`;
      expectNoError(
        await rpc("manager", updateFn[0], { [updateFn[1]]: id, _title: renamed }),
        `update ${entityType}`,
      );
      expect((await row(entityType, id)).title).toBe(renamed);

      const activeStatus = entityType === "operational_obligation" ? "in_progress" : "active";
      expectNoError(
        await rpc("manager", updateFn[0], { [updateFn[1]]: id, _status: activeStatus }),
        `transition ${entityType}`,
      );
      expect((await row(entityType, id)).status).toBe(activeStatus);

      expectNoError(
        await rpc("manager", "archive_operational_record", {
          _entity_type: entityType,
          _entity_id: id,
          _reason: "superseded",
        }),
        `archive ${entityType}`,
      );
      const archived = await row(entityType, id);
      expect(archived.archived_at).not.toBeNull();
      expect(archived.status).toBe("archived");
      expect(archived.archive_reason).toBe("superseded");

      // Two independent defences: no DELETE policy exists, so a signed-in
      // delete removes nothing, and the guard trigger refuses a privileged one.
      const del = await clients.owner.from(ENTITY_TABLES[entityType]).delete().eq("id", id).select("id");
      expect(del.data ?? []).toHaveLength(0);
      const privileged = await admin.from(ENTITY_TABLES[entityType]).delete().eq("id", id);
      expect(privileged.error?.message ?? "").toMatch(/archived, never deleted/i);
      expect(await row(entityType, id)).toBeTruthy();
    });
  }

  it("requires an archive reason", async () => {
    const id = await makeUtility();
    const res = await rpc("manager", "archive_operational_record", {
      _entity_type: "utility_contract",
      _entity_id: id,
      _reason: "   ",
    });
    expect(res.error?.message ?? "").toMatch(/reason is required/i);
    expect((await row("utility_contract", id)).archived_at).toBeNull();
  });

  it("keeps archived records out of the active set but reachable explicitly", async () => {
    const id = await makeInsurance();
    expectNoError(
      await rpc("manager", "archive_operational_record", {
        _entity_type: "insurance_policy",
        _entity_id: id,
        _reason: "policy replaced",
      }),
      "archive policy",
    );

    const active = await clients.viewer
      .from("v_insurance_policy_summary")
      .select("policy_id")
      .eq("company_id", company.id)
      .is("archived_at", null);
    expectNoError(active, "active policies");
    expect(active.data!.some((r) => r.policy_id === id)).toBe(false);

    const archived = await clients.viewer
      .from("v_insurance_policy_summary")
      .select("policy_id, archived_at")
      .eq("policy_id", id)
      .not("archived_at", "is", null);
    expectNoError(archived, "archived policies");
    expect(archived.data).toHaveLength(1);
  });

  it("writes audit rows for create, update, status change and archive", async () => {
    const id = await makeObligation();
    expectNoError(
      await rpc("manager", "update_operational_obligation", {
        _obligation_id: id,
        _title: "Audited obligation",
      }),
      "rename",
    );
    expectNoError(
      await rpc("manager", "update_operational_obligation", {
        _obligation_id: id,
        _status: "in_progress",
      }),
      "status change",
    );
    expectNoError(
      await rpc("manager", "archive_operational_record", {
        _entity_type: "operational_obligation",
        _entity_id: id,
        _reason: "done",
      }),
      "archive",
    );

    const audit = await admin
      .from("audit_log")
      .select("action")
      .eq("entity_id", id)
      .eq("company_id", company.id);
    expectNoError(audit, "audit rows");
    const actions = (audit.data ?? []).map((a) => a.action as string);
    expect(actions).toContain("create");
    expect(actions).toContain("update");
    expect(actions).toContain("archive");
    expect(actions.length).toBeGreaterThanOrEqual(4);
  });
});

/* ----------------------------------------------------- 3. obligations */

describe("obligations", () => {
  it("stores type, due date, priority, responsible party and recurrence", async () => {
    const id = await makeObligation("manager", {
      _obligation_type: "inspection",
      _priority: "high",
      _due_date: "2027-05-15",
      _responsible_name: "Ana Ribeiro",
      _reminder_lead_days: 20,
      _recurrence_frequency: "annual",
      _recurrence_interval: 1,
      _recurrence_end_date: "2030-01-01",
      _property_id: propertyId,
      _counterparty_id: counterpartyId,
      _notes: "Lift inspection",
    });
    const r = await row("operational_obligation", id);
    expect(r.obligation_type).toBe("inspection");
    expect(r.priority).toBe("high");
    expect(r.due_date).toBe("2027-05-15");
    expect(r.responsible_name).toBe("Ana Ribeiro");
    expect(r.reminder_lead_days).toBe(20);
    expect(r.recurrence_frequency).toBe("annual");
    expect(r.recurrence_interval).toBe(1);
    expect(r.recurrence_end_date).toBe("2030-01-01");
    expect(r.property_id).toBe(propertyId);
    expect(r.counterparty_id).toBe(counterpartyId);
  });

  it("rejects an invalid type, priority, recurrence or lead time", async () => {
    for (const bad of [
      { _obligation_type: "nonsense" },
      { _priority: "immediate" },
      { _recurrence_frequency: "fortnightly" },
      { _reminder_lead_days: -1 },
      { _recurrence_interval: 0 },
    ]) {
      const res = await rpc("manager", "create_operational_obligation", {
        _company_id: company.id,
        _obligation_type: "other",
        _title: uniq("Invalid"),
        ...bad,
      });
      expect(res.error, `${JSON.stringify(bad)} should be rejected`).toBeTruthy();
    }
  });

  it("carries a linked commitment and evidence", async () => {
    const commitmentId = await draftCommitment();
    const id = await makeObligation("manager", { _commitment_id: commitmentId });
    expect((await row("operational_obligation", id)).commitment_id).toBe(commitmentId);

    const doc = await admin
      .from("documents")
      .insert({ company_id: company.id, title: "Inspection certificate", doc_type: "other" })
      .select("id")
      .single();
    expectNoError(doc, "insert evidence document");
    const link = await clients.manager.from("document_links").insert({
      company_id: company.id,
      document_id: doc.data!.id,
      entity_type: "operational_obligation",
      entity_id: id,
      relation: "evidence",
    });
    expectNoError(link, "link evidence");
  });

  it("excludes completed, cancelled and archived obligations from reminder generation", async () => {
    const open = await makeObligation("manager", { _due_date: "2027-06-30", _reminder_lead_days: 10 });
    const done = await makeObligation("manager", { _due_date: "2027-06-30", _reminder_lead_days: 10 });
    const cancelled = await makeObligation("manager", { _due_date: "2027-06-30", _reminder_lead_days: 10 });
    const archived = await makeObligation("manager", { _due_date: "2027-06-30", _reminder_lead_days: 10 });

    expectNoError(
      await rpc("manager", "update_operational_obligation", { _obligation_id: done, _status: "completed" }),
      "complete",
    );
    expectNoError(
      await rpc("manager", "update_operational_obligation", { _obligation_id: cancelled, _status: "cancelled" }),
      "cancel",
    );
    expectNoError(
      await rpc("manager", "archive_operational_record", {
        _entity_type: "operational_obligation",
        _entity_id: archived,
        _reason: "no longer applicable",
      }),
      "archive",
    );

    expectNoError(
      await rpc("manager", "generate_operational_reminders", { _company_id: company.id }),
      "generate reminders",
    );
    const reminders = await admin
      .from("operational_reminders")
      .select("entity_id")
      .eq("company_id", company.id)
      .eq("entity_type", "operational_obligation");
    expectNoError(reminders, "load reminders");
    const ids = (reminders.data ?? []).map((r) => r.entity_id as string);
    expect(ids).toContain(open);
    expect(ids).not.toContain(done);
    expect(ids).not.toContain(cancelled);
    expect(ids).not.toContain(archived);
  });
});

/* ----------------------------------------------- 4. service contracts */

describe("service contracts", () => {
  it("stores supplier, contract number, term, renewal terms, notice and auto-renew", async () => {
    const obligationId = await makeObligation();
    const id = await makeServiceContract("manager", {
      _counterparty_id: counterpartyId,
      _contract_number: "SC-2026-001",
      _start_date: "2026-01-01",
      _end_date: "2027-12-31",
      _renewal_terms: "Rolls for twelve months unless cancelled",
      _notice_period_days: 90,
      _auto_renew: true,
      _obligation_id: obligationId,
      _property_id: propertyId,
    });
    const r = await row("service_contract", id);
    expect(r.counterparty_id).toBe(counterpartyId);
    expect(r.contract_number).toBe("SC-2026-001");
    expect(r.start_date).toBe("2026-01-01");
    expect(r.end_date).toBe("2027-12-31");
    expect(r.renewal_terms).toMatch(/twelve months/);
    expect(r.notice_period_days).toBe(90);
    expect(r.auto_renew).toBe(true);
    expect(r.obligation_id).toBe(obligationId);
  });

  it("owns no cost column of any kind", async () => {
    const columns = await admin.from("service_contracts").select("*").limit(1);
    expectNoError(columns, "read a contract row");
    const keys = Object.keys(columns.data![0] ?? {});
    expect(keys.filter((k) => /amount|cost|price|fee|value|premium/i.test(k))).toHaveLength(0);
  });

  it("links a commitment that then owns the money", async () => {
    const commitmentId = await activeCommitment(40_000);
    const id = await makeServiceContract("manager", { _commitment_id: commitmentId });
    const view = await clients.viewer
      .from("v_service_contract_summary")
      .select("commitment_id, authorised_amount, committed_amount, invoiced_amount, paid_amount")
      .eq("contract_id", id)
      .single();
    expectNoError(view, "contract summary");
    expect(view.data!.commitment_id).toBe(commitmentId);
    expect(Number(view.data!.authorised_amount)).toBe(40_000);
  });

  it("refuses an end date before the start date", async () => {
    const res = await rpc("manager", "create_service_contract", {
      _company_id: company.id,
      _title: uniq("Backwards"),
      _service_type: "other",
      _start_date: "2027-01-01",
      _end_date: "2026-01-01",
    });
    expect(res.error).toBeTruthy();
  });
});

/* -------------------------------------------------------- 5. insurance */

describe("insurance", () => {
  it("stores insurer, broker, policy number, type, cover dates and excess", async () => {
    const id = await makeInsurance("manager", {
      _insurer_counterparty_id: counterpartyId,
      _insurer_name: "Fidelidade",
      _broker_name: "MDS",
      _policy_number: "POL-99887",
      _policy_type: "buildings",
      _insured_assets: "Rioja block A",
      _property_id: propertyId,
      _effective_date: "2026-04-01",
      _expiry_date: "2027-03-31",
      _excess_amount: 1_500,
      _reminder_lead_days: 45,
    });
    const r = await row("insurance_policy", id);
    expect(r.insurer_counterparty_id).toBe(counterpartyId);
    expect(r.insurer_name).toBe("Fidelidade");
    expect(r.broker_name).toBe("MDS");
    expect(r.policy_number).toBe("POL-99887");
    expect(r.policy_type).toBe("buildings");
    expect(r.effective_date).toBe("2026-04-01");
    expect(r.expiry_date).toBe("2027-03-31");
    expect(Number(r.excess_amount)).toBe(1_500);
    expect(r.reminder_lead_days).toBe(45);
  });

  it("owns no premium column: the excess is a policy term, not expenditure", async () => {
    const sample = await admin.from("insurance_policies").select("*").limit(1);
    expectNoError(sample, "read a policy row");
    const keys = Object.keys(sample.data![0] ?? {});
    expect(keys).not.toContain("premium_amount");
    expect(keys.filter((k) => /premium|cost|price|paid|invoiced|committed/i.test(k))).toHaveLength(0);
  });

  it("derives every financial figure from the linked commitment", async () => {
    const commitmentId = await activeCommitment(12_000);
    const id = await makeInsurance("manager", { _commitment_id: commitmentId });
    const view = await clients.viewer
      .from("v_insurance_policy_summary")
      .select("*")
      .eq("policy_id", id)
      .single();
    expectNoError(view, "policy summary");
    expect(view.data!.commitment_id).toBe(commitmentId);
    expect(Number(view.data!.authorised_amount)).toBe(12_000);
    expect(Number(view.data!.invoiced_amount)).toBe(0);
    expect(Number(view.data!.paid_amount)).toBe(0);
  });

  it("shows zeroed derived figures when no commitment is linked", async () => {
    const id = await makeInsurance();
    const view = await clients.viewer
      .from("v_insurance_policy_summary")
      .select("commitment_id, authorised_amount, committed_amount, invoiced_amount, paid_amount")
      .eq("policy_id", id)
      .single();
    expectNoError(view, "unlinked policy summary");
    expect(view.data!.commitment_id).toBeNull();
    expect(Number(view.data!.authorised_amount)).toBe(0);
    expect(Number(view.data!.committed_amount)).toBe(0);
  });

  it("refuses an expiry before the effective date and a negative excess", async () => {
    for (const bad of [
      { _effective_date: "2027-01-01", _expiry_date: "2026-01-01" },
      { _excess_amount: -10 },
      { _policy_type: "spaceship" },
    ]) {
      const res = await rpc("manager", "create_insurance_policy", {
        _company_id: company.id,
        _title: uniq("Invalid policy"),
        ...bad,
      });
      expect(res.error, `${JSON.stringify(bad)} should be rejected`).toBeTruthy();
    }
  });
});

/* -------------------------------------------------------- 6. utilities */

describe("utilities", () => {
  it("stores supplier, type, account, meter, address and service dates", async () => {
    const id = await makeUtility("manager", {
      _counterparty_id: counterpartyId,
      _utility_type: "water",
      _account_number: "ACC-55231",
      _meter_identifier: "MTR-0091",
      _service_address: "Rua da Prata 12, Lisboa",
      _property_id: propertyId,
      _activation_date: "2026-02-01",
      _termination_date: "2027-02-01",
    });
    const r = await row("utility_contract", id);
    expect(r.utility_type).toBe("water");
    expect(r.account_number).toBe("ACC-55231");
    expect(r.meter_identifier).toBe("MTR-0091");
    expect(r.service_address).toMatch(/Rua da Prata/);
    expect(r.activation_date).toBe("2026-02-01");
    expect(r.termination_date).toBe("2027-02-01");
  });

  it("owns no consumption or cost column", async () => {
    const sample = await admin.from("utility_contracts").select("*").limit(1);
    expectNoError(sample, "read a utility row");
    const keys = Object.keys(sample.data![0] ?? {});
    expect(keys.filter((k) => /amount|cost|tariff|price|spend/i.test(k))).toHaveLength(0);
  });

  it("links a commitment for the cost and keeps its own figures derived", async () => {
    const commitmentId = await activeCommitment(6_000);
    const id = await makeUtility();
    expectNoError(
      await rpc("manager", "link_operational_commitment", {
        _entity_type: "utility_contract",
        _entity_id: id,
        _commitment_id: commitmentId,
      }),
      "link commitment",
    );
    const view = await clients.viewer
      .from("v_utility_contract_summary")
      .select("commitment_id, authorised_amount")
      .eq("contract_id", id)
      .single();
    expectNoError(view, "utility summary");
    expect(view.data!.commitment_id).toBe(commitmentId);
    expect(Number(view.data!.authorised_amount)).toBe(6_000);
  });

  it("refuses a termination before activation and an unknown utility type", async () => {
    for (const bad of [
      { _activation_date: "2027-01-01", _termination_date: "2026-01-01" },
      { _utility_type: "plasma" },
    ]) {
      const res = await rpc("manager", "create_utility_contract", {
        _company_id: company.id,
        _title: uniq("Invalid utility"),
        ...bad,
      });
      expect(res.error, `${JSON.stringify(bad)} should be rejected`).toBeTruthy();
    }
  });
});

/* ---------------------------------------------------- 7. tax schedules */

describe("tax schedules", () => {
  it("stores tax type, jurisdiction, reference and year", async () => {
    const id = await makeTaxSchedule("manager", {
      _tax_type: "aimi",
      _jurisdiction: "Cascais",
      _reference: "AIMI-2027",
      _tax_year: 2027,
      _property_id: propertyId,
    });
    const r = await row("tax_schedule", id);
    expect(r.tax_type).toBe("aimi");
    expect(r.jurisdiction).toBe("Cascais");
    expect(r.reference).toBe("AIMI-2027");
    expect(r.tax_year).toBe(2027);
  });

  it("carries multiple instalment dates in sequence", async () => {
    const id = await makeTaxSchedule("manager", {
      _due_dates: ["2027-05-31", "2027-08-31", "2027-11-30"],
    });
    const dates = await clients.viewer
      .from("tax_schedule_dates")
      .select("due_date, sequence_no, status")
      .eq("tax_schedule_id", id)
      .order("sequence_no", { ascending: true });
    expectNoError(dates, "instalment dates");
    expect(dates.data!.map((d) => d.due_date)).toEqual(["2027-05-31", "2027-08-31", "2027-11-30"]);
    expect(dates.data!.map((d) => d.sequence_no)).toEqual([1, 2, 3]);
    expect(dates.data!.every((d) => d.status === "scheduled")).toBe(true);

    const added = await rpc<string>("manager", "add_tax_schedule_date", {
      _schedule_id: id,
      _due_date: "2028-02-28",
      _label: "Final instalment",
      _reminder_date: "2028-02-01",
    });
    expectNoError(added, "add instalment date");
    const summary = await clients.viewer
      .from("v_tax_schedule_summary")
      .select("scheduled_dates, next_due_date")
      .eq("schedule_id", id)
      .single();
    expectNoError(summary, "tax summary");
    expect(Number(summary.data!.scheduled_dates)).toBe(4);
  });

  it("keeps instalment dates free of any amount", async () => {
    const id = await makeTaxSchedule("manager", { _due_dates: ["2027-05-31"] });
    const dates = await admin.from("tax_schedule_dates").select("*").eq("tax_schedule_id", id);
    expectNoError(dates, "instalment rows");
    const keys = Object.keys(dates.data![0] ?? {});
    expect(keys.filter((k) => /amount|cost|value|price/i.test(k))).toHaveLength(0);
  });

  it("creates no cash-flow entry of its own", async () => {
    const before = await countCompanyRows("cash_flow_entries");
    const id = await makeTaxSchedule("manager", { _due_dates: ["2027-05-31", "2027-11-30"] });
    expectNoError(
      await rpc("manager", "add_tax_schedule_date", { _schedule_id: id, _due_date: "2028-05-31" }),
      "add date",
    );
    expect(await countCompanyRows("cash_flow_entries")).toBe(before);
  });

  it("accepts evidence and a linked commitment", async () => {
    const commitmentId = await activeCommitment(9_000);
    const id = await makeTaxSchedule("manager", { _commitment_id: commitmentId });
    const doc = await admin
      .from("documents")
      .insert({ company_id: company.id, title: "IMI notice", doc_type: "other" })
      .select("id")
      .single();
    expectNoError(doc, "insert notice");
    expectNoError(
      await clients.manager.from("document_links").insert({
        company_id: company.id,
        document_id: doc.data!.id,
        entity_type: "tax_schedule",
        entity_id: id,
        relation: "evidence",
      }),
      "link notice",
    );
    const view = await clients.viewer
      .from("v_tax_schedule_summary")
      .select("commitment_id, authorised_amount")
      .eq("schedule_id", id)
      .single();
    expectNoError(view, "tax summary");
    expect(view.data!.commitment_id).toBe(commitmentId);
    expect(Number(view.data!.authorised_amount)).toBe(9_000);
  });

  it("rejects an unknown tax type", async () => {
    const res = await rpc("manager", "create_tax_schedule", {
      _company_id: company.id,
      _title: uniq("Bad tax"),
      _tax_type: "tithe",
    });
    expect(res.error).toBeTruthy();
  });
});

/* -------------------------------------------- 8. reminders and recurrence */

describe("reminders and recurrence", () => {
  const today = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(today.getTime() + offsetDays * 86_400_000);
    return d.toISOString().slice(0, 10);
  };

  it("classifies due, overdue and future reminders", async () => {
    const id = await makeObligation();
    const overdue = await rpc<string>("manager", "upsert_operational_reminder", {
      _company_id: company.id,
      _entity_type: "operational_obligation",
      _entity_id: id,
      _reason: "obligation_due",
      _remind_on: iso(-10),
      _due_on: iso(-3),
      _severity: "high",
      _title: "Overdue item",
    });
    expectNoError(overdue, "overdue reminder");
    const dueToday = await rpc<string>("manager", "upsert_operational_reminder", {
      _company_id: company.id,
      _entity_type: "operational_obligation",
      _entity_id: id,
      _reason: "inspection_due",
      _remind_on: iso(0),
      _due_on: iso(0),
      _title: "Due today",
    });
    expectNoError(dueToday, "due reminder");
    const future = await rpc<string>("manager", "upsert_operational_reminder", {
      _company_id: company.id,
      _entity_type: "operational_obligation",
      _entity_id: id,
      _reason: "licence_expiry",
      _remind_on: iso(30),
      _due_on: iso(45),
      _title: "Future item",
    });
    expectNoError(future, "future reminder");

    const view = await clients.viewer
      .from("v_operational_reminders")
      .select("reminder_id, is_overdue, days_until_reminder, days_until_due")
      .in("reminder_id", [overdue.data, dueToday.data, future.data]);
    expectNoError(view, "reminder view");
    const byId = Object.fromEntries(view.data!.map((r) => [r.reminder_id, r]));
    expect(byId[overdue.data].is_overdue).toBe(true);
    expect(byId[dueToday.data].is_overdue).toBe(false);
    expect(byId[dueToday.data].days_until_due).toBe(0);
    expect(byId[future.data].is_overdue).toBe(false);
    expect(byId[future.data].days_until_reminder).toBe(30);
  });

  it("generates reminders across all five domains", async () => {
    const local = await createTestCompany("operations-reminders");
    try {
      await admin.from("user_roles").insert({
        user_id: userIds.manager,
        company_id: local.id,
        role: "manager",
      });
      const mk = async (fn: string, args: Args) => {
        const res = await rpc<string>("manager", fn, { _company_id: local.id, ...args });
        expectNoError(res, fn);
        return res.data;
      };
      await mk("create_operational_obligation", {
        _obligation_type: "inspection",
        _title: "Lift inspection",
        _due_date: iso(60),
        _reminder_lead_days: 30,
      });
      await mk("create_service_contract", {
        _title: "Cleaning",
        _service_type: "cleaning",
        _end_date: iso(120),
        _notice_period_days: 30,
      });
      await mk("create_insurance_policy", {
        _title: "Buildings cover",
        _policy_type: "buildings",
        _expiry_date: iso(200),
      });
      await mk("create_utility_contract", {
        _title: "Electricity",
        _utility_type: "electricity",
        _termination_date: iso(150),
      });
      await mk("create_tax_schedule", {
        _title: "IMI 2027",
        _tax_type: "imi",
        _due_dates: [iso(90)],
      });

      const first = await rpc<number>("manager", "generate_operational_reminders", {
        _company_id: local.id,
      });
      expectNoError(first, "first generation");
      expect(Number(first.data)).toBe(5);

      const kinds = await admin
        .from("operational_reminders")
        .select("entity_type, reason")
        .eq("company_id", local.id);
      expectNoError(kinds, "reminder rows");
      expect(new Set(kinds.data!.map((r) => r.entity_type))).toEqual(
        new Set([
          "operational_obligation",
          "service_contract",
          "insurance_policy",
          "utility_contract",
          "tax_schedule",
        ]),
      );

      const second = await rpc<number>("manager", "generate_operational_reminders", {
        _company_id: local.id,
      });
      expectNoError(second, "second generation");
      expect(Number(second.data)).toBe(0);
      expect(await countCompanyRows("operational_reminders", local.id)).toBe(5);

      const [a, b, c] = await Promise.all([
        rpc<number>("manager", "generate_operational_reminders", { _company_id: local.id }),
        rpc<number>("manager", "generate_operational_reminders", { _company_id: local.id }),
        rpc<number>("manager", "generate_operational_reminders", { _company_id: local.id }),
      ]);
      for (const res of [a, b, c]) expect(Number(res.data ?? 0)).toBe(0);
      expect(await countCompanyRows("operational_reminders", local.id)).toBe(5);
    } finally {
      await admin.from("user_roles").delete().eq("user_id", userIds.manager).eq("company_id", local.id);
      await dropTestCompany(local);
    }
  });

  it("generates a second reminder for the next recurrence", async () => {
    const local = await createTestCompany("operations-recurrence");
    try {
      await admin.from("user_roles").insert({
        user_id: userIds.manager,
        company_id: local.id,
        role: "manager",
      });
      const created = await rpc<string>("manager", "create_operational_obligation", {
        _company_id: local.id,
        _obligation_type: "recurring",
        _title: "Quarterly filing",
        _due_date: iso(40),
        _reminder_lead_days: 15,
        _recurrence_frequency: "quarterly",
        _recurrence_interval: 1,
      });
      expectNoError(created, "recurring obligation");
      const gen = await rpc<number>("manager", "generate_operational_reminders", {
        _company_id: local.id,
      });
      expectNoError(gen, "generate");
      expect(Number(gen.data)).toBe(2);

      const rows = await admin
        .from("operational_reminders")
        .select("remind_on, due_on")
        .eq("company_id", local.id)
        .order("remind_on", { ascending: true });
      expectNoError(rows, "recurrence reminders");
      expect(rows.data).toHaveLength(2);
      expect(new Date(rows.data![1].due_on as string).getTime()).toBeGreaterThan(
        new Date(rows.data![0].due_on as string).getTime(),
      );
    } finally {
      await admin.from("user_roles").delete().eq("user_id", userIds.manager).eq("company_id", local.id);
      await dropTestCompany(local);
    }
  });

  it("prevents duplicate reminders for the same entity, reason and date", async () => {
    const id = await makeObligation();
    const args = {
      _company_id: company.id,
      _entity_type: "operational_obligation",
      _entity_id: id,
      _reason: "obligation_due",
      _remind_on: iso(12),
      _due_on: iso(20),
    };
    const first = await rpc<string>("manager", "upsert_operational_reminder", args);
    expectNoError(first, "first upsert");
    const second = await rpc<string>("manager", "upsert_operational_reminder", {
      ...args,
      _notes: "second attempt",
    });
    expectNoError(second, "second upsert");
    expect(second.data).toBe(first.data);

    const direct = await clients.manager.from("operational_reminders").insert({
      company_id: company.id,
      entity_type: "operational_obligation",
      entity_id: id,
      reason: "obligation_due",
      remind_on: iso(12),
    });
    expect(direct.error?.message ?? "").toMatch(/duplicate|unique/i);
  });

  it("resolves and dismisses reminders without deleting them", async () => {
    const id = await makeObligation();
    const created = await rpc<string>("manager", "upsert_operational_reminder", {
      _company_id: company.id,
      _entity_type: "operational_obligation",
      _entity_id: id,
      _reason: "obligation_due",
      _remind_on: iso(5),
    });
    expectNoError(created, "reminder");
    expectNoError(
      await rpc("manager", "resolve_operational_reminder", {
        _reminder_id: created.data,
        _status: "resolved",
        _notes: "handled",
      }),
      "resolve",
    );
    const resolved = await admin
      .from("operational_reminders")
      .select("status, resolved_at, resolved_by")
      .eq("id", created.data)
      .single();
    expectNoError(resolved, "reload reminder");
    expect(resolved.data!.status).toBe("resolved");
    expect(resolved.data!.resolved_at).not.toBeNull();
    expect(resolved.data!.resolved_by).toBe(userIds.manager);

    const del = await clients.owner
      .from("operational_reminders")
      .delete()
      .eq("id", created.data)
      .select("id");
    expect(del.data ?? []).toHaveLength(0);
    const privileged = await admin.from("operational_reminders").delete().eq("id", created.data);
    expect(privileged.error?.message ?? "").toMatch(/archived, never deleted/i);
  });

  it("dismisses pending reminders when the source record is archived", async () => {
    const id = await makeObligation();
    const created = await rpc<string>("manager", "upsert_operational_reminder", {
      _company_id: company.id,
      _entity_type: "operational_obligation",
      _entity_id: id,
      _reason: "obligation_due",
      _remind_on: iso(7),
    });
    expectNoError(created, "reminder");
    expectNoError(
      await rpc("manager", "archive_operational_record", {
        _entity_type: "operational_obligation",
        _entity_id: id,
        _reason: "closed",
      }),
      "archive",
    );
    const after = await admin
      .from("operational_reminders")
      .select("status")
      .eq("id", created.data)
      .single();
    expectNoError(after, "reload reminder");
    expect(after.data!.status).toBe("dismissed");
  });

  it("refuses reminder work without the record capability and across companies", async () => {
    const id = await makeObligation();
    const denied = await rpc("viewer", "upsert_operational_reminder", {
      _company_id: company.id,
      _entity_type: "operational_obligation",
      _entity_id: id,
      _reason: "obligation_due",
      _remind_on: iso(3),
    });
    expect(denied.error?.message ?? "").toMatch(/permission/i);

    const foreign = await otherOwner.rpc("generate_operational_reminders", {
      _company_id: company.id,
    });
    expect(foreign.error?.message ?? "").toMatch(/permission/i);

    const badStatus = await rpc("manager", "resolve_operational_reminder", {
      _reminder_id: id,
      _status: "resolved",
    });
    expect(badStatus.error?.message ?? "").toMatch(/not found/i);
  });
});

/* ------------------------------------------------ 9. commitment integration */

describe("commitment integration", () => {
  it("links an existing commitment and unlinks without touching it", async () => {
    const commitmentId = await activeCommitment(30_000);
    const id = await makeUtility();
    expectNoError(
      await rpc("manager", "link_operational_commitment", {
        _entity_type: "utility_contract",
        _entity_id: id,
        _commitment_id: commitmentId,
      }),
      "link",
    );
    const before = await admin.from("commitments").select("*").eq("id", commitmentId).single();
    expectNoError(before, "commitment before unlink");

    expectNoError(
      await rpc("manager", "link_operational_commitment", {
        _entity_type: "utility_contract",
        _entity_id: id,
        _commitment_id: null,
      }),
      "unlink",
    );
    expect((await row("utility_contract", id)).commitment_id).toBeNull();

    const after = await admin.from("commitments").select("*").eq("id", commitmentId).single();
    expectNoError(after, "commitment after unlink");
    expect(after.data!.status).toBe(before.data!.status);
    expect(Number(after.data!.authorised_amount)).toBe(Number(before.data!.authorised_amount));
  });

  it("creates a draft commitment through the approved function and leaves it unapproved", async () => {
    const id = await makeServiceContract();
    const created = await rpc<string>("manager", "create_operational_commitment", {
      _entity_type: "service_contract",
      _entity_id: id,
      _title: "Cleaning 2027",
      _commitment_type: "service_contract",
      _authorised_amount: 18_000,
      _currency: "EUR",
      _counterparty_id: counterpartyId,
    });
    expectNoError(created, "create operational commitment");

    const commitment = await admin
      .from("commitments")
      .select("*")
      .eq("id", created.data)
      .single();
    expectNoError(commitment, "reload commitment");
    expect(commitment.data!.status).toBe("draft");
    expect(commitment.data!.approval_status).not.toBe("approved");
    expect(commitment.data!.source_type).toBe("service_contract");
    expect(commitment.data!.source_id).toBe(id);
    expect((await row("service_contract", id)).commitment_id).toBe(created.data);
  });

  it("creates no included cash-flow projection while the commitment is unapproved", async () => {
    const id = await makeServiceContract();
    const created = await rpc<string>("manager", "create_operational_commitment", {
      _entity_type: "service_contract",
      _entity_id: id,
      _title: "Unapproved works",
      _commitment_type: "service_contract",
      _authorised_amount: 22_000,
    });
    expectNoError(created, "create commitment");
    const version = await rpc<string>("manager", "create_commitment_schedule_version", {
      _commitment_id: created.data,
      _effective_from: "2027-01-01",
      _schedule_type: "milestone",
      _lines: [{ expected_date: "2027-02-01", amount: 22_000 }],
    });
    expectNoError(version, "schedule version");

    const projections = await commitmentProjections(created.data);
    expect(projections.every((p) => p.include_in_projection === false)).toBe(true);
  });

  it("exposes the approved active commitment summary to the operational register", async () => {
    const commitmentId = await activeCommitment(50_000);
    const id = await makeObligation("manager", { _commitment_id: commitmentId });
    const view = await clients.viewer
      .from("v_operational_obligation_summary")
      .select("commitment_status, commitment_approval_status, authorised_amount, remaining_commitment")
      .eq("obligation_id", id)
      .single();
    expectNoError(view, "obligation summary");
    expect(view.data!.commitment_status).toBe("active");
    expect(view.data!.commitment_approval_status).toBe("approved");
    expect(Number(view.data!.authorised_amount)).toBe(50_000);
  });

  it("never lets an operational update mutate the linked commitment", async () => {
    const commitmentId = await activeCommitment(15_000);
    const id = await makeServiceContract("manager", { _commitment_id: commitmentId });
    const before = await admin.from("commitments").select("*").eq("id", commitmentId).single();
    expectNoError(before, "commitment before");

    expectNoError(
      await rpc("manager", "update_service_contract", {
        _contract_id: id,
        _title: "Renamed contract",
        _status: "expiring",
        _notice_period_days: 30,
      }),
      "update contract",
    );
    expectNoError(
      await rpc("manager", "archive_operational_record", {
        _entity_type: "service_contract",
        _entity_id: id,
        _reason: "replaced",
      }),
      "archive contract",
    );

    const after = await admin.from("commitments").select("*").eq("id", commitmentId).single();
    expectNoError(after, "commitment after");
    expect(Number(after.data!.authorised_amount)).toBe(Number(before.data!.authorised_amount));
    expect(after.data!.status).toBe(before.data!.status);
    expect(after.data!.approval_status).toBe(before.data!.approval_status);
    expect(after.data!.updated_at).toBe(before.data!.updated_at);
  });

  it("refuses to draft a commitment without the record capability", async () => {
    const id = await makeServiceContract();
    const res = await rpc("viewer", "create_operational_commitment", {
      _entity_type: "service_contract",
      _entity_id: id,
      _title: "Viewer commitment",
      _commitment_type: "service_contract",
      _authorised_amount: 1_000,
    });
    expect(res.error?.message ?? "").toMatch(/permission/i);
    expect((await row("service_contract", id)).commitment_id).toBeNull();
  });
});

/* --------------------------------------------- 10. financial boundaries */

describe("financial boundaries", () => {
  it("keeps every operational table free of authoritative expenditure columns", async () => {
    for (const table of Object.values(ENTITY_TABLES)) {
      const sample = await admin.from(table).select("*").limit(1);
      expectNoError(sample, `read ${table}`);
      const keys = Object.keys(sample.data![0] ?? {});
      const money = keys.filter((k) =>
        /(^|_)(amount|cost|price|total|premium|spend|invoiced|paid|committed)(_|$)/i.test(k),
      );
      // insurance_policies.excess_amount is a policy term, not expenditure.
      expect(money.filter((k) => k !== "excess_amount")).toHaveLength(0);
    }
  });

  it("writes no cash flow, bookkeeping, payment or bank row for a full operational run", async () => {
    const counts = async () => ({
      cash: await countCompanyRows("cash_flow_entries"),
      documents: await countCompanyRows("financial_documents"),
      payments: await countCompanyRows("financial_payments"),
      transactions: await countCompanyRows("bank_transactions"),
    });
    const before = await counts();

    const obligation = await makeObligation("manager", { _due_date: "2027-09-01" });
    const contract = await makeServiceContract("manager", { _end_date: "2027-09-01" });
    const policy = await makeInsurance("manager", { _expiry_date: "2027-09-01" });
    const utility = await makeUtility("manager", { _termination_date: "2027-09-01" });
    const tax = await makeTaxSchedule("manager", { _due_dates: ["2027-09-01"] });
    expectNoError(
      await rpc("manager", "generate_operational_reminders", { _company_id: company.id }),
      "generate reminders",
    );
    expectNoError(
      await rpc("manager", "update_operational_obligation", {
        _obligation_id: obligation,
        _status: "completed",
      }),
      "complete obligation",
    );
    for (const [entityType, entityId] of [
      ["service_contract", contract],
      ["insurance_policy", policy],
      ["utility_contract", utility],
      ["tax_schedule", tax],
    ] as const) {
      expectNoError(
        await rpc("manager", "archive_operational_record", {
          _entity_type: entityType,
          _entity_id: entityId,
          _reason: "smoke tidy-up",
        }),
        `archive ${entityType}`,
      );
    }

    expect(await counts()).toEqual(before);
  });

  it("creates no projection when an operational record drafts a commitment", async () => {
    const before = await countCompanyRows("cash_flow_entries");
    const id = await makeUtility();
    const created = await rpc<string>("manager", "create_operational_commitment", {
      _entity_type: "utility_contract",
      _entity_id: id,
      _title: "Electricity 2027",
      _commitment_type: "service_contract",
      _authorised_amount: 4_800,
    });
    expectNoError(created, "draft commitment");
    expect(await countCompanyRows("cash_flow_entries")).toBe(before);
  });

  it("reports derived figures that always match the commitment summary", async () => {
    const commitmentId = await activeCommitment(75_000);
    const id = await makeObligation("manager", { _commitment_id: commitmentId });
    const [summary, derived] = await Promise.all([
      admin.from("v_commitment_summary").select("*").eq("commitment_id", commitmentId).single(),
      admin
        .from("v_operational_obligation_summary")
        .select("authorised_amount, committed_amount, invoiced_amount, paid_amount, remaining_commitment")
        .eq("obligation_id", id)
        .single(),
    ]);
    expectNoError(summary, "commitment summary");
    expectNoError(derived, "obligation summary");
    expect(Number(derived.data!.authorised_amount)).toBe(Number(summary.data!.authorised_amount));
    expect(Number(derived.data!.committed_amount)).toBe(
      Number(summary.data!.approved_committed_amount),
    );
    expect(Number(derived.data!.invoiced_amount)).toBe(Number(summary.data!.invoiced_amount));
    expect(Number(derived.data!.paid_amount)).toBe(Number(summary.data!.paid_amount));
  });
});

/* --------------------------------------------------------- 11. integrity */

describe("integrity", () => {
  it("rejects references to rows that do not exist", async () => {
    const ghost = "00000000-0000-0000-0000-000000000000";
    const badCounterparty = await rpc("manager", "create_service_contract", {
      _company_id: company.id,
      _title: uniq("Ghost supplier"),
      _service_type: "other",
      _counterparty_id: ghost,
    });
    expect(badCounterparty.error).toBeTruthy();

    const badCommitment = await rpc("manager", "create_tax_schedule", {
      _company_id: company.id,
      _title: uniq("Ghost commitment"),
      _tax_type: "other",
      _commitment_id: ghost,
    });
    expect(badCommitment.error).toBeTruthy();

    const missingRecord = await rpc("manager", "link_operational_commitment", {
      _entity_type: "insurance_policy",
      _entity_id: ghost,
      _commitment_id: null,
    });
    expect(missingRecord.error?.message ?? "").toMatch(/not found/i);
  });

  it("refuses a counterparty owned by another company", async () => {
    const res = await rpc("manager", "create_utility_contract", {
      _company_id: company.id,
      _title: uniq("Foreign supplier utility"),
      _utility_type: "gas",
      _counterparty_id: otherCounterpartyId,
    });
    expect(res.error).toBeTruthy();
  });

  it("keeps an archived record's links intact and still readable", async () => {
    const commitmentId = await activeCommitment(5_000);
    const id = await makeInsurance("manager", { _commitment_id: commitmentId });
    expectNoError(
      await rpc("manager", "archive_operational_record", {
        _entity_type: "insurance_policy",
        _entity_id: id,
        _reason: "cover ended",
      }),
      "archive",
    );
    const view = await clients.viewer
      .from("v_insurance_policy_summary")
      .select("commitment_id, authorised_amount, archived_at")
      .eq("policy_id", id)
      .single();
    expectNoError(view, "archived policy summary");
    expect(view.data!.commitment_id).toBe(commitmentId);
    expect(Number(view.data!.authorised_amount)).toBe(5_000);
    expect(view.data!.archived_at).not.toBeNull();
  });

  it("enforces the natural duplicate rule on tax instalment sequences", async () => {
    const id = await makeTaxSchedule("manager", { _due_dates: ["2027-04-30"] });
    const dup = await clients.manager.from("tax_schedule_dates").insert({
      company_id: company.id,
      tax_schedule_id: id,
      sequence_no: 1,
      due_date: "2027-04-30",
    });
    expect(dup.error?.message ?? "").toMatch(/duplicate|unique/i);
  });

  it("rejects an unknown instalment status", async () => {
    const id = await makeTaxSchedule("manager", { _due_dates: ["2027-07-31"] });
    const res = await clients.manager
      .from("tax_schedule_dates")
      .update({ status: "invented" })
      .eq("tax_schedule_id", id);
    expect(res.error).toBeTruthy();
  });
});
