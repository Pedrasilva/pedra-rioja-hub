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
 * Phase 8F.2 — the acquisition pipeline.
 *
 * A deal is an operational record. It tracks the conversation from lead to an
 * accepted offer and nothing else: no journal, no payment, no bank
 * transaction, no cash-flow entry and no commitment unless a person explicitly
 * asks for one (§5C, §5D).
 */

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
const MANAGE_ROLES: Role[] = ["owner", "manager"];
const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let other: TestCompany;
let otherOwner: SupabaseClient;
const clients = {} as Record<Role, SupabaseClient>;

let seq = 0;
const uniq = (label: string) => `${label}-${Date.now()}-${++seq}`;

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

async function createRoleUser(role: string, companyId: string, prefix = "acq") {
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

/* -------------------------------------------------------------- fixtures */

async function newOpportunity(
  client: SupabaseClient = clients.manager,
  companyId = company.id,
  overrides: Record<string, unknown> = {},
) {
  return client.rpc("create_acquisition_opportunity", {
    _company_id: companyId,
    _title: uniq("Calle Mayor"),
    _opportunity_type: "mixed_use",
    _asking_price: 1_000_000,
    _probability: 40,
    ...overrides,
  });
}

/** Walks a deal up to the stage requested, using only permitted transitions. */
async function driveTo(id: string, stage: string) {
  const path: Record<string, string[]> = {
    initial_review: ["initial_review"],
    under_analysis: ["initial_review", "under_analysis"],
    offer_preparation: ["initial_review", "under_analysis", "offer_preparation"],
    offer_submitted: ["initial_review", "under_analysis", "offer_preparation", "offer_submitted"],
    negotiation: [
      "initial_review",
      "under_analysis",
      "offer_preparation",
      "offer_submitted",
      "negotiation",
    ],
    offer_accepted: [
      "initial_review",
      "under_analysis",
      "offer_preparation",
      "offer_submitted",
      "offer_accepted",
    ],
  };
  for (const step of path[stage] ?? []) {
    const actor = step === "offer_accepted" ? clients.owner : clients.manager;
    const res = await actor.rpc("move_acquisition_stage", {
      _opportunity_id: id,
      _stage: step,
      _reason: `Moving to ${step}`,
    });
    expectNoError(res, `move to ${step}`);
  }
}

beforeAll(async () => {
  company = await createTestCompany("acquisitions");
  other = await createTestCompany("acquisitions-other");
  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
  otherOwner = await createRoleUser("owner", other.id, "acq-other");
}, 240_000);

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(other);
});

/* ----------------------------------------------------------------- tests */

describe("creating and describing an opportunity", () => {
  it("creates a lead with a generated reference and no accounting value", async () => {
    const res = await newOpportunity();
    expectNoError(res, "create opportunity");
    const row = await admin
      .from("acquisition_opportunities")
      .select("*")
      .eq("id", res.data as string)
      .single();
    expect(row.data!.stage).toBe("lead");
    expect(String(row.data!.reference)).toMatch(/^AO-/);
    expect(row.data!.archived_at).toBeNull();
    // The deal holds indicative estimates only — never a posted amount.
    const columns = Object.keys(row.data!);
    for (const forbidden of ["total_amount", "posted_amount", "journal_id", "payment_id"]) {
      expect(columns).not.toContain(forbidden);
    }
  });

  it("derives a weighted estimate in the view rather than storing one", async () => {
    const id = (await newOpportunity(clients.manager, company.id, {
      _asking_price: 800_000,
      _probability: 25,
    })).data as string;
    const view = await admin
      .from("v_acquisition_pipeline")
      .select("weighted_estimate, activity_count, offer_count, linked_commitment_count")
      .eq("opportunity_id", id)
      .single();
    expect(Number(view.data!.weighted_estimate)).toBe(200_000);
    expect(view.data!.activity_count).toBe(0);
    expect(view.data!.offer_count).toBe(0);
    expect(view.data!.linked_commitment_count).toBe(0);
    expect(Object.keys(
      (await admin.from("acquisition_opportunities").select("*").eq("id", id).single()).data!,
    )).not.toContain("weighted_estimate");
  });

  it("updates the descriptive fields without touching the stage", async () => {
    const id = (await newOpportunity()).data as string;
    expectNoError(
      await clients.assistant.rpc("update_acquisition_opportunity", {
        _opportunity_id: id,
        _location: "Logroño",
        _notes: "Owner keen to close before the summer",
      }),
      "update opportunity",
    );
    const row = await admin
      .from("acquisition_opportunities")
      .select("location, notes, stage")
      .eq("id", id)
      .single();
    expect(row.data!.location).toBe("Logroño");
    expect(row.data!.stage).toBe("lead");
  });
});

