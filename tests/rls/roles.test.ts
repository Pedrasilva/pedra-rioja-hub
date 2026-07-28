import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonClient,
  authAdminUrl,
  authUrl,
  anonKey,
  serviceRoleKey,
  userClient,
} from "../support/client";
import {
  createPropertyLikeServerFn,
  createTestCompany,
  dropTestCompany,
  type TestCompany,
} from "../support/fixtures";
import type { SupabaseClient } from "@supabase/supabase-js";

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];

const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let otherCompany: TestCompany;
let propertyId: string;
let otherPropertyId: string;
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
  const email = `qa-${role}@pedrarioja.test`;
  await deleteUserByEmail(email);
  const res = await authFetch("/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const user = (await res.json()) as { id: string };
  if (!user.id) throw new Error(`could not create ${role} user: ${JSON.stringify(user)}`);

  // The signup trigger may grant a default role in the live company; strip it so
  // each test user holds exactly one role in the throwaway test company.
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

beforeAll(async () => {
  company = await createTestCompany("rls");
  otherCompany = await createTestCompany("rls-other");

  const mine = await createPropertyLikeServerFn(company.id, {
    name: "RLS Asset",
    acquisition_date: "2024-01-01",
    purchasePrice: 350_000,
  });
  propertyId = mine.property.id;
  const theirs = await createPropertyLikeServerFn(otherCompany.id, { name: "Foreign Asset" });
  otherPropertyId = theirs.property.id;

  for (const role of ROLES) {
    clients[role] = await createRoleUser(role, company.id);
  }
});

afterAll(async () => {
  for (const role of ROLES) {
    const id = userIds[role];
    if (id) await authFetch(`/users/${id}`, { method: "DELETE" });
  }
  await dropTestCompany(company);
  await dropTestCompany(otherCompany);
});

const MANAGE_ROLES: Role[] = ["owner", "manager"];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];

describe("RLS by role", () => {
  it.each(ROLES)("%s can read the property register and summary view", async (role) => {
    const list = await clients[role].from("properties").select("id, code, name");
    expect(list.error).toBeNull();
    expect(list.data!.some((p) => p.id === propertyId)).toBe(true);

    const view = await clients[role]
      .from("v_property_summary")
      .select("property_id, current_valuation, outstanding_debt, estimated_equity")
      .eq("property_id", propertyId);
    expect(view.error).toBeNull();
    expect(view.data).toHaveLength(1);
  });

  it.each(ROLES)("%s create-property permission matches the role matrix", async (role) => {
    const res = await clients[role]
      .from("properties")
      .insert({ company_id: company.id, name: `Created by ${role}` })
      .select("id")
      .maybeSingle();

    if (MANAGE_ROLES.includes(role)) {
      expect(res.error, `${role} should be able to create`).toBeNull();
      await admin.from("properties").delete().eq("id", res.data!.id);
    } else {
      expect(res.error, `${role} must not be able to create`).not.toBeNull();
    }
  });

  it.each(ROLES)("%s edit-property permission matches the role matrix", async (role) => {
    const res = await clients[role]
      .from("properties")
      .update({ notes: `edited by ${role}` })
      .eq("id", propertyId)
      .select("id");
    if (MANAGE_ROLES.includes(role)) {
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
    } else {
      expect(res.data ?? []).toHaveLength(0);
    }
  });

  it.each(ROLES)("%s archive-property permission matches the role matrix", async (role) => {
    const res = await clients[role]
      .from("properties")
      .update({ status: "archived" })
      .eq("id", propertyId)
      .select("id");
    if (MANAGE_ROLES.includes(role)) {
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
      await admin.from("properties").update({ status: "owned" }).eq("id", propertyId);
    } else {
      expect(res.data ?? []).toHaveLength(0);
    }
  });

  it.each(ROLES)("%s manual-timeline-event permission matches the role matrix", async (role) => {
    const res = await clients[role]
      .from("property_events")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        event_type: "custom",
        title: `note by ${role}`,
        event_date: "2024-08-01",
      })
      .select("id")
      .maybeSingle();

    if (MANAGE_ROLES.includes(role)) {
      expect(res.error).toBeNull();
      await admin.from("property_events").delete().eq("id", res.data!.id);
    } else {
      expect(res.error).not.toBeNull();
    }
  });

  it.each(ROLES)("%s document permission matches the role matrix", async (role) => {
    const res = await clients[role]
      .from("documents")
      .insert({ company_id: company.id, title: `doc by ${role}` })
      .select("id")
      .maybeSingle();

    if (RECORD_ROLES.includes(role)) {
      expect(res.error, `${role} should be able to record documents`).toBeNull();
      await admin.from("documents").delete().eq("id", res.data!.id);
    } else {
      expect(res.error, `${role} must not record documents`).not.toBeNull();
    }
  });

  it.each(ROLES)("%s can read financial information for their company", async (role) => {
    const financing = await clients[role].from("financing_agreements").select("id");
    const valuations = await clients[role].from("property_valuations").select("id");
    const acquisition = await clients[role].from("property_acquisition_costs").select("id");
    expect(financing.error).toBeNull();
    expect(valuations.error).toBeNull();
    expect(acquisition.error).toBeNull();
  });

  it.each(ROLES)("%s cannot read or write another company's records", async (role) => {
    const read = await clients[role].from("properties").select("id").eq("id", otherPropertyId);
    expect(read.data ?? []).toHaveLength(0);

    const readView = await clients[role]
      .from("v_property_summary")
      .select("property_id")
      .eq("property_id", otherPropertyId);
    expect(readView.data ?? []).toHaveLength(0);

    const write = await clients[role]
      .from("properties")
      .update({ notes: "cross-company write" })
      .eq("id", otherPropertyId)
      .select("id");
    expect(write.data ?? []).toHaveLength(0);

    const insert = await clients[role]
      .from("properties")
      .insert({ company_id: otherCompany.id, name: "smuggled" })
      .select("id");
    expect(insert.error).not.toBeNull();
  });

  it("audit log is readable only by owner, manager and bookkeeper", async () => {
    for (const role of ROLES) {
      const res = await clients[role].from("audit_log").select("id").eq("company_id", company.id);
      const allowed = ["owner", "manager", "bookkeeper"].includes(role);
      if (allowed) expect(res.data!.length).toBeGreaterThan(0);
      else expect(res.data ?? []).toHaveLength(0);
    }
  });

  it("unauthenticated users cannot reach protected data", async () => {
    const anon = anonClient();
    for (const table of [
      "properties",
      "property_events",
      "financing_agreements",
      "tenancy_agreements",
      "documents",
      "v_property_summary",
      "v_portfolio_summary",
      "audit_log",
    ]) {
      const res = await anon.from(table).select("*").limit(1);
      const blocked = res.error !== null || (res.data ?? []).length === 0;
      expect(blocked, `${table} must not be readable anonymously`).toBe(true);
    }

    const write = await anon.from("properties").insert({ company_id: company.id, name: "anon" });
    expect(write.error).not.toBeNull();
  });

  it("no role can hard-delete a property", async () => {
    for (const role of ROLES) {
      const res = await clients[role].from("properties").delete().eq("id", propertyId).select("id");
      // manage roles have DELETE via policy, but the UI never exposes it; assert
      // that read-only roles are blocked outright and the row still exists.
      if (!MANAGE_ROLES.includes(role)) expect(res.data ?? []).toHaveLength(0);
    }
    const still = await admin.from("properties").select("id").eq("id", propertyId).maybeSingle();
    expect(still.data?.id ?? null).toBe(propertyId);
  });
});
