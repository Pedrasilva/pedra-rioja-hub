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
 * Phase 8D — preventive maintenance.
 *
 * A schedule plans WORK. It owns no money: generated jobs carry no amount and
 * cost only ever enters through quotation → commitment → approval → cash flow
 * (§5D). Generation is idempotent and company scoped.
 */

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
const MANAGE_ROLES: Role[] = ["owner", "manager"];
const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let other: TestCompany;
let propertyId: string;
let otherScheduleId: string;
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

async function createRoleUser(role: string, companyId: string, prefix = "pm") {
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
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (days: number) => iso(new Date(Date.now() + days * 86_400_000));

async function makeSchedule(role: Role = "manager", overrides: Args = {}) {
  const res = await rpc<string>(role, "upsert_maintenance_schedule", {
    _company_id: company.id,
    _title: uniq("Boiler service"),
    _frequency: "quarterly",
    _start_date: inDays(10),
    _property_id: propertyId,
    ...overrides,
  });
  expectNoError(res, "upsert_maintenance_schedule");
  return res.data!;
}

async function jobsFor(scheduleId: string) {
  const res = await admin
    .from("maintenance_jobs")
    .select("*")
    .eq("schedule_id", scheduleId)
    .order("planned_date", { ascending: true });
  expectNoError(res, "load jobs");
  return res.data as Record<string, unknown>[];
}

async function generate(role: Role = "manager", months = 12) {
  return rpc<number>(role, "generate_maintenance_jobs", {
    _company_id: company.id,
    _horizon_months: months,
  });
}

/* -------------------------------------------------------------- fixtures */

beforeAll(async () => {
  company = await createTestCompany("maintenance");
  other = await createTestCompany("maintenance-other");

  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
  otherOwner = await createRoleUser("owner", other.id, "pm-other");

  const prop = await admin
    .from("properties")
    .insert({
      company_id: company.id,
      name: uniq("Maintenance property"),
      property_type: "apartment",
      status: "owned",
    })
    .select("id")
    .single();
  expectNoError(prop, "insert property");
  propertyId = prop.data!.id;

  const foreign = await otherOwner.rpc("upsert_maintenance_schedule", {
    _company_id: other.id,
    _title: uniq("Foreign schedule"),
    _frequency: "annual",
    _start_date: inDays(5),
  });
  expectNoError(foreign, "create foreign schedule");
  otherScheduleId = foreign.data as string;
}, 180_000);

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(other);
});

/* ----------------------------------------------------------------- tests */

describe("schedule creation", () => {
  it("creates an active preventive schedule", async () => {
    const id = await makeSchedule();
    const row = await admin.from("maintenance_schedules").select("*").eq("id", id).single();
    expectNoError(row, "reload schedule");
    expect(row.data!.company_id).toBe(company.id);
    expect(row.data!.schedule_kind).toBe("preventive");
    expect(row.data!.is_active).toBe(true);
    expect(row.data!.archived_at).toBeNull();
  });

  it("creates inspection schedules as a distinct kind", async () => {
    const id = await makeSchedule("manager", {
      _schedule_kind: "inspection",
      _title: uniq("Fire inspection"),
      _frequency: "annual",
    });
    const row = await admin
      .from("maintenance_schedules")
      .select("schedule_kind")
      .eq("id", id)
      .single();
    expect(row.data!.schedule_kind).toBe("inspection");
  });

  it("requires an interval for custom-day recurrence", async () => {
    const res = await rpc("manager", "upsert_maintenance_schedule", {
      _company_id: company.id,
      _title: uniq("Bad schedule"),
      _frequency: "custom_days",
      _start_date: inDays(3),
    });
    expect(res.error).not.toBeNull();
  });

  it("updates an existing schedule in place", async () => {
    const id = await makeSchedule();
    const res = await rpc<string>("manager", "upsert_maintenance_schedule", {
      _company_id: company.id,
      _schedule_id: id,
      _title: "Boiler service (revised)",
      _priority: "high",
      _frequency: "quarterly",
    });
    expectNoError(res, "update schedule");
    expect(res.data).toBe(id);
    const row = await admin
      .from("maintenance_schedules")
      .select("title, priority")
      .eq("id", id)
      .single();
    expect(row.data!.title).toBe("Boiler service (revised)");
    expect(row.data!.priority).toBe("high");
  });

  it("stores no monetary column on schedules or generated jobs", async () => {
    const money = ["amount", "cost", "price", "total", "vat", "currency"];
    for (const table of ["maintenance_schedules", "maintenance_jobs"]) {
      const probe = await admin.from(table).select("*").limit(1);
      expectNoError(probe, `probe ${table}`);
      for (const key of Object.keys((probe.data ?? [])[0] ?? {})) {
        expect(money.some((m) => key.includes(m))).toBe(false);
      }
    }
  });
});

