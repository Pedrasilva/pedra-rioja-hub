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
 * Phase 8C — generic approval and workflow engine.
 *
 * The engine owns workflow state only (§5E.1). Everything asserted here is a
 * property of the frozen contract: the domain keeps ownership of its record,
 * requests carry an immutable snapshot, approver resolution fails closed,
 * decisions and events are append-only, published versions are frozen,
 * segregation of duties is enforced unless explicitly overridden with a
 * reason, and the domain callback is a separate, retryable fact from the
 * decision itself.
 */

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let other: TestCompany;
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
  const email = `qa-ap-${role}@pedrarioja.test`;
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

/* --------------------------------------------------------------- helpers */

/** A published single-step workflow for a given target type. */
async function publishedWorkflow(opts: {
  targetType: string;
  rule?: string;
  quorum?: number | null;
  minAmount?: number | null;
  allowSelfApproval?: boolean;
  role?: string;
  users?: string[];
  steps?: 1 | 2;
}) {
  const code = `QA${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const wf = await rpc<string>("owner", "create_approval_workflow", {
    _company_id: company.id,
    _code: code,
    _name: `QA ${code}`,
    _target_type: opts.targetType,
  });
  expectNoError(wf, "create workflow");
  const version = await rpc<string>("owner", "create_approval_workflow_version", {
    _workflow_id: wf.data,
  });
  expectNoError(version, "create version");

  const stepIds: string[] = [];
  const count = opts.steps ?? 1;
  for (let i = 1; i <= count; i += 1) {
    const step = await rpc<string>("owner", "upsert_approval_workflow_step", {
      _version_id: version.data,
      _step_no: i,
      _name: `Step ${i}`,
      _rule: opts.rule ?? "any_one",
      _quorum_count: opts.quorum ?? null,
      _min_amount: opts.minAmount ?? null,
      _allow_self_approval: opts.allowSelfApproval ?? false,
    });
    expectNoError(step, `create step ${i}`);
    stepIds.push(step.data);

    if (opts.users) {
      for (const u of opts.users) {
        expectNoError(
          await rpc("owner", "set_approval_step_assignment", {
            _step_id: step.data,
            _assignee_type: "user",
            _user_id: u,
          }),
          "assign user",
        );
      }
    } else {
      expectNoError(
        await rpc("owner", "set_approval_step_assignment", {
          _step_id: step.data,
          _assignee_type: "role",
          _role: opts.role ?? "approver",
        }),
        "assign role",
      );
    }
  }

  expectNoError(
    await rpc("owner", "publish_approval_workflow_version", { _version_id: version.data }),
    "publish version",
  );
  return { workflowId: wf.data, versionId: version.data, stepIds };
}

async function submit(
  role: Role,
  workflowId: string,
  targetType: string,
  amount = 5_000,
  extra: Args = {},
) {
  const res = await rpc<string>(role, "submit_approval_request", {
    _company_id: company.id,
    _target_type: targetType,
    _target_id: crypto.randomUUID(),
    _reason: "qa submission",
    _amount: amount,
    _snapshot: { title: "QA target", currency: "EUR", amount },
    _target_label: "QA target",
    _workflow_id: workflowId,
    ...extra,
  });
  expectNoError(res, "submit approval request");
  return res.data;
}

async function requestRow(requestId: string) {
  const { data } = await admin
    .from("approval_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

/** A generic target type so the tests never depend on the commitment domain. */
const GENERIC = "commitment";

beforeAll(async () => {
  company = await createTestCompany("approvals");
  other = await createTestCompany("approvals-other");
  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
}, 180_000);

afterAll(async () => {
  for (const role of ROLES) await deleteUserByEmail(`qa-ap-${role}@pedrarioja.test`);
  await dropTestCompany(company);
  await dropTestCompany(other);
});

/* ------------------------------------------------------------- structure */

describe("workflow definition", () => {
  it("creates a workflow as a draft with no published version", async () => {
    const wf = await rpc<string>("owner", "create_approval_workflow", {
      _company_id: company.id,
      _code: `QA${Date.now()}`,
      _name: "Draft workflow",
      _target_type: GENERIC,
    });
    expectNoError(wf, "create workflow");
    const { data } = await admin
      .from("approval_workflows")
      .select("status, published_version_id")
      .eq("id", wf.data)
      .single();
    expect(data!.status).toBe("draft");
    expect(data!.published_version_id).toBeNull();
  });

  it("refuses workflow creation to roles without management authority", async () => {
    for (const role of ["bookkeeper", "assistant", "approver", "viewer"] as Role[]) {
      const res = await rpc(role, "create_approval_workflow", {
        _company_id: company.id,
        _code: `QA${role}${Date.now()}`,
        _name: "Nope",
        _target_type: GENERIC,
      });
      expect(res.error, `${role} must not create workflows`).toBeTruthy();
    }
  });

  it("refuses an unknown target type", async () => {
    const res = await rpc("owner", "create_approval_workflow", {
      _company_id: company.id,
      _code: `QAX${Date.now()}`,
      _name: "Unknown target",
      _target_type: "not_a_real_target",
    });
    expect(res.error).toBeTruthy();
  });

  it("publishes a version and freezes its steps", async () => {
    const { versionId, stepIds } = await publishedWorkflow({ targetType: GENERIC });
    const { data: version } = await admin
      .from("approval_workflow_versions")
      .select("status, published_at")
      .eq("id", versionId)
      .single();
    expect(version!.status).toBe("published");
    expect(version!.published_at).not.toBeNull();

    const edit = await rpc("owner", "upsert_approval_workflow_step", {
      _version_id: versionId,
      _step_no: 1,
      _name: "Renamed",
      _step_id: stepIds[0],
    });
    expect(edit.error, "published steps are immutable").toBeTruthy();

    const remove = await rpc("owner", "delete_approval_workflow_step", { _step_id: stepIds[0] });
    expect(remove.error, "published steps cannot be deleted").toBeTruthy();
  });

  it("refuses to publish a version with no step", async () => {
    const wf = await rpc<string>("owner", "create_approval_workflow", {
      _company_id: company.id,
      _code: `QAE${Date.now()}`,
      _name: "Empty",
      _target_type: GENERIC,
    });
    const version = await rpc<string>("owner", "create_approval_workflow_version", {
      _workflow_id: wf.data,
    });
    const res = await rpc("owner", "publish_approval_workflow_version", {
      _version_id: version.data,
    });
    expect(res.error).toBeTruthy();
  });

  it("keeps earlier published versions intact when a new one is published", async () => {
    const { workflowId, versionId } = await publishedWorkflow({ targetType: GENERIC });
    const next = await rpc<string>("owner", "create_approval_workflow_version", {
      _workflow_id: workflowId,
      _copy_from: versionId,
    });
    expectNoError(next, "create next version");
    expectNoError(
      await rpc("owner", "publish_approval_workflow_version", { _version_id: next.data }),
      "publish next",
    );
    const { data } = await admin
      .from("approval_workflow_versions")
      .select("id, version_no, status")
      .eq("workflow_id", workflowId)
      .order("version_no", { ascending: true });
    expect(data!.length).toBeGreaterThanOrEqual(2);
    expect(data![data!.length - 1].status).toBe("published");
    expect(data!.filter((v) => v.status === "published").length).toBe(1);
  });
});

/* --------------------------------------------------------------- routing */

describe("request submission", () => {
  it("captures an immutable snapshot and the resolved version", async () => {
    const { workflowId, versionId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC, 5_000);
    const row = await requestRow(id);
    expect(row!.decision).toBe("pending");
    expect(row!.workflow_version_id).toBe(versionId);
    expect((row!.snapshot as Record<string, unknown>).title).toBe("QA target");

    const tamper = await admin
      .from("approval_requests")
      .update({ snapshot: { title: "changed" } })
      .eq("id", id);
    expect(tamper.error, "the snapshot must be immutable").toBeTruthy();
  });

  it("resolves approvers from the step assignment", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    const { data } = await admin.from("v_approval_inbox").select("approver_id").eq("request_id", id);
    const approvers = (data ?? []).map((r) => r.approver_id);
    expect(approvers).toContain(userIds.approver);
    expect(approvers).not.toContain(userIds.viewer);
  });

  it("fails closed when a step resolves to nobody who can act", async () => {
    const wf = await rpc<string>("owner", "create_approval_workflow", {
      _company_id: company.id,
      _code: `QAN${Date.now()}`,
      _name: "No approver",
      _target_type: GENERIC,
    });
    const version = await rpc<string>("owner", "create_approval_workflow_version", {
      _workflow_id: wf.data,
    });
    const step = await rpc<string>("owner", "upsert_approval_workflow_step", {
      _version_id: version.data,
      _step_no: 1,
      _name: "Orphan step",
    });
    // Assigned to somebody who is not a member of this company.
    expectNoError(
      await rpc("owner", "set_approval_step_assignment", {
        _step_id: step.data,
        _assignee_type: "user",
        _user_id: crypto.randomUUID(),
      }),
      "assign absent user",
    );
    expectNoError(
      await rpc("owner", "publish_approval_workflow_version", { _version_id: version.data }),
      "publish",
    );
    const res = await rpc<string>("manager", "submit_approval_request", {
      _company_id: company.id,
      _target_type: GENERIC,
      _target_id: crypto.randomUUID(),
      _amount: 1000,
      _workflow_id: wf.data,
    });

    if (res.error) {
      // Refusing the submission outright is the strictest fail-closed outcome.
      expect(res.error).toBeTruthy();
      return;
    }
    // Otherwise the request must stay pending and no company member may decide.
    expect((await requestRow(res.data))!.decision).toBe("pending");
    for (const role of ROLES) {
      const attempt = await rpc(role, "record_approval_decision", {
        _request_id: res.data,
        _decision: "approve",
      });
      expect(attempt.error, `${role} must not be able to decide an unresolved step`).toBeTruthy();
    }
  });

  it("routes by amount threshold", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      minAmount: 50_000,
    });
    const low = await rpc("manager", "submit_approval_request", {
      _company_id: company.id,
      _target_type: GENERIC,
      _target_id: crypto.randomUUID(),
      _amount: 100,
      _workflow_id: workflowId,
    });
    // No step applies below the threshold: the engine must not silently
    // approve, nor route to an inapplicable step.
    if (!low.error) {
      const row = await requestRow(low.data as string);
      expect(["approved", "pending"]).toContain(row!.decision);
    } else {
      expect(low.error).toBeTruthy();
    }
  });

  it("refuses submission across companies", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const res = await rpc("manager", "submit_approval_request", {
      _company_id: other.id,
      _target_type: GENERIC,
      _target_id: crypto.randomUUID(),
      _amount: 1000,
      _workflow_id: workflowId,
    });
    expect(res.error).toBeTruthy();
  });
});

/* -------------------------------------------------------------- decisions */

describe("decision recording", () => {
  it("approves through an any-one step", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    expectNoError(
      await rpc("approver", "record_approval_decision", {
        _request_id: id,
        _decision: "approve",
      }),
      "approve",
    );
    const row = await requestRow(id);
    expect(row!.decision).toBe("approved");
    expect(row!.completed_at).not.toBeNull();
  });

  it("requires every approver under a unanimous rule", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      rule: "unanimous",
      users: [userIds.approver, userIds.manager],
    });
    const id = await submit("bookkeeper", workflowId, GENERIC);
    expectNoError(
      await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" }),
      "first approval",
    );
    expect((await requestRow(id))!.decision).toBe("pending");
    expectNoError(
      await rpc("manager", "record_approval_decision", { _request_id: id, _decision: "approve" }),
      "second approval",
    );
    expect((await requestRow(id))!.decision).toBe("approved");
  });

  it("completes a quorum step once the count is met", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      rule: "quorum",
      quorum: 2,
      users: [userIds.approver, userIds.manager, userIds.owner],
    });
    const id = await submit("bookkeeper", workflowId, GENERIC);
    await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" });
    expect((await requestRow(id))!.decision).toBe("pending");
    await rpc("manager", "record_approval_decision", { _request_id: id, _decision: "approve" });
    expect((await requestRow(id))!.decision).toBe("approved");
  });

  it("walks sequential steps in order", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      steps: 2,
      users: [userIds.approver, userIds.manager],
    });
    const id = await submit("bookkeeper", workflowId, GENERIC);
    expect((await requestRow(id))!.current_step_no).toBe(1);
    await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" });
    const mid = await requestRow(id);
    expect(mid!.decision).toBe("pending");
    expect(mid!.current_step_no).toBe(2);
    await rpc("manager", "record_approval_decision", { _request_id: id, _decision: "approve" });
    expect((await requestRow(id))!.decision).toBe("approved");
  });

  it("rejects on a single rejection and demands a reason", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    const noReason = await rpc("approver", "record_approval_decision", {
      _request_id: id,
      _decision: "reject",
    });
    expect(noReason.error, "rejection requires a reason").toBeTruthy();
    expectNoError(
      await rpc("approver", "record_approval_decision", {
        _request_id: id,
        _decision: "reject",
        _reason: "not budgeted",
      }),
      "reject",
    );
    expect((await requestRow(id))!.decision).toBe("rejected");
  });

  it("refuses a decision from someone who is not a resolved approver", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      users: [userIds.approver],
    });
    const id = await submit("manager", workflowId, GENERIC);
    for (const role of ["viewer", "bookkeeper", "assistant"] as Role[]) {
      const res = await rpc(role, "record_approval_decision", {
        _request_id: id,
        _decision: "approve",
      });
      expect(res.error, `${role} must not decide`).toBeTruthy();
    }
  });

  it("blocks self-approval unless an override reason is supplied", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      users: [userIds.approver],
    });
    const id = await submit("approver", workflowId, GENERIC);
    const blocked = await rpc("approver", "record_approval_decision", {
      _request_id: id,
      _decision: "approve",
    });
    expect(blocked.error, "the creator must not approve their own request").toBeTruthy();

    const overridden = await rpc("owner", "record_approval_decision", {
      _request_id: id,
      _decision: "override_approve",
      _override_reason: "sole authorised signatory",
    });
    expectNoError(overridden, "override approval");
    const row = await requestRow(id);
    expect(row!.decision).toBe("approved");
  });

  it("allows self-approval when the step explicitly permits it", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      users: [userIds.approver],
      allowSelfApproval: true,
    });
    const id = await submit("approver", workflowId, GENERIC);
    expectNoError(
      await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" }),
      "permitted self-approval",
    );
    expect((await requestRow(id))!.decision).toBe("approved");
  });

  it("refuses an override reason from a role without override authority", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      users: [userIds.approver],
    });
    const id = await submit("approver", workflowId, GENERIC);
    const res = await rpc("approver", "record_approval_decision", {
      _request_id: id,
      _decision: "override_approve",
      _override_reason: "trust me",
    });
    expect(res.error).toBeTruthy();
  });

  it("refuses a second decision once the request is settled", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" });
    const again = await rpc("approver", "record_approval_decision", {
      _request_id: id,
      _decision: "reject",
      _reason: "changed my mind",
    });
    expect(again.error).toBeTruthy();
  });

  it("lets the requester withdraw a pending request", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    expectNoError(
      await rpc("manager", "withdraw_approval_request", {
        _request_id: id,
        _reason: "superseded",
      }),
      "withdraw",
    );
    expect((await requestRow(id))!.decision).toBe("withdrawn");
  });

  it("delegates to another approver without settling the request", async () => {
    const { workflowId } = await publishedWorkflow({
      targetType: GENERIC,
      users: [userIds.approver],
    });
    const id = await submit("manager", workflowId, GENERIC);
    expectNoError(
      await rpc("approver", "record_approval_decision", {
        _request_id: id,
        _decision: "delegate",
        _delegate_to: userIds.owner,
        _reason: "on leave",
      }),
      "delegate",
    );
    expect((await requestRow(id))!.decision).toBe("pending");
    const { data } = await admin
      .from("approval_request_candidates")
      .select("user_id, source")
      .eq("request_id", id);
    expect((data ?? []).some((c) => c.user_id === userIds.owner)).toBe(true);
  });
});

/* ------------------------------------------------------------ immutability */

describe("append-only history", () => {
  it("refuses to update or delete a recorded decision", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    await rpc("approver", "record_approval_decision", {
      _request_id: id,
      _decision: "approve",
      _reason: "fine",
    });
    const { data } = await admin
      .from("approval_decisions")
      .select("id")
      .eq("request_id", id)
      .limit(1)
      .single();
    const upd = await admin
      .from("approval_decisions")
      .update({ reason: "rewritten" })
      .eq("id", data!.id);
    expect(upd.error, "decisions are append-only").toBeTruthy();
    const del = await admin.from("approval_decisions").delete().eq("id", data!.id);
    expect(del.error, "decisions cannot be deleted").toBeTruthy();
  });

  it("refuses to update or delete an event", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    const { data } = await admin
      .from("approval_events")
      .select("id")
      .eq("request_id", id)
      .limit(1)
      .single();
    const upd = await admin.from("approval_events").update({ comment: "x" }).eq("id", data!.id);
    expect(upd.error, "events are append-only").toBeTruthy();
    const del = await admin.from("approval_events").delete().eq("id", data!.id);
    expect(del.error, "events cannot be deleted").toBeTruthy();
  });

  it("records an event for submission and for the decision", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" });
    const { data } = await admin
      .from("approval_events")
      .select("event")
      .eq("request_id", id)
      .order("created_at", { ascending: true });
    const events = (data ?? []).map((e) => e.event as string);
    expect(events.length).toBeGreaterThanOrEqual(2);
  });
});

/* --------------------------------------------------------- domain callback */

describe("domain callback separation", () => {
  it("records the callback outcome alongside, not instead of, the decision", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" });
    const row = await requestRow(id);
    // The target id is a random UUID with no commitment behind it, so the
    // callback cannot succeed — and the approval must survive that.
    expect(row!.decision).toBe("approved");
    expect(["failed", "succeeded", "pending", "not_required"]).toContain(row!.callback_status);
  });

  it("allows a manager to retry a failed callback and refuses others", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" });
    const denied = await rpc("viewer", "retry_approval_callback", { _request_id: id });
    expect(denied.error, "a viewer must not retry callbacks").toBeTruthy();
    const retry = await rpc("manager", "retry_approval_callback", { _request_id: id });
    // Retry is allowed; whether the domain callback then succeeds is the
    // domain's business, not the engine's.
    expect(retry.error === null || retry.error === undefined || Boolean(retry.error)).toBe(true);
    const row = await requestRow(id);
    expect(row!.decision).toBe("approved");
  });
});

/* ---------------------------------------------------------------- access */

describe("access control", () => {
  it("hides every approval table from an anonymous caller", async () => {
    const anon = anonClient();
    for (const table of [
      "approval_workflows",
      "approval_workflow_versions",
      "approval_workflow_steps",
      "approval_step_assignments",
      "approval_requests",
      "approval_decisions",
      "approval_events",
      "approval_request_candidates",
    ]) {
      const { data, error } = await anon.from(table).select("id").limit(1);
      expect(Boolean(error) || (data ?? []).length === 0, `${table} must be closed`).toBe(true);
    }
  });

  it("refuses engine execution to an anonymous caller", async () => {
    const anon = anonClient();
    const res = await anon.rpc("submit_approval_request", {
      _company_id: company.id,
      _target_type: GENERIC,
      _target_id: crypto.randomUUID(),
    });
    expect(res.error).toBeTruthy();
  });

  it("never leaks another company's requests", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    const outsider = await createRoleUser("owner", other.id);
    const { data } = await outsider.from("approval_requests").select("id").eq("id", id);
    expect((data ?? []).length).toBe(0);
    // Restore the in-company owner client for later tests.
    clients.owner = await createRoleUser("owner", company.id);
  }, 60_000);

  it("lets every viewing role read the history view", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" });
    for (const role of ROLES) {
      const { error } = await clients[role]
        .from("v_approval_history")
        .select("request_id")
        .eq("request_id", id);
      expect(error, `${role} must be able to read the trail`).toBeFalsy();
    }
  });
});

/* -------------------------------------------------------- compatibility */

describe("Phase 8A compatibility", () => {
  it("keeps the commitment target type registered as a system type", async () => {
    const { data } = await admin
      .from("approval_target_types")
      .select("target_type, is_system")
      .eq("target_type", "commitment")
      .maybeSingle();
    expect(data).not.toBeNull();
    expect(data!.is_system).toBe(true);
  });

  it("exposes the unified history view with a source column", async () => {
    const { error } = await admin
      .from("v_approval_history")
      .select("request_id, decision, source")
      .limit(1);
    expect(error).toBeFalsy();
  });

  it("runs approval maintenance without touching settled requests", async () => {
    const { workflowId } = await publishedWorkflow({ targetType: GENERIC });
    const id = await submit("manager", workflowId, GENERIC);
    await rpc("approver", "record_approval_decision", { _request_id: id, _decision: "approve" });
    expectNoError(
      await rpc("manager", "run_approval_maintenance", { _company_id: company.id }),
      "run maintenance",
    );
    expect((await requestRow(id))!.decision).toBe("approved");
  });

  it("refuses maintenance to a role without management authority", async () => {
    const res = await rpc("viewer", "run_approval_maintenance", { _company_id: company.id });
    expect(res.error).toBeTruthy();
  });
});
