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
 * Phase 8F.1 — the financial execution core.
 *
 * A payment run sits between an approved invoice and the bank. It owns the
 * orchestration — which documents, in which batch, exported how, executed when
 * — and nothing else: no journal, no bank transaction, no cash-flow entry and
 * no amount of its own (§5C, §5D).
 */

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
const MANAGE_ROLES: Role[] = ["owner", "manager"];
const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let other: TestCompany;
let supplierId: string;
let otherSupplierId: string;
let otherOwner: SupabaseClient;
const clients = {} as Record<Role, SupabaseClient>;
const userIds = {} as Record<Role, string>;

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

async function createRoleUser(role: string, companyId: string, prefix = "pay") {
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
  if ((ROLES as readonly string[]).includes(role)) userIds[role as Role] = user.id;
  return userClient(session.access_token);
}

/* -------------------------------------------------------------- fixtures */

async function postedInvoice(
  companyId: string,
  amount: number,
  counterpartyId: string,
  overrides: Record<string, unknown> = {},
) {
  const doc = await admin
    .from("financial_documents")
    .insert({
      company_id: companyId,
      counterparty_id: counterpartyId,
      direction: "inbound",
      doc_type: "invoice",
      document_number: uniq("INV"),
      issue_date: "2026-02-01",
      due_date: "2026-03-01",
      ...overrides,
    })
    .select("id")
    .single();
  expectNoError(doc, "insert invoice");
  const line = await admin.from("financial_document_lines").insert({
    company_id: companyId,
    document_id: doc.data!.id,
    line_no: 1,
    quantity: 1,
    unit_price: amount,
    vat_rate: 0,
  });
  expectNoError(line, "insert invoice line");
  const posted = await admin
    .from("financial_documents")
    .update({ status: "posted" })
    .eq("id", doc.data!.id)
    .select("id, outstanding_amount")
    .single();
  expectNoError(posted, "post invoice");
  return posted.data! as { id: string; outstanding_amount: number };
}

async function newRun(client: SupabaseClient, companyId = company.id, title = "Supplier payments") {
  const res = await client.rpc("create_payment_run", {
    _company_id: companyId,
    _title: title,
    _scheduled_execution_date: "2026-03-05",
  });
  return res;
}

/** Drives a run all the way to approved through the generic approval engine. */
async function approveRun(runId: string) {
  const req = await clients.manager.rpc("request_payment_run_approval", { _run_id: runId });
  expectNoError(req, "request approval");
  const decision = await clients.owner.rpc("record_approval_decision", {
    _request_id: req.data as string,
    _decision: "approve",
    _reason: "Authority to pay",
    _override_reason: "Test authority",
  });
  expectNoError(decision, "approve run");
  return req.data as string;
}

beforeAll(async () => {
  company = await createTestCompany("payments");
  other = await createTestCompany("payments-other");

  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
  otherOwner = await createRoleUser("owner", other.id, "pay-other");

  const cp = await admin
    .from("counterparties")
    .insert({ company_id: company.id, name: "QA Supplier" })
    .select("id")
    .single();
  expectNoError(cp, "insert supplier");
  supplierId = cp.data!.id;

  const cp2 = await admin
    .from("counterparties")
    .insert({ company_id: company.id, name: "QA Supplier Two" })
    .select("id")
    .single();
  expectNoError(cp2, "insert second supplier");
  otherSupplierId = cp2.data!.id;
}, 240_000);

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(other);
});

/* ----------------------------------------------------------------- tests */

