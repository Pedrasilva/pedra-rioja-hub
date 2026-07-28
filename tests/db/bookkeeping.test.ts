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
import { computeDocumentTotals, computeLine, isValidNif } from "../../src/modules/bookkeeping/schemas";

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const MANAGE_ROLES: Role[] = ["owner", "manager"];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let other: TestCompany;
let bankAccountId: string;
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
  const email = `qa-bk-${role}@pedrarioja.test`;
  await deleteUserByEmail(email);
  const res = await authFetch("/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const user = (await res.json()) as { id: string };
  if (!user.id) throw new Error(`could not create ${role}: ${JSON.stringify(user)}`);
  await admin.from("user_roles").delete().eq("user_id", user.id);
  const grant = await admin.from("user_roles").insert({ user_id: user.id, company_id: companyId, role });
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

type DocOverrides = Record<string, unknown>;

async function makeCounterparty(companyId: string, overrides: DocOverrides = {}) {
  const res = await admin
    .from("counterparties")
    .insert({ company_id: companyId, name: `CP ${Math.random().toString(36).slice(2, 8)}`, ...overrides })
    .select("*")
    .single();
  expectNoError(res, "insert counterparty");
  return res.data!;
}

async function makeDocument(companyId: string, overrides: DocOverrides = {}) {
  const res = await admin
    .from("financial_documents")
    .insert({
      company_id: companyId,
      direction: "inbound",
      doc_type: "invoice",
      issue_date: "2026-01-15",
      due_date: "2026-02-15",
      ...overrides,
    })
    .select("*")
    .single();
  expectNoError(res, "insert financial document");
  return res.data!;
}

async function addLine(companyId: string, documentId: string, line: DocOverrides) {
  const res = await admin
    .from("financial_document_lines")
    .insert({ company_id: companyId, document_id: documentId, line_no: 1, ...line })
    .select("*")
    .single();
  return res;
}

async function reload(id: string) {
  const res = await admin.from("financial_documents").select("*").eq("id", id).single();
  expectNoError(res, "reload document");
  return res.data!;
}

beforeAll(async () => {
  company = await createTestCompany("bookkeeping");
  other = await createTestCompany("bookkeeping-other");

  const acc = await admin
    .from("bank_accounts")
    .insert({ company_id: company.id, name: "BK Current", opening_balance: 0 })
    .select("id")
    .single();
  expectNoError(acc, "insert bank account");
  bankAccountId = acc.data!.id;

  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
}, 120_000);

afterAll(async () => {
  for (const role of ROLES) {
    const id = userIds[role];
    if (id) await authFetch(`/users/${id}`, { method: "DELETE" });
  }
  await dropTestCompany(company);
  await dropTestCompany(other);
});

/* ------------------------------------------------------------ pure contracts */

describe("Zod / TS contracts", () => {
  it("line math matches the database formula", () => {
    expect(computeLine({ quantity: 3, unitPrice: 33.333, discountPct: 0, vatRate: 23 })).toEqual({
      net: 100,
      vat: 23,
      gross: 123,
    });
  });

  it("document totals apply withholding on the net amount", () => {
    const t = computeDocumentTotals(
      [
        { quantity: 1, unitPrice: 1000, vatRate: 23 },
        { quantity: 2, unitPrice: 50, vatRate: 6 },
      ],
      25,
    );
    expect(t).toEqual({ net: 1100, vat: 236, gross: 1336, withholding: 275, payable: 1061 });
  });

  it("validates Portuguese NIF checksums", () => {
    expect(isValidNif("501442600")).toBe(true);
    expect(isValidNif("123456789")).toBe(false);
  });
});

/* -------------------------------------------------------------- counterparties */

describe("counterparties", () => {
  it("derives supplier/client flags from the counterparty type", async () => {
    const supplier = await makeCounterparty(company.id, { counterparty_type: "supplier" });
    const client = await makeCounterparty(company.id, { counterparty_type: "client" });
    const both = await makeCounterparty(company.id, { counterparty_type: "both" });
    expect([supplier.is_supplier, supplier.is_client]).toEqual([true, false]);
    expect([client.is_supplier, client.is_client]).toEqual([false, true]);
    expect([both.is_supplier, both.is_client]).toEqual([true, true]);
  });

  it("rejects a duplicate NIF inside one company but allows it across companies", async () => {
    await makeCounterparty(company.id, { nif: "501442600" });
    const dup = await admin
      .from("counterparties")
      .insert({ company_id: company.id, name: "Dup", nif: "501442600" });
    expect(dup.error).not.toBeNull();

    const foreign = await admin
      .from("counterparties")
      .insert({ company_id: other.id, name: "Same NIF elsewhere", nif: "501442600" });
    expect(foreign.error).toBeNull();
  });

  it("archives rather than deletes", async () => {
    const cp = await makeCounterparty(company.id);
    const upd = await admin
      .from("counterparties")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", cp.id)
      .select("status, deleted_at")
      .single();
    expect(upd.data!.status).toBe("archived");
    expect(upd.data!.deleted_at).not.toBeNull();
  });

  it("writes audit rows", async () => {
    const cp = await makeCounterparty(company.id, { name: "Audited CP" });
    await admin.from("counterparties").update({ city: "Porto" }).eq("id", cp.id);
    const audit = await admin
      .from("audit_log")
      .select("action")
      .eq("entity_type", "counterparties")
      .eq("entity_id", cp.id);
    expectNoError(audit, "audit read");
    expect(audit.data!.length).toBeGreaterThanOrEqual(2);
  });
});

/* ------------------------------------------------------------- documents */

describe("financial documents", () => {
  it("rolls line totals up into the document, with rounding", async () => {
    const doc = await makeDocument(company.id, { withholding_rate: 25 });
    await addLine(company.id, doc.id, { quantity: 3, unit_price: 33.333, vat_rate: 23 });
    await addLine(company.id, doc.id, { line_no: 2, quantity: 1, unit_price: 1000, vat_rate: 6 });

    const after = await reload(doc.id);
    expect(Number(after.net_amount)).toBe(1100);
    expect(Number(after.vat_amount)).toBe(83);
    expect(Number(after.gross_amount)).toBe(1183);
    expect(Number(after.withholding_amount)).toBe(275);
    expect(Number(after.payable_amount)).toBe(908);
  });

  it("computes line VAT and honours discounts", async () => {
    const doc = await makeDocument(company.id);
    const line = await addLine(company.id, doc.id, {
      quantity: 2,
      unit_price: 100,
      discount_pct: 10,
      vat_rate: 23,
    });
    expectNoError(line, "insert line");
    expect(Number(line.data!.net_amount)).toBe(180);
    expect(Number(line.data!.vat_amount)).toBe(41.4);
    expect(Number(line.data!.gross_amount)).toBe(221.4);
  });

  it("prevents duplicate documents by company, counterparty, type, series and number", async () => {
    const cp = await makeCounterparty(company.id);
    const base = { counterparty_id: cp.id, series: "A", document_number: "2026/1" };
    await makeDocument(company.id, base);
    const dup = await admin.from("financial_documents").insert({
      company_id: company.id,
      direction: "inbound",
      doc_type: "invoice",
      issue_date: "2026-03-01",
      ...base,
    });
    expect(dup.error).not.toBeNull();

    const otherType = await admin.from("financial_documents").insert({
      company_id: company.id,
      direction: "inbound",
      doc_type: "credit_note",
      issue_date: "2026-03-01",
      ...base,
    });
    expect(otherType.error).toBeNull();
  });

  it("prevents duplicate ATCUD within a company", async () => {
    await makeDocument(company.id, { atcud: "JFJ7T5H2-35" });
    const dup = await admin.from("financial_documents").insert({
      company_id: company.id,
      direction: "inbound",
      issue_date: "2026-04-01",
      atcud: "JFJ7T5H2-35",
    });
    expect(dup.error).not.toBeNull();
  });

  it("keeps posted amounts and fiscal identifiers immutable", async () => {
    const doc = await makeDocument(company.id, { document_number: "IMM-1" });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: 500, vat_rate: 23 });
    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc.id);

    const amount = await admin.from("financial_documents").update({ net_amount: 1 }).eq("id", doc.id);
    expect(amount.error?.message).toMatch(/immutable/i);

    const number = await admin
      .from("financial_documents")
      .update({ document_number: "IMM-2" })
      .eq("id", doc.id);
    expect(number.error).not.toBeNull();

    const lineChange = await admin
      .from("financial_document_lines")
      .update({ unit_price: 10 })
      .eq("document_id", doc.id);
    expect(lineChange.error?.message).toMatch(/posted or cancelled/i);
  });

  it("cannot be deleted once posted, and cancelling requires a reason", async () => {
    const doc = await makeDocument(company.id, { document_number: "DEL-1" });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: 100, vat_rate: 0 });
    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc.id);

    const del = await admin.from("financial_documents").delete().eq("id", doc.id);
    expect(del.error?.message).toMatch(/archived, never deleted/i);

    const noReason = await admin.from("financial_documents").update({ status: "cancelled" }).eq("id", doc.id);
    expect(noReason.error?.message).toMatch(/cancellation reason/i);

    const cancelled = await admin
      .from("financial_documents")
      .update({ status: "cancelled", cancellation_reason: "duplicate" })
      .eq("id", doc.id)
      .select("status, cancelled_at")
      .single();
    expect(cancelled.data!.status).toBe("cancelled");
    expect(cancelled.data!.cancelled_at).not.toBeNull();

    const reopen = await admin.from("financial_documents").update({ status: "draft" }).eq("id", doc.id);
    expect(reopen.error?.message).toMatch(/cannot be reopened/i);
  });
});

