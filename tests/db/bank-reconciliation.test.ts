import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  admin,
  anonClient,
  anonKey,
  authAdminUrl,
  authUrl,
  serviceRoleKey,
  userClient,
} from "../support/client";
import { createTestCompany, dropTestCompany, type TestCompany } from "../support/fixtures";
import {
  statementBatchHash,
  withFingerprints,
  type ParsedStatementRow,
} from "../../src/modules/banking/schemas";

const PASSWORD = "QaPedraRioja!2026";
const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];

/** Roles that may record movements and confirm reconciliations. */
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
/** Roles that may create accounts, reverse matches and override balances. */
const MANAGE_ROLES: Role[] = ["owner", "manager"];

let company: TestCompany;
let otherCompany: TestCompany;
let mainAccountId: string;
let secondAccountId: string;
let foreignAccountId: string;

const clients = {} as Record<Role | "outsider", SupabaseClient>;
const userIds: Record<string, string> = {};

/* ------------------------------------------------------------- test users */

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

async function createRoleUser(label: string, role: string, companyId: string) {
  const email = `qa-bank-${label}@pedrarioja.test`;
  await deleteUserByEmail(email);
  const res = await authFetch("/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const user = (await res.json()) as { id: string };
  if (!user.id) throw new Error(`could not create ${label}: ${JSON.stringify(user)}`);
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
  userIds[label] = user.id;
  return userClient(session.access_token);
}

/* --------------------------------------------------------------- fixtures */

async function makeAccount(companyId: string, name: string, opening = 10_000) {
  const { data, error } = await admin
    .from("bank_accounts")
    .insert({
      company_id: companyId,
      name,
      currency: "EUR",
      account_type: "current",
      opening_balance: opening,
      opening_balance_date: "2026-01-01",
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`makeAccount: ${error.message}`);
  return data!.id as string;
}

type RowInput = {
  date: string;
  amount: number;
  description?: string;
  reference?: string | null;
  counterparty?: string | null;
  sourceRowId?: string | null;
};

function row(input: RowInput): ParsedStatementRow {
  return {
    line_no: 0,
    transaction_date: input.date,
    value_date: input.date,
    description: input.description ?? "Movement",
    bank_reference: input.reference ?? null,
    counterparty_name: input.counterparty ?? null,
    counterparty_account: null,
    debit_amount: input.amount < 0 ? Math.abs(input.amount) : 0,
    credit_amount: input.amount > 0 ? input.amount : 0,
    amount: input.amount,
    running_balance: null,
    source_row_id: input.sourceRowId ?? null,
  };
}

/**
 * Mirrors the stageStatementImport server function against the database with
 * a given caller, so RLS and the duplicate rules are exercised exactly as the
 * application exercises them.
 */
async function stageImport(
  client: SupabaseClient,
  bankAccountId: string,
  inputs: RowInput[],
  opts: { closingBalance?: number; fileName?: string; forceIssueRow?: boolean } = {},
) {
  const { data: account, error: aErr } = await client
    .from("bank_accounts")
    .select("id, company_id")
    .eq("id", bankAccountId)
    .maybeSingle();
  if (aErr) throw new Error(`stageImport account: ${aErr.message}`);
  if (!account) throw new Error("stageImport: account not visible to this caller");

  const parsed = inputs.map((r, i) => ({ ...row(r), line_no: i + 1 }));
  const reviewed = withFingerprints(parsed);

  const { data: existing, error: eErr } = await client
    .from("bank_transactions")
    .select("id, fingerprint")
    .eq("bank_account_id", bankAccountId)
    .in(
      "fingerprint",
      reviewed.map((r) => r.fingerprint),
    );
  if (eErr) throw new Error(`stageImport existing: ${eErr.message}`);
  const known = new Map((existing ?? []).map((t) => [t.fingerprint as string, t.id as string]));

  const dates = reviewed.map((r) => r.transaction_date!).sort();
  const { data: imp, error } = await client
    .from("bank_statement_imports")
    .insert({
      company_id: account.company_id,
      bank_account_id: bankAccountId,
      source: "csv",
      file_name: opts.fileName ?? "statement.csv",
      content_hash: statementBatchHash(parsed),
      period_start: dates[0],
      period_end: dates[dates.length - 1],
      statement_closing_balance: opts.closingBalance ?? null,
      status: "draft",
      row_count: reviewed.length,
      duplicate_count: reviewed.filter((r) => known.has(r.fingerprint)).length,
      error_count: 0,
    })
    .select("id")
    .single();
  if (error) return { error, importId: null as string | null, rows: [] };

  const insert = await client.from("bank_statement_import_rows").insert(
    reviewed.map((r) => {
      const dup = known.get(r.fingerprint) ?? null;
      return {
        company_id: account.company_id,
        import_id: imp!.id,
        line_no: r.line_no,
        transaction_date: r.transaction_date,
        value_date: r.value_date ?? null,
        description: r.description ?? null,
        bank_reference: r.bank_reference ?? null,
        counterparty_name: r.counterparty_name ?? null,
        counterparty_account: null,
        debit_amount: r.debit_amount,
        credit_amount: r.credit_amount,
        amount: r.amount,
        source_row_id: r.source_row_id ?? null,
        fingerprint: r.fingerprint,
        issues: opts.forceIssueRow ? ["Amount is zero or unreadable"] : r.issues,
        is_duplicate: Boolean(dup),
        duplicate_of_transaction_id: dup,
        include: opts.forceIssueRow ? true : r.issues.length === 0 && !dup,
      };
    }),
  );
  if (insert.error) return { error: insert.error, importId: imp!.id as string, rows: reviewed };
  return { error: null, importId: imp!.id as string, rows: reviewed };
}

async function commit(client: SupabaseClient, importId: string) {
  return client.rpc("commit_bank_statement_import", { _import_id: importId });
}

async function importAndCommit(
  client: SupabaseClient,
  accountId: string,
  inputs: RowInput[],
  opts: Parameters<typeof stageImport>[3] = {},
) {
  const staged = await stageImport(client, accountId, inputs, opts);
  if (staged.error) throw new Error(`stage: ${staged.error.message}`);
  const res = await commit(client, staged.importId!);
  if (res.error) throw new Error(`commit: ${res.error.message}`);
  return { importId: staged.importId!, result: res.data as { imported: number } };
}

async function txByDescription(accountId: string, description: string) {
  const { data, error } = await admin
    .from("bank_transactions")
    .select("*")
    .eq("bank_account_id", accountId)
    .eq("description", description)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function oneTx(accountId: string, description: string) {
  const rows = await txByDescription(accountId, description);
  expect(rows.length, `expected exactly one "${description}"`).toBe(1);
  return rows[0];
}

let entrySeq = 0;
async function makeEntry(
  overrides: Record<string, unknown> = {},
  companyId = company.id,
): Promise<Record<string, unknown>> {
  entrySeq += 1;
  const { data, error } = await admin
    .from("cash_flow_entries")
    .insert({
      company_id: companyId,
      source_type: "manual",
      is_manual: true,
      category: "other",
      direction: "outflow",
      state: "committed",
      description: `Expected item ${entrySeq}`,
      currency: "EUR",
      amount_net: 1000,
      vat: 0,
      amount_total: 1000,
      entry_date: "2026-08-10",
      expected_date: "2026-08-10",
      confidence: "high",
      ...overrides,
    })
    .select("*")
    .single();
  if (error) throw new Error(`makeEntry: ${error.message}`);
  return data as Record<string, unknown>;
}

async function readEntry(id: string) {
  const { data } = await admin.from("cash_flow_entries").select("*").eq("id", id).single();
  return data as Record<string, unknown>;
}

async function readTx(id: string) {
  const { data } = await admin.from("bank_transactions").select("*").eq("id", id).single();
  return data as Record<string, unknown>;
}

async function confirm(
  client: SupabaseClient,
  txId: string,
  allocations: { entry_id: string; amount: number; match_type?: string; variance_reason?: string }[],
  notes?: string,
) {
  return client.rpc("confirm_bank_match", {
    _bank_transaction_id: txId,
    _allocations: allocations,
    _notes: notes ?? null,
  });
}

/* ------------------------------------------------------------------ setup */

beforeAll(async () => {
  company = await createTestCompany("banking");
  otherCompany = await createTestCompany("banking-other");

  mainAccountId = await makeAccount(company.id, "Main current account", 10_000);
  secondAccountId = await makeAccount(company.id, "Savings account", 5_000);
  foreignAccountId = await makeAccount(otherCompany.id, "Foreign account", 1_000);

  for (const role of ROLES) clients[role] = await createRoleUser(role, role, company.id);
  clients.outsider = await createRoleUser("outsider", "owner", otherCompany.id);
}, 180_000);

afterAll(async () => {
  for (const id of Object.values(userIds)) {
    if (id) await authFetch(`/users/${id}`, { method: "DELETE" });
  }
  await dropTestCompany(company);
  await dropTestCompany(otherCompany);
});

/* ----------------------------------------------------------- 1. importing */

describe("statement import", () => {
  it("imports a first statement and leaves every movement unmatched", async () => {
    const { result } = await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-03", amount: -450.0, description: "IMPORT A rent transfer" },
      { date: "2026-08-05", amount: 1200.0, description: "IMPORT A tenant payment" },
    ]);
    expect(result.imported).toBe(2);

    const tx = await oneTx(mainAccountId, "IMPORT A tenant payment");
    expect(tx.reconciliation_status).toBe("unmatched");
    expect(Number(tx.matched_amount)).toBe(0);
    expect(tx.import_id).toBeTruthy();
  });

  it("re-importing the identical file adds nothing", async () => {
    const before = await txByDescription(mainAccountId, "IMPORT A tenant payment");
    const { result } = await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-03", amount: -450.0, description: "IMPORT A rent transfer" },
      { date: "2026-08-05", amount: 1200.0, description: "IMPORT A tenant payment" },
    ]);
    expect(result.imported).toBe(0);
    const after = await txByDescription(mainAccountId, "IMPORT A tenant payment");
    expect(after.length).toBe(before.length);
  });

  it("an overlapping statement only adds the genuinely new lines", async () => {
    const { result } = await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-05", amount: 1200.0, description: "IMPORT A tenant payment" },
      { date: "2026-08-09", amount: -75.5, description: "IMPORT B bank charges" },
      { date: "2026-08-11", amount: -320.0, description: "IMPORT B utilities" },
    ]);
    expect(result.imported).toBe(2);
    expect((await txByDescription(mainAccountId, "IMPORT A tenant payment")).length).toBe(1);
    expect((await txByDescription(mainAccountId, "IMPORT B utilities")).length).toBe(1);
  });

  it("keeps genuinely repeated same-day movements apart by occurrence", async () => {
    const { result } = await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-12", amount: -30.0, description: "IMPORT C parking" },
      { date: "2026-08-12", amount: -30.0, description: "IMPORT C parking" },
    ]);
    expect(result.imported).toBe(2);
    const rows = await txByDescription(mainAccountId, "IMPORT C parking");
    expect(rows.length).toBe(2);
    expect(new Set(rows.map((r) => r.fingerprint)).size).toBe(2);
  });

  it("scopes duplicate fingerprints to the account", async () => {
    const shared: RowInput[] = [
      { date: "2026-08-15", amount: -99.99, description: "SHARED direct debit" },
    ];
    const first = await importAndCommit(clients.bookkeeper, mainAccountId, shared);
    const second = await importAndCommit(clients.bookkeeper, secondAccountId, shared);
    expect(first.result.imported).toBe(1);
    expect(second.result.imported).toBe(1);

    const a = await oneTx(mainAccountId, "SHARED direct debit");
    const b = await oneTx(secondAccountId, "SHARED direct debit");
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.id).not.toBe(b.id);
    expect(a.bank_account_id).not.toBe(b.bank_account_id);
  });

  it("rolls the whole batch back when an included row still has issues", async () => {
    const staged = await stageImport(
      clients.bookkeeper,
      mainAccountId,
      [
        { date: "2026-08-20", amount: -10, description: "INVALID batch line one" },
        { date: "2026-08-21", amount: -20, description: "INVALID batch line two" },
      ],
      { forceIssueRow: true },
    );
    const res = await commit(clients.bookkeeper, staged.importId!);
    expect(res.error?.message ?? "").toMatch(/validation issues/i);
    expect((await txByDescription(mainAccountId, "INVALID batch line one")).length).toBe(0);
    expect((await txByDescription(mainAccountId, "INVALID batch line two")).length).toBe(0);

    const { data: batch } = await admin
      .from("bank_statement_imports")
      .select("status, imported_count")
      .eq("id", staged.importId!)
      .single();
    expect(batch!.status).toBe("draft");
  });

  it("refuses to commit the same batch twice", async () => {
    const staged = await stageImport(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-22", amount: -12.34, description: "IDEMPOTENT batch line" },
    ]);
    const first = await commit(clients.bookkeeper, staged.importId!);
    expect(first.error).toBeNull();
    const second = await commit(clients.bookkeeper, staged.importId!);
    expect(second.error?.message ?? "").toMatch(/already committed/i);
    expect((await txByDescription(mainAccountId, "IDEMPOTENT batch line")).length).toBe(1);
  });
});