describe("recurrence and generation", () => {
  it("generates one job per occurrence inside the horizon", async () => {
    const id = await makeSchedule("manager", { _frequency: "quarterly", _start_date: inDays(7) });
    const res = await generate("manager", 12);
    expectNoError(res, "generate jobs");
    const jobs = await jobsFor(id);
    expect(jobs.length).toBeGreaterThanOrEqual(3);
    expect(jobs.length).toBeLessThanOrEqual(5);
    expect(jobs.every((j) => j.job_kind === "preventive")).toBe(true);
    expect(jobs.every((j) => j.status === "scheduled")).toBe(true);
    expect(new Set(jobs.map((j) => j.occurrence_key)).size).toBe(jobs.length);
  });

  it("spaces monthly occurrences one month apart", async () => {
    const id = await makeSchedule("manager", { _frequency: "monthly", _start_date: inDays(2) });
    expectNoError(await generate("manager", 6), "generate monthly");
    const jobs = await jobsFor(id);
    expect(jobs.length).toBeGreaterThanOrEqual(5);
    const first = new Date(jobs[0].planned_date as string);
    const second = new Date(jobs[1].planned_date as string);
    const gap = (second.getTime() - first.getTime()) / 86_400_000;
    expect(gap).toBeGreaterThanOrEqual(27);
    expect(gap).toBeLessThanOrEqual(32);
  });

  it("is idempotent: re-running creates no duplicates", async () => {
    const id = await makeSchedule("manager", { _frequency: "annual", _start_date: inDays(20) });
    expectNoError(await generate("manager", 24), "first run");
    const afterFirst = await jobsFor(id);
    const second = await generate("manager", 24);
    expectNoError(second, "second run");
    const afterSecond = await jobsFor(id);
    expect(afterSecond.length).toBe(afterFirst.length);
    expect(afterSecond.map((j) => j.id).sort()).toEqual(afterFirst.map((j) => j.id).sort());
  });

  it("rejects a duplicate occurrence at the database level", async () => {
    const id = await makeSchedule("manager", { _frequency: "annual", _start_date: inDays(30) });
    expectNoError(await generate("manager", 12), "generate");
    const jobs = await jobsFor(id);
    const clone = await admin.from("maintenance_jobs").insert({
      company_id: company.id,
      title: "Manual duplicate",
      status: "scheduled",
      schedule_id: id,
      occurrence_key: jobs[0].occurrence_key as string,
      job_kind: "preventive",
    });
    expect(clone.error).not.toBeNull();
  });

  it("stops generating for archived or inactive schedules", async () => {
    const id = await makeSchedule("manager", { _frequency: "monthly", _start_date: inDays(1) });
    expectNoError(await generate("manager", 3), "generate");
    const before = (await jobsFor(id)).length;
    expectNoError(
      await rpc("manager", "archive_maintenance_schedule", {
        _schedule_id: id,
        _reason: "Contract ended",
      }),
      "archive",
    );
    expectNoError(await generate("manager", 12), "generate after archive");
    expect((await jobsFor(id)).length).toBe(before);
  });

  it("honours the schedule end date", async () => {
    const id = await makeSchedule("manager", {
      _frequency: "monthly",
      _start_date: inDays(1),
      _end_date: inDays(70),
    });
    expectNoError(await generate("manager", 24), "generate bounded");
    const jobs = await jobsFor(id);
    expect(jobs.length).toBeLessThanOrEqual(3);
    expect(jobs.every((j) => (j.planned_date as string) <= inDays(70))).toBe(true);
  });

  it("only generates for the caller's company", async () => {
    expectNoError(await generate("manager", 24), "generate own company");
    const foreignJobs = await admin
      .from("maintenance_jobs")
      .select("id", { count: "exact", head: true })
      .eq("schedule_id", otherScheduleId);
    expect(foreignJobs.count ?? 0).toBe(0);
  });
});