/* -------------------------------------------------- payments and settlement */

describe("settlement and payment state", () => {
  async function postedDoc(total: number, overrides: DocOverrides = {}) {
    const doc = await makeDocument(company.id, { bank_account_id: bankAccountId, ...overrides });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: total, vat_rate: 0 });
    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc.id);
    return reload(doc.id);
  }

  it("moves through unpaid → partially paid → paid → overpaid", async () => {
    const doc = await postedDoc(1000, { document_number: "PAY-1" });
    expect(doc.payment_state).toBe("unpaid");

    const partial = await clients.bookkeeper.rpc("settle_financial_document", {
      _document_id: doc.id,
      _amount: 400,
      _payment_date: "2026-02-10",
    });
    expectNoError(partial, "partial settlement");
    let now = await reload(doc.id);
    expect(now.payment_state).toBe("partially_paid");
    expect(Number(now.paid_amount)).toBe(400);
    expect(Number(now.outstanding_amount)).toBe(600);

    await clients.bookkeeper.rpc("settle_financial_document", {
      _document_id: doc.id,
      _amount: 600,
      _payment_date: "2026-02-20",
    });
    now = await reload(doc.id);
    expect(now.payment_state).toBe("paid");
    expect(Number(now.outstanding_amount)).toBe(0);

    await clients.bookkeeper.rpc("settle_financial_document", {
      _document_id: doc.id,
      _amount: 50,
      _payment_date: "2026-02-21",
    });
    now = await reload(doc.id);
    expect(now.payment_state).toBe("overpaid");
  });

  it("never alters source-owned amounts when settling", async () => {
    const doc = await postedDoc(750, { document_number: "PAY-2" });
    await clients.bookkeeper.rpc("settle_financial_document", {
      _document_id: doc.id,
      _amount: 300,
      _payment_date: "2026-02-10",
    });
    const after = await reload(doc.id);
    expect(Number(after.net_amount)).toBe(750);
    expect(Number(after.gross_amount)).toBe(750);
    expect(Number(after.payable_amount)).toBe(750);
  });

  it("is idempotent for a repeated settlement of the same bank transaction", async () => {
    const doc = await postedDoc(500, { document_number: "PAY-3" });
    const tx = await admin
      .from("bank_transactions")
      .insert({
        company_id: company.id,
        bank_account_id: bankAccountId,
        transaction_date: "2026-02-11",
        amount: -500,
        debit_amount: 500,
        credit_amount: 0,
        fingerprint: `bk-${Date.now()}`,
      })
      .select("id")
      .single();
    expectNoError(tx, "insert bank transaction");

    for (let i = 0; i < 3; i++) {
      const res = await clients.bookkeeper.rpc("settle_financial_document", {
        _document_id: doc.id,
        _amount: 500,
        _payment_date: "2026-02-11",
        _bank_transaction_id: tx.data!.id,
      });
      expectNoError(res, `settlement attempt ${i}`);
    }

    const payments = await admin
      .from("financial_payments")
      .select("id, amount")
      .eq("document_id", doc.id)
      .eq("status", "confirmed");
    expect(payments.data).toHaveLength(1);
    const after = await reload(doc.id);
    expect(Number(after.paid_amount)).toBe(500);
    expect(after.payment_state).toBe("paid");
  });

  it("reverses payments explicitly instead of deleting them", async () => {
    const doc = await postedDoc(200, { document_number: "PAY-4" });
    const pid = (await clients.bookkeeper.rpc("settle_financial_document", {
      _document_id: doc.id,
      _amount: 200,
      _payment_date: "2026-02-12",
    })) as { data: string | null };
    expect(pid.data).toBeTruthy();

    const del = await admin.from("financial_payments").delete().eq("id", pid.data!);
    expect(del.error?.message).toMatch(/reversed, never deleted/i);

    const noReason = await clients.bookkeeper.rpc("reverse_financial_payment", {
      _payment_id: pid.data!,
      _reason: "",
    });
    expect(noReason.error).not.toBeNull();

    const rev = await clients.bookkeeper.rpc("reverse_financial_payment", {
      _payment_id: pid.data!,
      _reason: "bank returned the transfer",
    });
    expectNoError(rev, "reversal");

    const after = await reload(doc.id);
    expect(after.payment_state).toBe("unpaid");
    const history = await admin.from("financial_payments").select("status, reversal_reason").eq("id", pid.data!);
    expect(history.data![0].status).toBe("reversed");
    expect(history.data![0].reversal_reason).toMatch(/returned/);
  });

  it("refuses to settle a draft document", async () => {
    const doc = await makeDocument(company.id, { document_number: "PAY-5" });
    const res = await clients.bookkeeper.rpc("settle_financial_document", {
      _document_id: doc.id,
      _amount: 10,
      _payment_date: "2026-02-12",
    });
    expect(res.error?.message).toMatch(/only posted/i);
  });
});