/* ------------------------------------------------------------- 2. matching */

describe("matching", () => {
  it("matches one transaction to one expected item", async () => {
    const entry = await makeEntry({ description: "ONE-TO-ONE mortgage instalment" });
    const { importId: _i } = await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-10", amount: -1000, description: "M1 mortgage instalment" },
    ]);
    const tx = await oneTx(mainAccountId, "M1 mortgage instalment");

    const res = await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);
    expect(res.error).toBeNull();

    expect((await readTx(tx.id as string)).reconciliation_status).toBe("reconciled");
    const after = await readEntry(entry.id as string);
    expect(after.reconciliation_state).toBe("reconciled");
    expect(Number(after.matched_amount)).toBe(1000);
    expect(Number(after.variance_amount)).toBe(0);
  });

  it("splits one transaction across several expected items", async () => {
    const a = await makeEntry({ description: "SPLIT insurance", amount_total: 300, amount_net: 300 });
    const b = await makeEntry({ description: "SPLIT condominium", amount_total: 200, amount_net: 200 });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-14", amount: -500, description: "M2 combined debit" },
    ]);
    const tx = await oneTx(mainAccountId, "M2 combined debit");

    const res = await confirm(clients.manager, tx.id as string, [
      { entry_id: a.id as string, amount: 300, match_type: "allocation" },
      { entry_id: b.id as string, amount: 200, match_type: "allocation" },
    ]);
    expect(res.error).toBeNull();
    expect((res.data as { entries: number }).entries).toBe(2);

    expect((await readTx(tx.id as string)).reconciliation_status).toBe("reconciled");
    expect((await readEntry(a.id as string)).reconciliation_state).toBe("reconciled");
    expect((await readEntry(b.id as string)).reconciliation_state).toBe("reconciled");
  });

  it("refuses allocations that exceed the movement", async () => {
    const entry = await makeEntry({ description: "OVERALLOCATE item" });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-16", amount: -100, description: "M3 small debit" },
    ]);
    const tx = await oneTx(mainAccountId, "M3 small debit");
    const res = await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 250 },
    ]);
    expect(res.error?.message ?? "").toMatch(/exceed/i);
    expect((await readTx(tx.id as string)).reconciliation_status).toBe("unmatched");
  });

  it("settles one expected item from several transactions", async () => {
    const entry = await makeEntry({
      description: "MANY-TO-ONE works invoice",
      amount_total: 900,
      amount_net: 900,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-18", amount: -400, description: "M4 works first payment" },
      { date: "2026-08-25", amount: -500, description: "M4 works second payment" },
    ]);
    const first = await oneTx(mainAccountId, "M4 works first payment");
    const second = await oneTx(mainAccountId, "M4 works second payment");

    await confirm(clients.bookkeeper, first.id as string, [
      { entry_id: entry.id as string, amount: 400, match_type: "partial" },
    ]);
    const mid = await readEntry(entry.id as string);
    expect(mid.reconciliation_state).toBe("partially_matched");
    expect(mid.state).toBe("actual");
    expect(Number(mid.matched_amount)).toBe(400);

    await confirm(clients.bookkeeper, second.id as string, [
      { entry_id: entry.id as string, amount: 500, match_type: "partial" },
    ]);
    const done = await readEntry(entry.id as string);
    expect(done.reconciliation_state).toBe("reconciled");
    expect(Number(done.matched_amount)).toBe(900);
    expect((await readTx(first.id as string)).reconciliation_status).toBe("reconciled");
    expect((await readTx(second.id as string)).reconciliation_status).toBe("reconciled");
  });

  it("records a partial settlement on the bank side too", async () => {
    const entry = await makeEntry({
      description: "PARTIAL deposit",
      direction: "inflow",
      amount_total: 2000,
      amount_net: 2000,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-19", amount: 1500, description: "M5 partial deposit" },
    ]);
    const tx = await oneTx(mainAccountId, "M5 partial deposit");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 800, match_type: "partial" },
    ]);
    const after = await readTx(tx.id as string);
    expect(after.reconciliation_status).toBe("partially_matched");
    expect(Number(after.matched_amount)).toBe(800);
  });

  it("records an underpayment as a negative variance and keeps the forecast", async () => {
    const entry = await makeEntry({
      description: "UNDERPAID rent",
      direction: "inflow",
      amount_total: 1000,
      amount_net: 1000,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-20", amount: 950, description: "M6 short rent" },
    ]);
    const tx = await oneTx(mainAccountId, "M6 short rent");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 950, variance_reason: "tenant short-paid" },
    ]);

    const after = await readEntry(entry.id as string);
    expect(Number(after.forecast_amount)).toBe(1000);
    expect(Number(after.actual_amount)).toBe(950);
    expect(Number(after.variance_amount)).toBe(-50);
    expect(after.reconciliation_state).toBe("partially_matched");

    const { data: match } = await admin
      .from("bank_reconciliation_matches")
      .select("forecast_amount, allocated_amount, variance_amount, variance_reason")
      .eq("bank_transaction_id", tx.id)
      .eq("status", "confirmed")
      .single();
    expect(Number(match!.forecast_amount)).toBe(1000);
    expect(Number(match!.variance_amount)).toBe(-50);
    expect(match!.variance_reason).toBe("tenant short-paid");
  });

  it("records an overpayment as a positive variance and keeps the forecast", async () => {
    const entry = await makeEntry({
      description: "OVERPAID rent",
      direction: "inflow",
      amount_total: 1000,
      amount_net: 1000,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-21", amount: 1080, description: "M7 rent with extras" },
    ]);
    const tx = await oneTx(mainAccountId, "M7 rent with extras");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 1080, variance_reason: "includes late fee" },
    ]);

    const after = await readEntry(entry.id as string);
    expect(Number(after.forecast_amount)).toBe(1000);
    expect(Number(after.actual_amount)).toBe(1080);
    expect(Number(after.variance_amount)).toBe(80);
    expect(after.reconciliation_state).toBe("reconciled");

    const { data: exception } = await admin
      .from("v_bank_reconciliation_exceptions")
      .select("variance_amount, variance_reason")
      .eq("bank_transaction_id", tx.id)
      .maybeSingle();
    expect(Number(exception!.variance_amount)).toBe(80);
  });

  it("confirming the same allocation twice is idempotent", async () => {
    const entry = await makeEntry({ description: "IDEMPOTENT allocation" });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-23", amount: -1000, description: "M8 repeated confirm" },
    ]);
    const tx = await oneTx(mainAccountId, "M8 repeated confirm");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);
    const second = await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);
    expect(second.error).toBeNull();

    const { data: matches } = await admin
      .from("bank_reconciliation_matches")
      .select("id")
      .eq("bank_transaction_id", tx.id)
      .eq("status", "confirmed");
    expect(matches!.length).toBe(1);
    expect(Number((await readTx(tx.id as string)).matched_amount)).toBe(1000);
  });

  it("never lets concurrent confirmations over-allocate a transaction", async () => {
    const a = await makeEntry({ description: "RACE item A", amount_total: 700, amount_net: 700 });
    const b = await makeEntry({ description: "RACE item B", amount_total: 700, amount_net: 700 });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-08-24", amount: -1000, description: "M9 race debit" },
    ]);
    const tx = await oneTx(mainAccountId, "M9 race debit");

    const results = await Promise.all([
      confirm(clients.bookkeeper, tx.id as string, [{ entry_id: a.id as string, amount: 700 }]),
      confirm(clients.manager, tx.id as string, [{ entry_id: b.id as string, amount: 700 }]),
    ]);
    const ok = results.filter((r) => !r.error);
    expect(ok.length).toBe(1);

    const after = await readTx(tx.id as string);
    expect(Number(after.matched_amount)).toBeLessThanOrEqual(1000);
    expect(Number(after.matched_amount)).toBe(700);
  });
});