describe("building a payment run", () => {
  it("creates a draft run with a generated reference and no amount of its own", async () => {
    const res = await newRun(clients.manager);
    expectNoError(res, "create run");
    const row = await admin
      .from("payment_runs")
      .select("*")
      .eq("id", res.data as string)
      .single();
    expect(row.data!.status).toBe("draft");
    expect(row.data!.approval_status).toBe("not_requested");
    expect(String(row.data!.reference)).toMatch(/^PR-/);
    expect(Object.keys(row.data!)).not.toContain("total_amount");
  });

  it("groups instructions into one batch per supplier and currency", async () => {
    const runId = (await newRun(clients.manager)).data as string;
    const a = await postedInvoice(company.id, 500, supplierId);
    const b = await postedInvoice(company.id, 250, supplierId);
    const c = await postedInvoice(company.id, 125, otherSupplierId);

    for (const doc of [a, b, c]) {
      const res = await clients.manager.rpc("add_payment_instruction", {
        _run_id: runId,
        _document_id: doc.id,
      });
      expectNoError(res, "add instruction");
    }

    const batches = await admin
      .from("payment_batches")
      .select("id, counterparty_id")
      .eq("payment_run_id", runId);
    expect(batches.data!).toHaveLength(2);

    const summary = await admin
      .from("v_payment_run_summary")
      .select("instruction_count, batch_count, outstanding_total")
      .eq("payment_run_id", runId)
      .single();
    expect(summary.data!.instruction_count).toBe(3);
    expect(summary.data!.batch_count).toBe(2);
    expect(Number(summary.data!.outstanding_total)).toBe(875);
  });

  it("refuses drafts, sales documents, settled invoices and duplicates", async () => {
    const runId = (await newRun(clients.manager)).data as string;

    const draft = await admin
      .from("financial_documents")
      .insert({
        company_id: company.id,
        counterparty_id: supplierId,
        direction: "inbound",
        doc_type: "invoice",
        document_number: uniq("DRAFT"),
        issue_date: "2026-02-01",
      })
      .select("id")
      .single();
    const draftRes = await clients.manager.rpc("add_payment_instruction", {
      _run_id: runId,
      _document_id: draft.data!.id,
    });
    expect(draftRes.error?.message ?? "").toMatch(/posted/i);

    const sale = await postedInvoice(company.id, 300, supplierId, { direction: "outbound" });
    const saleRes = await clients.manager.rpc("add_payment_instruction", {
      _run_id: runId,
      _document_id: sale.id,
    });
    expect(saleRes.error?.message ?? "").toMatch(/payable/i);

    const paid = await postedInvoice(company.id, 100, supplierId);
    expectNoError(
      await clients.bookkeeper.rpc("settle_financial_document", {
        _document_id: paid.id,
        _amount: 100,
        _payment_date: "2026-02-20",
      }),
      "settle invoice",
    );
    const paidRes = await clients.manager.rpc("add_payment_instruction", {
      _run_id: runId,
      _document_id: paid.id,
    });
    expect(paidRes.error?.message ?? "").toMatch(/outstanding/i);

    const doc = await postedInvoice(company.id, 400, supplierId);
    expectNoError(
      await clients.manager.rpc("add_payment_instruction", {
        _run_id: runId,
        _document_id: doc.id,
      }),
      "add once",
    );
    const twice = await clients.manager.rpc("add_payment_instruction", {
      _run_id: runId,
      _document_id: doc.id,
    });
    expect(twice.error).not.toBeNull();

    const secondRun = (await newRun(clients.manager)).data as string;
    const elsewhere = await clients.manager.rpc("add_payment_instruction", {
      _run_id: secondRun,
      _document_id: doc.id,
    });
    expect(elsewhere.error?.message ?? "").toMatch(/another payment run/i);
  });

  it("removes a document from a draft run without deleting history", async () => {
    const runId = (await newRun(clients.manager)).data as string;
    const doc = await postedInvoice(company.id, 90, supplierId);
    const id = (
      await clients.manager.rpc("add_payment_instruction", {
        _run_id: runId,
        _document_id: doc.id,
      })
    ).data as string;

    expectNoError(
      await clients.manager.rpc("remove_payment_instruction", { _instruction_id: id }),
      "remove instruction",
    );
    const row = await admin
      .from("payment_instructions")
      .select("status")
      .eq("id", id)
      .single();
    expect(row.data!.status).toBe("cancelled");

    const summary = await admin
      .from("v_payment_run_summary")
      .select("instruction_count, outstanding_total")
      .eq("payment_run_id", runId)
      .single();
    expect(summary.data!.instruction_count).toBe(0);
    expect(Number(summary.data!.outstanding_total)).toBe(0);
  });
});