/* ------------------------------------------------------------- cash flow link */

describe("cash-flow source linking", () => {
  it("creates exactly one linked entry when posted and updates it in place", async () => {
    const doc = await makeDocument(company.id, { document_number: "CF-1", direction: "inbound" });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: 1000, vat_rate: 23 });

    let entries = await admin
      .from("cash_flow_entries")
      .select("id")
      .eq("source_type", "financial_document")
      .eq("source_id", doc.id);
    expect(entries.data).toHaveLength(0);

    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc.id);
    entries = await admin
      .from("cash_flow_entries")
      .select("id, direction, state, amount_total, is_manual")
      .eq("source_type", "financial_document")
      .eq("source_id", doc.id);
    expect(entries.data).toHaveLength(1);
    expect(entries.data![0].direction).toBe("outflow");
    expect(entries.data![0].state).toBe("committed");
    expect(Number(entries.data![0].amount_total)).toBe(1230);
    expect(entries.data![0].is_manual).toBe(false);

    await clients.bookkeeper.rpc("settle_financial_document", {
      _document_id: doc.id,
      _amount: 1230,
      _payment_date: "2026-02-15",
    });
    entries = await admin
      .from("cash_flow_entries")
      .select("id, state, matched_amount")
      .eq("source_type", "financial_document")
      .eq("source_id", doc.id);
    expect(entries.data).toHaveLength(1);
    expect(entries.data![0].state).toBe("reconciled");
    expect(Number(entries.data![0].matched_amount)).toBe(1230);
  });

  it("maps outbound documents to inflows", async () => {
    const doc = await makeDocument(company.id, { document_number: "CF-2", direction: "outbound" });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: 500, vat_rate: 0 });
    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc.id);
    const e = await admin
      .from("cash_flow_entries")
      .select("direction")
      .eq("source_type", "financial_document")
      .eq("source_id", doc.id)
      .single();
    expect(e.data!.direction).toBe("inflow");
  });

  it("removes the linked entry when the document is cancelled", async () => {
    const doc = await makeDocument(company.id, { document_number: "CF-3" });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: 300, vat_rate: 0 });
    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc.id);
    await admin
      .from("financial_documents")
      .update({ status: "cancelled", cancellation_reason: "issued in error" })
      .eq("id", doc.id);

    const entries = await admin
      .from("cash_flow_entries")
      .select("id")
      .eq("source_type", "financial_document")
      .eq("source_id", doc.id);
    expect(entries.data).toHaveLength(0);
  });

  it("keeps source links idempotent under repeated posting updates", async () => {
    const doc = await makeDocument(company.id, { document_number: "CF-4" });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: 120, vat_rate: 0 });
    for (let i = 0; i < 3; i++) {
      await admin
        .from("financial_documents")
        .update({ status: "posted", due_date: `2026-03-0${i + 1}` })
        .eq("id", doc.id);
    }
    const entries = await admin
      .from("cash_flow_entries")
      .select("id, expected_date")
      .eq("source_type", "financial_document")
      .eq("source_id", doc.id);
    expect(entries.data).toHaveLength(1);
    expect(entries.data![0].expected_date).toBe("2026-03-03");
  });

  it("refuses two documents claiming the same external source record", async () => {
    const sourceId = crypto.randomUUID();
    await makeDocument(company.id, {
      document_number: "SRC-1",
      source_type: "external_import",
      source_id: sourceId,
    });
    const dup = await admin.from("financial_documents").insert({
      company_id: company.id,
      direction: "inbound",
      issue_date: "2026-05-01",
      document_number: "SRC-2",
      source_type: "external_import",
      source_id: sourceId,
    });
    expect(dup.error).not.toBeNull();
  });
});