/* ------------------------------------------------------------ 3. tolerance */

describe("suggestions and tolerance", () => {
  it("never reconciles automatically, however good the candidate", async () => {
    const entry = await makeEntry({
      description: "AUTO perfect candidate",
      expected_date: "2026-09-01",
      amount_total: 640,
      amount_net: 640,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-01", amount: -640, description: "S1 perfect candidate" },
    ]);
    const tx = await oneTx(mainAccountId, "S1 perfect candidate");
    expect(tx.reconciliation_status).toBe("unmatched");

    const { data: suggestions, error } = await clients.bookkeeper.rpc("suggest_bank_matches", {
      _bank_transaction_id: tx.id,
      _amount_tolerance: 0.02,
      _date_tolerance: 7,
      _limit: 10,
    });
    expect(error).toBeNull();
    const found = (suggestions as { entry_id: string; reasons: string[] }[]).find(
      (s) => s.entry_id === entry.id,
    );
    expect(found).toBeTruthy();
    expect(found!.reasons).toContain("amount matches");
    // Reading suggestions must not change any state.
    expect((await readTx(tx.id as string)).reconciliation_status).toBe("unmatched");
    expect((await readEntry(entry.id as string)).reconciliation_state).toBe("unmatched");
  });

  it("treats the amount tolerance boundary as inclusive and beyond it as unmatched", async () => {
    const inside = await makeEntry({
      description: "TOL amount inside",
      expected_date: "2026-09-05",
      amount_total: 500.02,
      amount_net: 500.02,
    });
    const outside = await makeEntry({
      description: "TOL amount outside",
      expected_date: "2026-09-05",
      amount_total: 500.05,
      amount_net: 500.05,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-05", amount: -500, description: "S2 tolerance probe" },
    ]);
    const tx = await oneTx(mainAccountId, "S2 tolerance probe");

    const { data } = await clients.bookkeeper.rpc("suggest_bank_matches", {
      _bank_transaction_id: tx.id,
      _amount_tolerance: 0.02,
      _date_tolerance: 7,
      _limit: 20,
    });
    const rows = data as { entry_id: string; reasons: string[] }[];
    expect(rows.find((r) => r.entry_id === inside.id)!.reasons).toContain("amount matches");
    expect(rows.find((r) => r.entry_id === outside.id)?.reasons ?? []).not.toContain(
      "amount matches",
    );
  });

  it("treats the date tolerance boundary as inclusive and drops far candidates", async () => {
    const onBoundary = await makeEntry({
      description: "TOL date boundary",
      expected_date: "2026-10-08",
      amount_total: 777,
      amount_net: 777,
    });
    const justOutside = await makeEntry({
      description: "TOL date outside",
      expected_date: "2026-10-09",
      amount_total: 777,
      amount_net: 777,
    });
    const farAway = await makeEntry({
      description: "TOL date far away",
      expected_date: "2027-06-01",
      amount_total: 777,
      amount_net: 777,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-10-01", amount: -777, description: "S3 date probe" },
    ]);
    const tx = await oneTx(mainAccountId, "S3 date probe");

    const { data } = await clients.bookkeeper.rpc("suggest_bank_matches", {
      _bank_transaction_id: tx.id,
      _amount_tolerance: 0.02,
      _date_tolerance: 7,
      _limit: 20,
    });
    const rows = data as { entry_id: string; reasons: string[] }[];
    expect(rows.find((r) => r.entry_id === onBoundary.id)!.reasons).toContain(
      "date within tolerance",
    );
    expect(rows.find((r) => r.entry_id === justOutside.id)?.reasons ?? []).not.toContain(
      "date within tolerance",
    );
    expect(rows.find((r) => r.entry_id === farAway.id)).toBeUndefined();
  });

  it("only suggests candidates from the same company and direction", async () => {
    const foreign = await makeEntry(
      {
        description: "FOREIGN candidate",
        expected_date: "2026-11-02",
        amount_total: 333,
        amount_net: 333,
      },
      otherCompany.id,
    );
    const wrongWay = await makeEntry({
      description: "WRONG direction candidate",
      direction: "inflow",
      expected_date: "2026-11-02",
      amount_total: 333,
      amount_net: 333,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-11-02", amount: -333, description: "S4 isolation probe" },
    ]);
    const tx = await oneTx(mainAccountId, "S4 isolation probe");

    const { data } = await clients.bookkeeper.rpc("suggest_bank_matches", {
      _bank_transaction_id: tx.id,
      _amount_tolerance: 0.02,
      _date_tolerance: 7,
      _limit: 20,
    });
    const ids = (data as { entry_id: string }[]).map((r) => r.entry_id);
    expect(ids).not.toContain(foreign.id);
    expect(ids).not.toContain(wrongWay.id);
  });
});