describe("inspection evidence", () => {
  it("links evidence to a generated inspection job", async () => {
    const id = await makeSchedule("manager", {
      _schedule_kind: "inspection",
      _frequency: "annual",
      _start_date: inDays(4),
      _title: uniq("Lift inspection"),
    });
    expectNoError(await generate("manager", 12), "generate inspection jobs");
    const jobs = await jobsFor(id);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].job_kind).toBe("inspection");

    const rec = await rpc<string>("manager", "record_inspection_evidence", {
      _job_id: jobs[0].id,
      _finding: "Emergency brake within tolerance",
      _outcome: "pass",
    });
    expectNoError(rec, "record evidence");

    const evidence = await admin
      .from("maintenance_inspection_evidence")
      .select("*")
      .eq("id", rec.data!)
      .single();
    expectNoError(evidence, "reload evidence");
    expect(evidence.data!.job_id).toBe(jobs[0].id);
    expect(evidence.data!.company_id).toBe(company.id);
    expect(evidence.data!.outcome).toBe("pass");
  });

  it("keeps evidence append-only", async () => {
    const id = await makeSchedule("manager", {
      _schedule_kind: "inspection",
      _frequency: "annual",
      _start_date: inDays(6),
    });
    expectNoError(await generate("manager", 12), "generate");
    const jobs = await jobsFor(id);
    const rec = await rpc<string>("manager", "record_inspection_evidence", {
      _job_id: jobs[0].id,
      _finding: "Minor corrosion noted",
      _outcome: "observation",
    });
    expectNoError(rec, "record evidence");
    const del = await admin.from("maintenance_inspection_evidence").delete().eq("id", rec.data!);
    expect(del.error).not.toBeNull();
  });

  it("refuses evidence for a job in another company", async () => {
    const foreignJob = await otherOwner.rpc("create_maintenance_job", {
      _company_id: other.id,
      _title: uniq("Foreign job"),
    });
    expectNoError(foreignJob, "create foreign job");
    const res = await rpc("manager", "record_inspection_evidence", {
      _job_id: foreignJob.data,
      _finding: "Should not be possible",
    });
    expect(res.error?.message ?? "").toMatch(/permission|not found/i);
  });
});

describe("permissions, isolation and the summary view", () => {
  it("restricts schedule creation to recording roles", async () => {
    for (const role of ROLES) {
      const res = await rpc(role, "upsert_maintenance_schedule", {
        _company_id: company.id,
        _title: uniq(`Schedule ${role}`),
        _frequency: "annual",
        _start_date: inDays(15),
      });
      if (RECORD_ROLES.includes(role)) expectNoError(res, `create as ${role}`);
      else expect(res.error?.message ?? "").toMatch(/permission/i);
    }
  });

  it("restricts archiving to managing roles", async () => {
    for (const role of ROLES) {
      const id = await makeSchedule();
      const res = await rpc(role, "archive_maintenance_schedule", { _schedule_id: id });
      if (MANAGE_ROLES.includes(role)) expectNoError(res, `archive as ${role}`);
      else expect(res.error?.message ?? "").toMatch(/permission/i);
    }
  });

  it("scopes reads to the caller's company and blocks anonymous access", async () => {
    const mine = await clients.viewer.from("maintenance_schedules").select("id, company_id");
    expectNoError(mine, "viewer read");
    expect(mine.data!.every((s) => s.company_id === company.id)).toBe(true);
    expect(mine.data!.some((s) => s.id === otherScheduleId)).toBe(false);

    const anon = await anonClient().from("maintenance_schedules").select("id");
    expect(anon.data ?? []).toHaveLength(0);
  });

  it("summarises jobs per schedule without storing counts", async () => {
    const id = await makeSchedule("manager", { _frequency: "quarterly", _start_date: inDays(9) });
    expectNoError(await generate("manager", 12), "generate");
    const summary = await clients.viewer
      .from("v_maintenance_schedule_summary")
      .select("schedule_id, company_id, job_count, open_count, next_planned_date")
      .eq("schedule_id", id)
      .single();
    expectNoError(summary, "schedule summary");
    expect(summary.data!.company_id).toBe(company.id);
    expect(Number(summary.data!.job_count)).toBeGreaterThan(0);
    expect(summary.data!.next_planned_date).not.toBeNull();
  });
});

describe("no expenditure ownership (§5D)", () => {
  it("creates no commitment, cash-flow or bookkeeping rows when generating jobs", async () => {
    const tables = ["commitments", "cash_flow_entries", "bank_transactions"];
    const counts = async () =>
      Promise.all(
        tables.map(async (table) => {
          const res = await admin
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id);
          return res.count ?? 0;
        }),
      );

    const before = await counts();
    await makeSchedule("manager", { _frequency: "monthly", _start_date: inDays(3) });
    expectNoError(await generate("manager", 12), "generate");
    expect(await counts()).toEqual(before);
  });

  it("keeps the commitment link as the only financial path on a job", async () => {
    const id = await makeSchedule("manager", { _frequency: "annual", _start_date: inDays(11) });
    expectNoError(await generate("manager", 12), "generate");
    const jobs = await jobsFor(id);
    expect(jobs.every((j) => j.commitment_id === null)).toBe(true);

    const created = await rpc<string>("manager", "create_commitment_draft", {
      _company_id: company.id,
      _title: uniq("Boiler service commitment"),
      _commitment_type: "service_contract",
      _authorised_amount: 1_200,
    });
    expectNoError(created, "create commitment");
    expectNoError(
      await rpc("manager", "update_maintenance_job", {
        _job_id: jobs[0].id,
        _commitment_id: created.data,
      }),
      "link commitment",
    );
    const linked = await admin
      .from("maintenance_jobs")
      .select("commitment_id")
      .eq("id", jobs[0].id)
      .single();
    expect(linked.data!.commitment_id).toBe(created.data);
  });
});