/* ------------------------------------------------- bank classification rules */

describe("bank classification rules", () => {
  it("returns matching rules in priority order and stays company-scoped", async () => {
    const cls = await admin
      .from("financial_classifications")
      .insert({ company_id: company.id, code: `UTIL-${Date.now()}`, name_en: "Utilities", nature: "expense" })
      .select("id")
      .single();
    expectNoError(cls, "insert classification");

    await admin.from("bank_classification_rules").insert([
      {
        company_id: company.id,
        name: "EDP low priority",
        priority: 50,
        match_value: "EDP",
        classification_id: cls.data!.id,
        cash_flow_category: "utilities",
      },
      {
        company_id: company.id,
        name: "EDP high priority",
        priority: 10,
        match_value: "EDP COMERCIAL",
        cash_flow_category: "energy",
      },
      { company_id: company.id, name: "Inactive", priority: 1, match_value: "EDP", is_active: false },
      { company_id: other.id, name: "Foreign rule", priority: 1, match_value: "EDP" },
    ]);

    const tx = await admin
      .from("bank_transactions")
      .insert({
        company_id: company.id,
        bank_account_id: bankAccountId,
        transaction_date: "2026-03-05",
        description: "PAG EDP COMERCIAL SA",
        amount: -85.5,
        debit_amount: 85.5,
        credit_amount: 0,
        fingerprint: `rule-${Date.now()}`,
      })
      .select("id")
      .single();
    expectNoError(tx, "insert transaction");

    const res = await clients.viewer.rpc("suggest_bank_classification", {
      _bank_transaction_id: tx.data!.id,
    });
    expectNoError(res, "suggest classification");
    const rows = res.data as { rule_name: string; priority: number }[];
    expect(rows.length).toBe(2);
    expect(rows[0].rule_name).toBe("EDP high priority");
    expect(rows.every((r) => !r.rule_name.includes("Foreign"))).toBe(true);
    expect(rows.every((r) => r.rule_name !== "Inactive")).toBe(true);
  });

  it("respects amount and direction filters", async () => {
    await admin.from("bank_classification_rules").insert({
      company_id: company.id,
      name: "Big inflow only",
      priority: 5,
      match_value: "RENDA",
      direction: "inflow",
      min_amount: 1000,
    });
    const tx = await admin
      .from("bank_transactions")
      .insert({
        company_id: company.id,
        bank_account_id: bankAccountId,
        transaction_date: "2026-03-06",
        description: "RENDA JANEIRO",
        amount: 500,
        debit_amount: 0,
        credit_amount: 500,
        fingerprint: `rule2-${Date.now()}`,
      })
      .select("id")
      .single();
    const res = await clients.viewer.rpc("suggest_bank_classification", {
      _bank_transaction_id: tx.data!.id,
    });
    expect((res.data as unknown[]).length).toBe(0);
  });
});