/* ------------------------------------------------------------ 4. transfers */

describe("internal transfers", () => {
  let outgoing: Record<string, unknown>;
  let incoming: Record<string, unknown>;

  it("pairs two opposite movements across accounts", async () => {
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-10", amount: -2500, description: "T1 transfer to savings" },
    ]);
    await importAndCommit(clients.bookkeeper, secondAccountId, [
      { date: "2026-09-10", amount: 2500, description: "T1 transfer from current" },
    ]);
    outgoing = await oneTx(mainAccountId, "T1 transfer to savings");
    incoming = await oneTx(secondAccountId, "T1 transfer from current");

    const insert = await clients.bookkeeper.from("bank_transfers").insert({
      company_id: company.id,
      from_transaction_id: outgoing.id,
      to_transaction_id: incoming.id,
      from_account_id: mainAccountId,
      to_account_id: secondAccountId,
      amount: 2500,
      transfer_date: "2026-09-10",
    });
    expect(insert.error).toBeNull();

    const update = await clients.bookkeeper
      .from("bank_transactions")
      .update({ reconciliation_status: "transfer", is_internal_transfer: true })
      .in("id", [outgoing.id, incoming.id]);
    expect(update.error).toBeNull();

    expect((await readTx(outgoing.id as string)).reconciliation_status).toBe("transfer");
    expect((await readTx(incoming.id as string)).reconciliation_status).toBe("transfer");
  });

  it("keeps transfers out of portfolio income and expenditure", async () => {
    const { data } = await admin
      .from("v_bank_account_balances")
      .select("bank_account_id, inflows, outflows, system_balance")
      .in("bank_account_id", [mainAccountId, secondAccountId]);
    const savings = data!.find((r) => r.bank_account_id === secondAccountId)!;
    // The 2 500 transfer moved the balance but must not appear as income.
    expect(Number(savings.inflows)).toBe(0);
    expect(Number(savings.system_balance)).toBeGreaterThan(5_000);
  });

  it("refuses to match a transfer against an expected item", async () => {
    const entry = await makeEntry({ description: "TRANSFER must not match" });
    const res = await confirm(clients.bookkeeper, outgoing.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);
    expect(res.error?.message ?? "").toMatch(/internal transfer/i);
    expect((await readTx(outgoing.id as string)).reconciliation_status).toBe("transfer");
  });
});