describe("the stage flow", () => {
  it("walks lead → initial review → analysis → offer prep → submitted → accepted", async () => {
    const id = (await newOpportunity()).data as string;
    await driveTo(id, "offer_accepted");
    const row = await admin
      .from("acquisition_opportunities")
      .select("stage, decision, probability, decided_at")
      .eq("id", id)
      .single();
    expect(row.data!.stage).toBe("offer_accepted");
    expect(row.data!.decision).toBe("accepted");
    expect(row.data!.probability).toBe(100);
    expect(row.data!.decided_at).not.toBeNull();

    const events = await admin
      .from("acquisition_stage_events")
      .select("from_stage, to_stage")
      .eq("opportunity_id", id)
      .order("occurred_at", { ascending: true });
    expect(events.data!).toHaveLength(5);
    expect(events.data![0].from_stage).toBe("lead");
  });

  it("refuses a jump the flow does not allow", async () => {
    const id = (await newOpportunity()).data as string;
    const jump = await clients.manager.rpc("move_acquisition_stage", {
      _opportunity_id: id,
      _stage: "offer_accepted",
    });
    expect(jump.error?.message ?? "").toMatch(/cannot move from/i);

    const same = await clients.manager.rpc("move_acquisition_stage", {
      _opportunity_id: id,
      _stage: "lead",
    });
    expect(same.error?.message ?? "").toMatch(/already at that stage/i);
  });

  it("reserves accepting and reopening for managing roles", async () => {
    const id = (await newOpportunity()).data as string;
    await driveTo(id, "offer_submitted");

    for (const role of ROLES) {
      if (MANAGE_ROLES.includes(role) || !RECORD_ROLES.includes(role)) continue;
      const res = await clients[role].rpc("move_acquisition_stage", {
        _opportunity_id: id,
        _stage: "offer_accepted",
      });
      expect(res.error?.message ?? "").toMatch(/permission/i);
    }

    expectNoError(
      await clients.manager.rpc("move_acquisition_stage", {
        _opportunity_id: id,
        _stage: "offer_rejected",
        _reason: "Priced above our limit",
      }),
      "reject the deal",
    );

    const reopenAsAssistant = await clients.assistant.rpc("move_acquisition_stage", {
      _opportunity_id: id,
      _stage: "under_analysis",
    });
    expect(reopenAsAssistant.error?.message ?? "").toMatch(/permission/i);

    expectNoError(
      await clients.owner.rpc("move_acquisition_stage", {
        _opportunity_id: id,
        _stage: "under_analysis",
        _reason: "Seller came back down",
      }),
      "reopen the deal",
    );
    const row = await admin
      .from("acquisition_opportunities")
      .select("stage, decision")
      .eq("id", id)
      .single();
    expect(row.data!.stage).toBe("under_analysis");
    expect(row.data!.decision).toBeNull();

    const reopened = await admin
      .from("acquisition_stage_events")
      .select("is_reopen")
      .eq("opportunity_id", id)
      .eq("is_reopen", true);
    expect(reopened.data!.length).toBeGreaterThan(0);
  });

  it("archives instead of deleting, and refuses to move an archived deal", async () => {
    const id = (await newOpportunity()).data as string;
    const noRights = await clients.assistant.rpc("archive_acquisition_opportunity", {
      _opportunity_id: id,
    });
    expect(noRights.error?.message ?? "").toMatch(/permission/i);

    expectNoError(
      await clients.owner.rpc("archive_acquisition_opportunity", {
        _opportunity_id: id,
        _reason: "Seller withdrew",
      }),
      "archive",
    );
    const move = await clients.manager.rpc("move_acquisition_stage", {
      _opportunity_id: id,
      _stage: "initial_review",
    });
    expect(move.error?.message ?? "").toMatch(/archived/i);

    expectNoError(
      await clients.owner.rpc("restore_acquisition_opportunity", { _opportunity_id: id }),
      "restore",
    );
    const row = await admin
      .from("acquisition_opportunities")
      .select("archived_at")
      .eq("id", id)
      .single();
    expect(row.data!.archived_at).toBeNull();
  });
});