/* ------------------------------------------------------------ periods & VAT */

describe("periods and VAT totals", () => {
  it("aggregates posted document VAT per rate", async () => {
    const period = await admin
      .from("financial_periods")
      .insert({
        company_id: company.id,
        code: `2026-Q3-${Date.now()}`,
        period_type: "quarter",
        period_start: "2026-07-01",
        period_end: "2026-09-30",
      })
      .select("id")
      .single();
    expectNoError(period, "insert period");

    const doc = await makeDocument(company.id, { document_number: "VAT-1", issue_date: "2026-08-01" });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: 1000, vat_rate: 23, vat_code: "NOR" });
    await addLine(company.id, doc.id, {
      line_no: 2,
      quantity: 1,
      unit_price: 200,
      vat_rate: 6,
      vat_code: "RED",
    });
    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc.id);

    const res = await clients.owner.rpc("recompute_period_totals", { _period_id: period.data!.id });
    expectNoError(res, "recompute period totals");

    const totals = await admin
      .from("financial_period_totals")
      .select("vat_rate, net_amount, vat_amount")
      .eq("period_id", period.data!.id)
      .order("vat_rate");
    expect(totals.data).toHaveLength(2);
    expect(Number(totals.data![0].vat_amount)).toBe(12);
    expect(Number(totals.data![1].vat_amount)).toBe(230);

    // idempotent recompute
    await clients.owner.rpc("recompute_period_totals", { _period_id: period.data!.id });
    const again = await admin
      .from("financial_period_totals")
      .select("id")
      .eq("period_id", period.data!.id);
    expect(again.data).toHaveLength(2);
  });
});