describe("approval, export and execution", () => {
  async function runWithOneInvoice(amount = 600) {
    const runId = (await newRun(clients.manager)).data as string;
    const doc = await postedInvoice(company.id, amount, supplierId);
    expectNoError(
      await clients.manager.rpc("add_payment_instruction", {
        _run_id: runId,
        _document_id: doc.id,
      }),
      "add instruction",
    );
    return { runId, doc };
  }

  it("requires at least one payable document before approval", async () => {
    const runId = (await newRun(clients.manager)).data as string;
    const res = await clients.manager.rpc("request_payment_run_approval", { _run_id: runId });
    expect(res.error?.message ?? "").toMatch(/at least one/i);
  });

  it("refuses to export before authority to pay is granted", async () => {
    const { runId } = await runWithOneInvoice();
    const early = await clients.manager.rpc("export_payment_run", {
      _run_id: runId,
      _format: "sepa_xml",
    });
    expect(early.error?.message ?? "").toMatch(/approved/i);

    await clients.manager.rpc("request_payment_run_approval", { _run_id: runId });
    const pending = await clients.manager.rpc("export_payment_run", {
      _run_id: runId,
      _format: "sepa_xml",
    });
    expect(pending.error?.message ?? "").toMatch(/approved/i);
  });

  it("walks draft → approved → exported → executed → completed", async () => {
    const { runId } = await runWithOneInvoice(720);
    await approveRun(runId);

    let row = await admin.from("payment_runs").select("*").eq("id", runId).single();
    expect(row.data!.status).toBe("approved");
    expect(row.data!.approval_status).toBe("approved");

    const exportRes = await clients.manager.rpc("export_payment_run", {
      _run_id: runId,
      _format: "sepa_xml",
      _file_name: "pr.xml",
      _content_hash: "abc123",
    });
    expectNoError(exportRes, "export run");

    row = await admin.from("payment_runs").select("*").eq("id", runId).single();
    expect(row.data!.status).toBe("exported");

    const exported = await admin
      .from("payment_run_exports")
      .select("format, file_name, content_hash, instruction_count")
      .eq("id", exportRes.data as string)
      .single();
    expect(exported.data!.format).toBe("sepa_xml");
    expect(exported.data!.instruction_count).toBe(1);

    const instructions = await admin
      .from("payment_instructions")
      .select("status")
      .eq("payment_run_id", runId);
    expect(instructions.data!.every((i) => i.status === "exported")).toBe(true);

    expectNoError(
      await clients.owner.rpc("execute_payment_run", {
        _run_id: runId,
        _execution_date: "2026-03-05",
      }),
      "execute run",
    );
    row = await admin.from("payment_runs").select("*").eq("id", runId).single();
    expect(row.data!.status).toBe("executed");
    expect(row.data!.actual_execution_date).toBe("2026-03-05");

    expectNoError(
      await clients.owner.rpc("complete_payment_run", { _run_id: runId, _notes: "All settled" }),
      "complete run",
    );
    row = await admin.from("payment_runs").select("*").eq("id", runId).single();
    expect(row.data!.status).toBe("completed");
  });

  it("keeps an executed run immutable and beyond cancellation", async () => {
    const { runId } = await runWithOneInvoice(310);
    await approveRun(runId);
    await clients.manager.rpc("export_payment_run", { _run_id: runId, _format: "csv" });
    await clients.owner.rpc("execute_payment_run", { _run_id: runId });

    const cancel = await clients.owner.rpc("cancel_payment_run", {
      _run_id: runId,
      _reason: "changed my mind",
    });
    expect(cancel.error?.message ?? "").toMatch(/no longer be cancelled/i);

    const edit = await clients.manager.rpc("update_payment_run", {
      _run_id: runId,
      _title: "Renamed",
    });
    expect(edit.error?.message ?? "").toMatch(/draft/i);
  });

  it("records a returned payment as failed without touching the invoice", async () => {
    const { runId, doc } = await runWithOneInvoice(180);
    await approveRun(runId);
    await clients.manager.rpc("export_payment_run", { _run_id: runId, _format: "csv" });
    await clients.owner.rpc("execute_payment_run", { _run_id: runId });

    const instruction = await admin
      .from("payment_instructions")
      .select("id")
      .eq("payment_run_id", runId)
      .single();
    expectNoError(
      await clients.owner.rpc("fail_payment_instruction", {
        _instruction_id: instruction.data!.id,
        _reason: "Returned by the bank",
      }),
      "fail instruction",
    );

    const after = await admin
      .from("financial_documents")
      .select("payment_state, outstanding_amount")
      .eq("id", doc.id)
      .single();
    expect(after.data!.payment_state).toBe("unpaid");
    expect(Number(after.data!.outstanding_amount)).toBe(180);
  });

  it("cancels a draft run with a reason and withdraws its approval", async () => {
    const { runId } = await runWithOneInvoice(95);
    await clients.manager.rpc("request_payment_run_approval", { _run_id: runId });

    const noReason = await clients.owner.rpc("cancel_payment_run", { _run_id: runId, _reason: "" });
    expect(noReason.error?.message ?? "").toMatch(/reason/i);

    expectNoError(
      await clients.owner.rpc("cancel_payment_run", {
        _run_id: runId,
        _reason: "Duplicated the February run",
      }),
      "cancel run",
    );
    const row = await admin.from("payment_runs").select("*").eq("id", runId).single();
    expect(row.data!.status).toBe("cancelled");
    const instructions = await admin
      .from("payment_instructions")
      .select("status")
      .eq("payment_run_id", runId);
    expect(instructions.data!.every((i) => i.status === "cancelled")).toBe(true);
  });
});