describe("activity, tasks, valuations and offers", () => {
  it("keeps a timeline and a task list", async () => {
    const id = (await newOpportunity()).data as string;
    expectNoError(
      await clients.assistant.rpc("record_acquisition_activity", {
        _opportunity_id: id,
        _activity_type: "site_visit",
        _summary: "Walked the building with the broker",
      }),
      "record activity",
    );
    const task = await clients.assistant.rpc("create_acquisition_task", {
      _opportunity_id: id,
      _description: "Request the cadastral certificate",
      _due_date: "2026-04-01",
      _priority: "high",
    });
    expectNoError(task, "create task");

    expectNoError(
      await clients.assistant.rpc("set_acquisition_task_status", {
        _task_id: task.data as string,
        _status: "completed",
      }),
      "complete task",
    );

    const view = await admin
      .from("v_acquisition_pipeline")
      .select("activity_count, open_task_count")
      .eq("opportunity_id", id)
      .single();
    expect(view.data!.activity_count).toBe(1);
    expect(view.data!.open_task_count).toBe(0);
  });

  it("records valuations as informational estimates only", async () => {
    const id = (await newOpportunity()).data as string;
    expectNoError(
      await clients.bookkeeper.rpc("record_acquisition_valuation", {
        _opportunity_id: id,
        _estimated_value: 1_150_000,
        _method: "comparable",
      }),
      "record valuation",
    );
    const view = await admin
      .from("v_acquisition_pipeline")
      .select("latest_valuation")
      .eq("opportunity_id", id)
      .single();
    expect(Number(view.data!.latest_valuation)).toBe(1_150_000);

    // A valuation is not an asset value: no property carries it.
    const properties = await admin
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    expect(properties.count ?? 0).toBe(0);
  });

  it("numbers offers, keeps their history and gates acceptance", async () => {
    const id = (await newOpportunity()).data as string;
    const first = await clients.manager.rpc("record_acquisition_offer", {
      _opportunity_id: id,
      _amount: 900_000,
      _submitted_on: "2026-03-01",
    });
    expectNoError(first, "first offer");
    const second = await clients.manager.rpc("record_acquisition_offer", {
      _opportunity_id: id,
      _amount: 950_000,
      _submitted_on: "2026-03-15",
    });
    expectNoError(second, "second offer");

    const offers = await admin
      .from("acquisition_offers")
      .select("offer_no, amount, status")
      .eq("opportunity_id", id)
      .order("offer_no");
    expect(offers.data!.map((o) => o.offer_no)).toEqual([1, 2]);

    const acceptAsAssistant = await clients.assistant.rpc("decide_acquisition_offer", {
      _offer_id: second.data as string,
      _decision: "accepted",
    });
    expect(acceptAsAssistant.error?.message ?? "").toMatch(/permission/i);

    expectNoError(
      await clients.assistant.rpc("decide_acquisition_offer", {
        _offer_id: first.data as string,
        _decision: "withdrawn",
        _notes: "Superseded",
      }),
      "withdraw first offer",
    );
    expectNoError(
      await clients.owner.rpc("decide_acquisition_offer", {
        _offer_id: second.data as string,
        _decision: "accepted",
      }),
      "accept second offer",
    );

    const twice = await clients.owner.rpc("decide_acquisition_offer", {
      _offer_id: second.data as string,
      _decision: "rejected",
    });
    expect(twice.error?.message ?? "").toMatch(/only a submitted offer/i);
  });
});