/* --------------------------------------------------- 5. conversion + audit */

describe("conversion, immutability and audit", () => {
  let reversedMatchId = "";

  it("turns an unmatched movement into a manual expense and reconciles it", async () => {
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-15", amount: -260, description: "C1 unexpected locksmith" },
    ]);
    const tx = await oneTx(mainAccountId, "C1 unexpected locksmith");

    const conversion = {
      company_id: company.id,
      bank_account_id: mainAccountId,
      category: "maintenance",
      direction: "outflow",
      state: "actual",
      description: "Locksmith call-out",
      currency: "EUR",
      amount_net: 260,
      vat: 0,
      amount_total: 260,
      entry_date: "2026-09-15",
      expected_date: "2026-09-15",
      actual_date: "2026-09-15",
      confidence: "confirmed",
      source_type: "manual",
      is_manual: true,
    };

    // Creating a ledger item is a manage-level right; recording roles may
    // reconcile but not invent new expected items.
    const denied = await clients.bookkeeper.from("cash_flow_entries").insert(conversion);
    expect(denied.error?.message ?? "").toMatch(/row-level security/i);

    const created = await clients.manager
      .from("cash_flow_entries")
      .insert(conversion)
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const res = await confirm(
      clients.bookkeeper,
      tx.id as string,
      [{ entry_id: created.data!.id as string, amount: 260, match_type: "conversion" }],
      "Created from unmatched bank transaction",
    );
    expect(res.error).toBeNull();
    expect((await readTx(tx.id as string)).reconciliation_status).toBe("reconciled");
    const entry = await readEntry(created.data!.id as string);
    expect(entry.reconciliation_state).toBe("reconciled");
    expect(entry.direction).toBe("outflow");
    expect(entry.is_manual).toBe(true);
  });

  it("records an unmatched inflow as manual income", async () => {
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-16", amount: 480, description: "C1b unexpected refund" },
    ]);
    const tx = await oneTx(mainAccountId, "C1b unexpected refund");

    const created = await clients.owner
      .from("cash_flow_entries")
      .insert({
        company_id: company.id,
        bank_account_id: mainAccountId,
        category: "other",
        direction: "inflow",
        state: "actual",
        description: "Insurance refund",
        currency: "EUR",
        amount_net: 480,
        vat: 0,
        amount_total: 480,
        entry_date: "2026-09-16",
        expected_date: "2026-09-16",
        actual_date: "2026-09-16",
        confidence: "confirmed",
        source_type: "manual",
        is_manual: true,
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const res = await confirm(clients.owner, tx.id as string, [
      { entry_id: created.data!.id as string, amount: 480, match_type: "conversion" },
    ]);
    expect(res.error).toBeNull();
    expect((await readEntry(created.data!.id as string)).direction).toBe("inflow");
    expect((await readTx(tx.id as string)).reconciliation_status).toBe("reconciled");
  });


  it("records who, when, how much and against what for every allocation", async () => {
    const entry = await makeEntry({ description: "AUDIT allocation item" });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-17", amount: -1000, description: "C2 audited debit" },
    ]);
    const tx = await oneTx(mainAccountId, "C2 audited debit");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);

    const { data: match } = await admin
      .from("bank_reconciliation_matches")
      .select("*")
      .eq("bank_transaction_id", tx.id)
      .eq("status", "confirmed")
      .single();
    expect(match!.confirmed_by).toBe(userIds.bookkeeper);
    expect(match!.confirmed_at).toBeTruthy();
    expect(Number(match!.allocated_amount)).toBe(1000);
    expect(Number(match!.forecast_amount)).toBe(1000);
    expect(Number(match!.variance_amount)).toBe(0);
    expect(match!.bank_transaction_id).toBe(tx.id);
    expect(match!.entry_id).toBe(entry.id);
    expect(match!.bank_account_id).toBe(mainAccountId);
  });

  it("does not touch amounts owned by the source module", async () => {
    const entry = await makeEntry({
      description: "SOURCE owned amounts",
      amount_total: 1000,
      amount_net: 1000,
    });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-18", amount: -940, description: "C3 short payment" },
    ]);
    const tx = await oneTx(mainAccountId, "C3 short payment");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 940, variance_reason: "bank fee deducted" },
    ]);

    const after = await readEntry(entry.id as string);
    expect(Number(after.amount_total)).toBe(1000);
    expect(Number(after.amount_net)).toBe(1000);
    expect(after.expected_date).toBe("2026-08-10");
    expect(Number(after.forecast_amount)).toBe(1000);
    expect(Number(after.matched_amount)).toBe(940);
  });

  it("keeps a reconciled entry immutable", async () => {
    const entry = await makeEntry({ description: "IMMUTABLE reconciled entry" });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-19", amount: -1000, description: "C4 fully settled" },
    ]);
    const tx = await oneTx(mainAccountId, "C4 fully settled");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);

    const update = await clients.owner
      .from("cash_flow_entries")
      .update({ description: "tampered" })
      .eq("id", entry.id);
    expect(update.error?.message ?? "").toMatch(/immutable/i);

    const remove = await clients.owner.from("cash_flow_entries").delete().eq("id", entry.id);
    expect(remove.error?.message ?? "").toMatch(/cannot be deleted/i);
  });

  it("unreconciles explicitly and restores both sides", async () => {
    const entry = await makeEntry({ description: "REVERSE me" });
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-09-20", amount: -1000, description: "C5 to be reversed" },
    ]);
    const tx = await oneTx(mainAccountId, "C5 to be reversed");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);
    const { data: match } = await admin
      .from("bank_reconciliation_matches")
      .select("id")
      .eq("bank_transaction_id", tx.id)
      .eq("status", "confirmed")
      .single();

    const bad = await clients.owner.rpc("reverse_bank_match", {
      _match_id: match!.id,
      _reason: "   ",
    });
    expect(bad.error?.message ?? "").toMatch(/reason is required/i);

    const res = await clients.owner.rpc("reverse_bank_match", {
      _match_id: match!.id,
      _reason: "Paid by the tenant directly, matched in error",
    });
    expect(res.error).toBeNull();

    const restoredTx = await readTx(tx.id as string);
    expect(restoredTx.reconciliation_status).toBe("unmatched");
    expect(Number(restoredTx.matched_amount)).toBe(0);
    const restoredEntry = await readEntry(entry.id as string);
    expect(restoredEntry.reconciliation_state).toBe("unmatched");
    expect(restoredEntry.state).toBe("committed");
    expect(Number(restoredEntry.matched_amount)).toBe(0);
    expect(restoredEntry.actual_date).toBeNull();

    const { data: reversed } = await admin
      .from("bank_reconciliation_matches")
      .select("*")
      .eq("id", match!.id)
      .single();
    expect(reversed!.status).toBe("reversed");
    expect(reversed!.reversed_by).toBe(userIds.owner);
    expect(reversed!.reversal_reason).toMatch(/matched in error/);
    expect(Number(reversed!.allocated_amount)).toBe(1000);
  });

  it("keeps reversal history and lineage when the movement is rematched", async () => {
    const { data: reversed } = await admin
      .from("bank_reconciliation_matches")
      .select("id, bank_transaction_id, entry_id")
      .eq("company_id", company.id)
      .eq("status", "reversed")
      .order("reversed_at", { ascending: false })
      .limit(1)
      .single();
    reversedMatchId = reversed!.id as string;

    // No DELETE policy exists on the match ledger, so a client delete removes
    // nothing; the privileged path is additionally blocked by a trigger.
    await clients.owner.from("bank_reconciliation_matches").delete().eq("id", reversed!.id);
    const { data: stillThere } = await admin
      .from("bank_reconciliation_matches")
      .select("id, status")
      .eq("id", reversed!.id)
      .maybeSingle();
    expect(stillThere?.status).toBe("reversed");

    const privileged = await admin
      .from("bank_reconciliation_matches")
      .delete()
      .eq("id", reversed!.id);
    expect(privileged.error?.message ?? "").toMatch(/cannot be deleted|audit|reversed/i);

    const again = await confirm(clients.bookkeeper, reversed!.bank_transaction_id as string, [
      { entry_id: reversed!.entry_id as string, amount: 1000 },
    ]);
    expect(again.error).toBeNull();

    const { data: history } = await admin
      .from("bank_reconciliation_matches")
      .select("id, status")
      .eq("bank_transaction_id", reversed!.bank_transaction_id)
      .order("created_at");
    expect(history!.length).toBe(2);
    expect(history!.map((h) => h.status).sort()).toEqual(["confirmed", "reversed"]);

    const { count } = await admin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "bank_reconciliation_matches")
      .eq("entity_id", reversed!.id);
    expect(count ?? 0).toBeGreaterThan(0);

  });

  it("refuses to reverse a match twice", async () => {
    const res = await clients.owner.rpc("reverse_bank_match", {
      _match_id: reversedMatchId,
      _reason: "again",
    });
    expect(res.error?.message ?? "").toMatch(/already reversed/i);
  });

});