describe("the run owns no accounting value", () => {
  it("posts no journal, creates no bank transaction and writes no cash-flow entry", async () => {
    const runId = (await newRun(clients.manager)).data as string;
    const doc = await postedInvoice(company.id, 640, supplierId);
    await clients.manager.rpc("add_payment_instruction", {
      _run_id: runId,
      _document_id: doc.id,
    });

    const before = await admin
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    const paymentsBefore = await admin
      .from("financial_payments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    const cashBefore = await admin
      .from("cash_flow_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);

    await approveRun(runId);
    await clients.manager.rpc("export_payment_run", { _run_id: runId, _format: "sepa_xml" });
    await clients.owner.rpc("execute_payment_run", { _run_id: runId });

    const after = await admin
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    const paymentsAfter = await admin
      .from("financial_payments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    const cashAfter = await admin
      .from("cash_flow_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);

    expect(after.count ?? 0).toBe(before.count ?? 0);
    expect(paymentsAfter.count ?? 0).toBe(paymentsBefore.count ?? 0);
    expect(cashAfter.count ?? 0).toBe(cashBefore.count ?? 0);

    const invoice = await admin
      .from("financial_documents")
      .select("payment_state, outstanding_amount")
      .eq("id", doc.id)
      .single();
    expect(invoice.data!.payment_state).toBe("unpaid");
    expect(Number(invoice.data!.outstanding_amount)).toBe(640);
  });
});

describe("permissions, isolation and write protection", () => {
  it("lets recording roles build a run and refuses the rest", async () => {
    for (const role of ROLES) {
      const res = await newRun(clients[role], company.id, `Run by ${role}`);
      if (RECORD_ROLES.includes(role)) {
        expectNoError(res, `create as ${role}`);
      } else {
        expect(res.error?.message ?? "").toMatch(/permission/i);
      }
    }
  });

  it("reserves execution, completion and cancellation for managing roles", async () => {
    const runId = (await newRun(clients.manager)).data as string;
    const doc = await postedInvoice(company.id, 220, supplierId);
    await clients.manager.rpc("add_payment_instruction", {
      _run_id: runId,
      _document_id: doc.id,
    });
    await approveRun(runId);
    await clients.manager.rpc("export_payment_run", { _run_id: runId, _format: "csv" });

    for (const role of ROLES) {
      if (MANAGE_ROLES.includes(role)) continue;
      const res = await clients[role].rpc("execute_payment_run", { _run_id: runId });
      expect(res.error?.message ?? "").toMatch(/permission/i);
    }
    expectNoError(
      await clients.manager.rpc("execute_payment_run", { _run_id: runId }),
      "execute as manager",
    );
  });

  it("refuses every direct write to the payment tables", async () => {
    const runId = (await newRun(clients.manager)).data as string;

    const insert = await clients.owner.from("payment_runs").insert({
      company_id: company.id,
      reference: uniq("HAND"),
      title: "Hand written",
    });
    expect(insert.error).not.toBeNull();

    await clients.owner.from("payment_runs").update({ status: "approved" }).eq("id", runId);
    const unchanged = await admin
      .from("payment_runs")
      .select("status")
      .eq("id", runId)
      .single();
    expect(unchanged.data!.status).toBe("draft");

    await clients.owner.from("payment_runs").delete().eq("id", runId);
    const survived = await admin
      .from("payment_runs")
      .select("id", { count: "exact", head: true })
      .eq("id", runId);
    expect(survived.count ?? 0).toBe(1);

    const instruction = await clients.owner.from("payment_instructions").insert({
      company_id: company.id,
      payment_run_id: runId,
      batch_id: runId,
      document_id: runId,
    });
    expect(instruction.error).not.toBeNull();
  });

  it("keeps runs invisible across companies and to anonymous callers", async () => {
    const mine = await clients.viewer.from("payment_runs").select("company_id");
    expectNoError(mine, "viewer read");
    expect(mine.data!.every((r) => r.company_id === company.id)).toBe(true);

    const foreign = await otherOwner.from("payment_runs").select("id");
    expect(foreign.data ?? []).toHaveLength(0);

    const anon = await anonClient().from("payment_runs").select("id");
    expect(anon.data ?? []).toHaveLength(0);

    const foreignDoc = await postedInvoice(company.id, 55, supplierId);
    const foreignRun = await otherOwner.rpc("create_payment_run", {
      _company_id: other.id,
      _title: "Foreign run",
    });
    expectNoError(foreignRun, "create foreign run");
    const cross = await otherOwner.rpc("add_payment_instruction", {
      _run_id: foreignRun.data as string,
      _document_id: foreignDoc.id,
    });
    expect(cross.error?.message ?? "").toMatch(/unknown document/i);
  });

  it("writes an audit row for every lifecycle change", async () => {
    const runId = (await newRun(clients.manager)).data as string;
    const trail = await admin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "payment_runs")
      .eq("entity_id", runId);
    expect(trail.count ?? 0).toBeGreaterThan(0);
  });
});