/* ----------------------------------------------------------------- security */

describe("tenancy, roles and anonymous denial", () => {
  const TABLES = [
    "counterparties",
    "financial_documents",
    "financial_document_lines",
    "financial_payments",
    "financial_periods",
    "financial_period_totals",
    "bank_classification_rules",
  ] as const;

  it.each(TABLES)("anonymous users cannot read %s", async (table) => {
    const res = await anonClient().from(table).select("id");
    expect(res.data ?? []).toHaveLength(0);
  });

  it.each(ROLES)("%s can read bookkeeping records of their own company", async (role) => {
    const res = await clients[role].from("counterparties").select("id").eq("company_id", company.id);
    expect(res.error).toBeNull();
    expect(res.data!.length).toBeGreaterThan(0);
  });

  it.each(ROLES)("%s cannot see another company's counterparties", async (role) => {
    await makeCounterparty(other.id, { name: "Foreign CP" });
    const res = await clients[role].from("counterparties").select("id").eq("company_id", other.id);
    expect(res.data ?? []).toHaveLength(0);
  });

  it.each(ROLES)("%s counterparty creation follows the role matrix", async (role) => {
    const res = await clients[role]
      .from("counterparties")
      .insert({ company_id: company.id, name: `By ${role}` })
      .select("id")
      .maybeSingle();
    if (MANAGE_ROLES.includes(role)) expect(res.error).toBeNull();
    else expect(res.data).toBeNull();
  });

  it.each(ROLES)("%s document creation follows the role matrix", async (role) => {
    const res = await clients[role]
      .from("financial_documents")
      .insert({
        company_id: company.id,
        direction: "inbound",
        issue_date: "2026-06-01",
        document_number: `ROLE-${role}`,
      })
      .select("id")
      .maybeSingle();
    if (MANAGE_ROLES.includes(role)) expect(res.error).toBeNull();
    else expect(res.data).toBeNull();
  });

  it.each(ROLES)("%s settlement rights follow the recording matrix", async (role) => {
    const doc = await makeDocument(company.id, { document_number: `SET-${role}` });
    await addLine(company.id, doc.id, { quantity: 1, unit_price: 100, vat_rate: 0 });
    await admin.from("financial_documents").update({ status: "posted" }).eq("id", doc.id);

    const res = await clients[role].rpc("settle_financial_document", {
      _document_id: doc.id,
      _amount: 100,
      _payment_date: "2026-06-02",
    });
    if (RECORD_ROLES.includes(role)) expect(res.error).toBeNull();
    else expect(res.error?.message).toMatch(/not authorised/i);
  });

  it("no role can write into another company", async () => {
    const res = await clients.owner
      .from("financial_documents")
      .insert({ company_id: other.id, direction: "inbound", issue_date: "2026-06-01" })
      .select("id")
      .maybeSingle();
    expect(res.data).toBeNull();
  });

  it("shared classifications are readable by everyone, tenant charts are not", async () => {
    const foreign = await admin
      .from("financial_classifications")
      .insert({ company_id: other.id, code: `FOR-${Date.now()}`, name_en: "Foreign chart" })
      .select("id")
      .single();
    const res = await clients.viewer
      .from("financial_classifications")
      .select("id")
      .eq("id", foreign.data!.id);
    expect(res.data ?? []).toHaveLength(0);
  });
});