/* ------------------------------------------------------ 6. closing control */

describe("closing balance controls", () => {
  it("reports the difference between the system and statement closing balance", async () => {
    const accountId = await makeAccount(company.id, "Closing control account", 1_000);
    const { importId } = await importAndCommit(
      clients.bookkeeper,
      accountId,
      [
        { date: "2026-10-02", amount: -200, description: "B1 fee" },
        { date: "2026-10-03", amount: 500, description: "B1 receipt" },
      ],
      { closingBalance: 1_400 },
    );

    const { data } = await clients.bookkeeper.rpc("bank_statement_balance_check", {
      _import_id: importId,
    });
    const chk = (data as Record<string, number>[])[0];
    expect(Number(chk.system_closing)).toBe(1_300);
    expect(Number(chk.statement_closing)).toBe(1_400);
    expect(Number(chk.difference)).toBe(-100);
    expect(Number(chk.unreconciled_count)).toBe(2);
    return { accountId, importId };
  });

  it("refuses to close a batch with unexplained differences", async () => {
    const accountId = await makeAccount(company.id, "Unexplained batch account", 0);
    const { importId } = await importAndCommit(
      clients.bookkeeper,
      accountId,
      [{ date: "2026-10-05", amount: -80, description: "B2 unexplained" }],
      { closingBalance: -100 },
    );
    const res = await clients.owner.rpc("mark_statement_batch_reconciled", {
      _import_id: importId,
    });
    expect(res.error?.message ?? "").toMatch(/unexplained differences/i);
    const { data: batch } = await admin
      .from("bank_statement_imports")
      .select("status")
      .eq("id", importId)
      .single();
    expect(batch!.status).toBe("committed");
  });

  it("requires a manager or owner and a written reason to override", async () => {
    const accountId = await makeAccount(company.id, "Override account", 0);
    const { importId } = await importAndCommit(
      clients.bookkeeper,
      accountId,
      [{ date: "2026-10-06", amount: -80, description: "B3 override" }],
      { closingBalance: -100 },
    );

    const denied = await clients.bookkeeper.rpc("mark_statement_batch_reconciled", {
      _import_id: importId,
      _override_reason: "bank fee not yet booked",
    });
    expect(denied.error?.message ?? "").toMatch(/only owners and managers/i);

    const ok = await clients.manager.rpc("mark_statement_batch_reconciled", {
      _import_id: importId,
      _override_reason: "bank fee not yet booked",
    });
    expect(ok.error).toBeNull();

    const { data: batch } = await admin
      .from("bank_statement_imports")
      .select("status, balance_override_reason, balance_override_by, balance_override_at")
      .eq("id", importId)
      .single();
    expect(batch!.status).toBe("reconciled");
    expect(batch!.balance_override_reason).toBe("bank fee not yet booked");
    expect(batch!.balance_override_by).toBe(userIds.manager);
    expect(batch!.balance_override_at).toBeTruthy();
  });

  it("closes cleanly when everything is reconciled and the balance agrees", async () => {
    const accountId = await makeAccount(company.id, "Clean batch account", 0);
    const entry = await makeEntry({
      description: "CLEAN batch item",
      expected_date: "2026-10-07",
      amount_total: 250,
      amount_net: 250,
    });
    const { importId } = await importAndCommit(
      clients.bookkeeper,
      accountId,
      [{ date: "2026-10-07", amount: -250, description: "B4 clean" }],
      { closingBalance: -250 },
    );
    const tx = await oneTx(accountId, "B4 clean");
    await confirm(clients.bookkeeper, tx.id as string, [
      { entry_id: entry.id as string, amount: 250 },
    ]);

    const res = await clients.owner.rpc("mark_statement_batch_reconciled", {
      _import_id: importId,
    });
    expect(res.error).toBeNull();
    const { data: batch } = await admin
      .from("bank_statement_imports")
      .select("status, reconciled_by, balance_override_reason")
      .eq("id", importId)
      .single();
    expect(batch!.status).toBe("reconciled");
    expect(batch!.reconciled_by).toBe(userIds.owner);
    expect(batch!.balance_override_reason).toBeNull();
  });
});

