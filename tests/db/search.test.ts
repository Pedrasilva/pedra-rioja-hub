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
 * Phase 8D — cross-entity search.
 *
 * The search index is the only place that decides where a result lives. These
 * tests hold it to three promises: it covers every operational entity, every
 * row addresses a route the application actually serves, and it never leaks
 * across companies (security_invoker + RLS, not a filter in the client).
 */

const PASSWORD = "QaPedraRioja!2026";

/** Routes the application really serves. A search hit outside this set is dead. */
const ROUTE_PATTERNS: RegExp[] = [
  /^\/properties$/,
  /^\/properties\/[0-9a-f-]{36}$/,
  /^\/financing\/[0-9a-f-]{36}$/,
  /^\/commitments\/[0-9a-f-]{36}$/,
  /^\/budgets\/[0-9a-f-]{36}$/,
  /^\/operations$/,
  /^\/bookkeeping$/,
];

const TAB_WHITELIST: Record<string, string[]> = {
  "/properties": [
    "overview",
    "details",
    "financing",
    "tenancies",
    "projects",
    "valuations",
    "insurance",
    "depreciation",
    "documents",
    "timeline",
  ],
  "/operations": [
    "reminders",
    "obligations",
    "contracts",
    "insurance",
    "utilities",
    "tax",
    "preventive",
    "maintenance",
    "capex",
  ],
  "/bookkeeping": ["purchases", "sales", "counterparties", "classifications", "rules", "periods"],
};

function assertNavigable(urlPath: string) {
  const [path, queryString] = urlPath.split("?");
  expect(ROUTE_PATTERNS.some((re) => re.test(path)), `unsupported route: ${urlPath}`).toBe(true);
  if (!queryString) return;
  const params = new URLSearchParams(queryString);
  const tab = params.get("tab");
  if (!tab) return;
  const base = path.startsWith("/properties") ? "/properties" : path;
  expect(TAB_WHITELIST[base] ?? [], `unknown tab in ${urlPath}`).toContain(tab);
}

let company: TestCompany;
let other: TestCompany;
let owner: SupabaseClient;
let otherOwner: SupabaseClient;
let propertyId: string;

let seq = 0;
const uniq = (label: string) => `${label} ${Date.now()}-${++seq}`;

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

async function createRoleUser(role: string, companyId: string, prefix: string) {
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

async function insert(table: string, row: Record<string, unknown>) {
  const res = await admin.from(table).insert(row).select("id").single();
  expectNoError(res, `insert ${table}`);
  return (res.data as { id: string }).id;
}

async function search(client: SupabaseClient, term: string, companyId: string) {
  const res = await client
    .from("v_search_index")
    .select("company_id, entity_type, entity_id, title, subtitle, url_path, occurred_at")
    .eq("company_id", companyId)
    .ilike("search_text", `%${term}%`)
    .limit(100);
  expectNoError(res, "search");
  return (res.data ?? []) as {
    company_id: string;
    entity_type: string;
    entity_id: string;
    title: string | null;
    url_path: string | null;
  }[];
}

const MARKER = `Marker${Date.now()}`;

beforeAll(async () => {
  company = await createTestCompany("search");
  other = await createTestCompany("search-other");
  owner = await createRoleUser("owner", company.id, "search");
  otherOwner = await createRoleUser("owner", other.id, "search-other");

  propertyId = await insert("properties", {
    company_id: company.id,
    name: uniq(`${MARKER} property`),
    property_type: "apartment",
    status: "owned",
  });

  const counterpartyId = await insert("counterparties", {
    company_id: company.id,
    name: uniq(`${MARKER} supplier`),
  });

  await insert("commitments", {
    company_id: company.id,
    title: uniq(`${MARKER} commitment`),
    counterparty_id: counterpartyId,
  });

  const budgetId = await insert("budgets", {
    company_id: company.id,
    name: uniq(`${MARKER} budget`),
    fiscal_year: 2026,
  });
  expect(budgetId).toBeTruthy();

  const scheduleId = await insert("maintenance_schedules", {
    company_id: company.id,
    title: uniq(`${MARKER} schedule`),
    property_id: propertyId,
    frequency: "quarterly",
    start_date: "2026-01-15",
  });

  await insert("maintenance_jobs", {
    company_id: company.id,
    title: uniq(`${MARKER} job`),
    schedule_id: scheduleId,
    property_id: propertyId,
    planned_date: "2026-02-15",
  });

  // Same marker in the other company: proves isolation, not just filtering.
  await insert("properties", {
    company_id: other.id,
    name: uniq(`${MARKER} foreign property`),
    property_type: "apartment",
    status: "owned",
  });
});

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(other);
});

describe("cross-entity search index", () => {
  it("covers commitments, budgets, maintenance and counterparties", async () => {
    const rows = await search(owner, MARKER, company.id);
    const types = new Set(rows.map((r) => r.entity_type));
    for (const type of [
      "property",
      "commitment",
      "budget",
      "maintenance_schedule",
      "maintenance_job",
      "counterparty",
    ]) {
      expect(types, `missing ${type} in search index`).toContain(type);
    }
  });

  it("gives every hit a title and a destination", async () => {
    const rows = await search(owner, MARKER, company.id);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.title, `no title for ${row.entity_type}`).toBeTruthy();
      expect(row.url_path, `no route for ${row.entity_type}`).toBeTruthy();
    }
  });

  it("routes every hit to a route the application serves", async () => {
    const rows = await search(owner, MARKER, company.id);
    for (const row of rows) assertNavigable(row.url_path!);
  });

  it("never emits the retired per-entity routes", async () => {
    const rows = await search(owner, MARKER, company.id);
    for (const row of rows) {
      expect(row.url_path!).not.toMatch(/^\/documents\//);
      expect(row.url_path!).not.toMatch(/^\/tenants\//);
      expect(row.url_path!).not.toMatch(/^\/projects\//);
    }
  });

  it("keeps results inside the caller's company", async () => {
    const foreign = await search(otherOwner, MARKER, company.id);
    expect(foreign).toHaveLength(0);

    const own = await search(otherOwner, MARKER, other.id);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r) => r.company_id === other.id)).toBe(true);
  });

  it("is unreachable anonymously", async () => {
    const res = await anonClient()
      .from("v_search_index")
      .select("entity_id")
      .eq("company_id", company.id);
    expect(res.data ?? []).toHaveLength(0);
  });
});