describe("the deal owns no financial value", () => {
  it("creates no commitment, journal, payment or cash-flow entry on its own", async () => {
    const before = {
      commitments: (
        await admin
          .from("commitments")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
      ).count,
      cash: (
        await admin
          .from("cash_flow_entries")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
      ).count,
      docs: (
        await admin
          .from("financial_documents")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
      ).count,
      bank: (
        await admin
          .from("bank_transactions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
      ).count,
    };

    const id = (await newOpportunity()).data as string;
    await clients.manager.rpc("record_acquisition_valuation", {
      _opportunity_id: id,
      _estimated_value: 990_000,
    });
    const offer = await clients.manager.rpc("record_acquisition_offer", {
      _opportunity_id: id,
      _amount: 960_000,
    });
    await driveTo(id, "offer_accepted");
    await clients.owner.rpc("decide_acquisition_offer", {
      _offer_id: offer.data as string,
      _decision: "accepted",
    });

    const after = {
      commitments: (
        await admin
          .from("commitments")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
      ).count,
      cash: (
        await admin
          .from("cash_flow_entries")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
      ).count,
      docs: (
        await admin
          .from("financial_documents")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
      ).count,
      bank: (
        await admin
          .from("bank_transactions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
      ).count,
    };

    // Accepting the offer changed the deal, and nothing else in the ledger.
    expect(after).toEqual(before);
  });

  it("creates a commitment only when a person explicitly asks for one", async () => {
    const id = (await newOpportunity()).data as string;
    await driveTo(id, "offer_accepted");

    const created = await clients.manager.rpc("create_acquisition_commitment", {
      _opportunity_id: id,
      _title: "Acquisition — Calle Mayor",
      _authorised_amount: 960_000,
    });
    expectNoError(created, "create commitment from opportunity");

    const link = await admin
      .from("v_acquisition_commitment_link")
      .select("commitment_id, authorised_amount, commitment_status")
      .eq("opportunity_id", id)
      .single();
    expect(link.data!.commitment_id).toBeTruthy();
    expect(Number(link.data!.authorised_amount)).toBe(960_000);
    // The commitment starts in its own lifecycle, unapproved.
    expect(link.data!.commitment_status).toBe("draft");

    // The money belongs to the commitment, and the source link points home.
    const commitment = await admin
      .from("commitments")
      .select("source_type, source_id, authorised_amount")
      .eq("id", link.data!.commitment_id)
      .single();
    expect(commitment.data!.source_type).toBe("acquisition_opportunity");
    expect(commitment.data!.source_id).toBe(id);
  });

  it("links and unlinks an existing commitment without deleting the commitment", async () => {
    const id = (await newOpportunity()).data as string;
    const commitment = await clients.manager.rpc("create_commitment_draft", {
      _company_id: company.id,
      _title: uniq("Standalone commitment"),
      _commitment_type: "purchase_order",
      _authorised_amount: 50_000,
    });
    expectNoError(commitment, "create standalone commitment");

    const link = await clients.manager.rpc("link_acquisition_commitment", {
      _opportunity_id: id,
      _commitment_id: commitment.data as string,
      _reason: "Same deal",
    });
    expectNoError(link, "link commitment");

    expectNoError(
      await clients.manager.rpc("unlink_acquisition_commitment", { _link_id: link.data as string }),
      "unlink commitment",
    );
    const survived = await admin
      .from("commitments")
      .select("id", { count: "exact", head: true })
      .eq("id", commitment.data as string);
    expect(survived.count ?? 0).toBe(1);
  });

  it("refuses a commitment from another company", async () => {
    const id = (await newOpportunity()).data as string;
    const foreign = await otherOwner.rpc("create_commitment_draft", {
      _company_id: other.id,
      _title: uniq("Foreign commitment"),
      _commitment_type: "purchase_order",
      _authorised_amount: 10_000,
    });
    expectNoError(foreign, "create foreign commitment");
    const link = await clients.manager.rpc("link_acquisition_commitment", {
      _opportunity_id: id,
      _commitment_id: foreign.data as string,
    });
    expect(link.error?.message ?? "").toMatch(/unknown commitment/i);
  });
});

describe("permissions, isolation and write protection", () => {
  it("lets recording roles create a deal and refuses the rest", async () => {
    for (const role of ROLES) {
      const res = await newOpportunity(clients[role]);
      if (RECORD_ROLES.includes(role)) {
        expectNoError(res, `create as ${role}`);
      } else {
        expect(res.error?.message ?? "").toMatch(/permission/i);
      }
    }
  });

  it("refuses every direct write to the acquisition tables", async () => {
    const id = (await newOpportunity()).data as string;

    const insert = await clients.owner.from("acquisition_opportunities").insert({
      company_id: company.id,
      reference: uniq("HAND"),
      title: "Hand written",
    });
    expect(insert.error).not.toBeNull();

    await clients.owner
      .from("acquisition_opportunities")
      .update({ stage: "offer_accepted" })
      .eq("id", id);
    const unchanged = await admin
      .from("acquisition_opportunities")
      .select("stage")
      .eq("id", id)
      .single();
    expect(unchanged.data!.stage).toBe("lead");

    await clients.owner.from("acquisition_opportunities").delete().eq("id", id);
    const survived = await admin
      .from("acquisition_opportunities")
      .select("id", { count: "exact", head: true })
      .eq("id", id);
    expect(survived.count ?? 0).toBe(1);

    const offer = await clients.owner.from("acquisition_offers").insert({
      company_id: company.id,
      opportunity_id: id,
      offer_no: 1,
      amount: 1,
    });
    expect(offer.error).not.toBeNull();
  });

  it("keeps deals invisible across companies and to anonymous callers", async () => {
    await newOpportunity();
    const mine = await clients.viewer.from("acquisition_opportunities").select("company_id");
    expectNoError(mine, "viewer read");
    expect(mine.data!.every((r) => r.company_id === company.id)).toBe(true);
    expect(mine.data!.length).toBeGreaterThan(0);

    const foreign = await otherOwner.from("acquisition_opportunities").select("id");
    expect(foreign.data ?? []).toHaveLength(0);

    const anon = await anonClient().from("acquisition_opportunities").select("id");
    expect(anon.data ?? []).toHaveLength(0);

    const anonView = await anonClient().from("v_acquisition_pipeline").select("opportunity_id");
    expect(anonView.data ?? []).toHaveLength(0);
  });

  it("writes an audit row for every lifecycle change", async () => {
    const id = (await newOpportunity()).data as string;
    await driveTo(id, "under_analysis");
    const trail = await admin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "acquisition_opportunities")
      .eq("entity_id", id);
    expect(trail.count ?? 0).toBeGreaterThan(0);
  });
});