/* ---------------------------------------------------------- 7. permissions */

describe("isolation and the role matrix", () => {
  it("hides another company's banking data completely", async () => {
    const accounts = await clients.outsider.from("bank_accounts").select("id");
    expect((accounts.data ?? []).map((a) => a.id)).not.toContain(mainAccountId);

    const txs = await clients.outsider
      .from("bank_transactions")
      .select("id")
      .eq("bank_account_id", mainAccountId);
    expect(txs.data ?? []).toHaveLength(0);

    const matches = await clients.outsider
      .from("bank_reconciliation_matches")
      .select("id")
      .eq("company_id", company.id);
    expect(matches.data ?? []).toHaveLength(0);

    const insider = await clients.outsider.from("bank_transactions").insert({
      company_id: company.id,
      bank_account_id: mainAccountId,
      transaction_date: "2026-12-01",
      amount: -1,
      debit_amount: 1,
      credit_amount: 0,
      fingerprint: "intruder|1",
    });
    expect(insider.error).not.toBeNull();
  });

  it("refuses to allocate a movement to another company's expected item", async () => {
    const foreign = await makeEntry({ description: "FOREIGN expected item" }, otherCompany.id);
    await importAndCommit(clients.bookkeeper, mainAccountId, [
      { date: "2026-12-02", amount: -1000, description: "X1 cross-company probe" },
    ]);
    const tx = await oneTx(mainAccountId, "X1 cross-company probe");
    const res = await confirm(clients.owner, tx.id as string, [
      { entry_id: foreign.id as string, amount: 1000 },
    ]);
    expect(res.error?.message ?? "").toMatch(/another company/i);
    expect((await readTx(tx.id as string)).reconciliation_status).toBe("unmatched");
  });

  it("keeps movements attached to the account they were imported into", async () => {
    const { data } = await admin
      .from("bank_transactions")
      .select("id, bank_account_id, company_id")
      .eq("bank_account_id", foreignAccountId);
    expect((data ?? []).every((t) => t.company_id === otherCompany.id)).toBe(true);

    const mine = await admin
      .from("bank_transactions")
      .select("bank_account_id")
      .eq("company_id", company.id);
    expect((mine.data ?? []).every((t) => t.bank_account_id !== foreignAccountId)).toBe(true);
  });

  it.each(ROLES)("%s can read accounts, movements and matches", async (role) => {
    const accounts = await clients[role].from("v_bank_account_balances").select("bank_account_id");
    expect(accounts.error).toBeNull();
    expect((accounts.data ?? []).map((a) => a.bank_account_id)).toContain(mainAccountId);

    const txs = await clients[role].from("v_bank_transactions").select("id").limit(5);
    expect(txs.error).toBeNull();
  });

  it.each(ROLES)("%s account management matches the role matrix", async (role) => {
    const res = await clients[role]
      .from("bank_accounts")
      .insert({
        company_id: company.id,
        name: `Account by ${role}`,
        currency: "EUR",
        opening_balance: 0,
        opening_balance_date: "2026-01-01",
      })
      .select("id")
      .maybeSingle();

    if (MANAGE_ROLES.includes(role)) {
      expect(res.error, `${role} should create accounts`).toBeNull();
      await admin.from("bank_accounts").delete().eq("id", res.data!.id);
    } else {
      expect(res.error, `${role} must not create accounts`).not.toBeNull();
    }
  });

  it.each(ROLES)("%s statement import permission matches the role matrix", async (role) => {
    const staged = await stageImport(clients[role], mainAccountId, [
      { date: "2027-01-05", amount: -11.11, description: `R1 import by ${role}` },
    ]);
    if (!RECORD_ROLES.includes(role)) {
      expect(staged.error, `${role} must not stage statements`).not.toBeNull();
      return;
    }
    expect(staged.error, `${role} should stage statements`).toBeNull();
    const res = await commit(clients[role], staged.importId!);
    expect(res.error).toBeNull();
    await admin.from("bank_transactions").delete().eq("description", `R1 import by ${role}`);
  });

  it.each(ROLES)("%s reconciliation permission matches the role matrix", async (role) => {
    const entry = await makeEntry({ description: `R2 expected for ${role}` });
    await importAndCommit(clients.owner, mainAccountId, [
      { date: "2027-02-05", amount: -1000, description: `R2 movement for ${role}` },
    ]);
    const tx = await oneTx(mainAccountId, `R2 movement for ${role}`);

    const res = await confirm(clients[role], tx.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);
    if (RECORD_ROLES.includes(role)) {
      expect(res.error, `${role} should reconcile`).toBeNull();
      expect((await readTx(tx.id as string)).reconciliation_status).toBe("reconciled");
    } else {
      expect(res.error, `${role} must not reconcile`).not.toBeNull();
      expect((await readTx(tx.id as string)).reconciliation_status).toBe("unmatched");
    }
  });

  it.each(ROLES)("%s reversal permission matches the role matrix", async (role) => {
    const entry = await makeEntry({ description: `R3 expected for ${role}` });
    await importAndCommit(clients.owner, mainAccountId, [
      { date: "2027-03-05", amount: -1000, description: `R3 movement for ${role}` },
    ]);
    const tx = await oneTx(mainAccountId, `R3 movement for ${role}`);
    await confirm(clients.owner, tx.id as string, [
      { entry_id: entry.id as string, amount: 1000 },
    ]);
    const { data: match } = await admin
      .from("bank_reconciliation_matches")
      .select("id")
      .eq("bank_transaction_id", tx.id)
      .eq("status", "confirmed")
      .single();

    const res = await clients[role].rpc("reverse_bank_match", {
      _match_id: match!.id,
      _reason: `reversal attempt by ${role}`,
    });
    if (MANAGE_ROLES.includes(role)) {
      expect(res.error, `${role} should reverse`).toBeNull();
      expect((await readTx(tx.id as string)).reconciliation_status).toBe("unmatched");
    } else {
      expect(res.error, `${role} must not reverse`).not.toBeNull();
      expect((await readTx(tx.id as string)).reconciliation_status).toBe("reconciled");
    }
  });

  it("denies anonymous access to every banking table and routine", async () => {
    const anon = anonClient();
    for (const table of [
      "bank_accounts",
      "bank_transactions",
      "bank_statement_imports",
      "bank_statement_import_rows",
      "bank_reconciliation_matches",
      "bank_transfers",
      "v_bank_account_balances",
      "v_bank_transactions",
      "v_bank_expected_items",
      "v_bank_reconciliation_exceptions",
    ]) {
      const res = await anon.from(table).select("*").limit(1);
      expect(res.data ?? [], `${table} must be unreadable anonymously`).toHaveLength(0);
    }

    const rpc = await anon.rpc("confirm_bank_match", {
      _bank_transaction_id: "00000000-0000-0000-0000-000000000000",
      _allocations: [],
    });
    expect(rpc.error).not.toBeNull();
  });
});
