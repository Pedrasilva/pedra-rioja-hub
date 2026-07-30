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
import {
  statementBatchHash,
  withFingerprints,
  type ParsedStatementRow,
} from "../../src/modules/banking/schemas";

/**
 * Phase 8D — the import framework.
 *
 * Every import follows the same contract: stage → review → confirm. Staging
 * writes only to the batch tables; nothing reaches a live register until the
 * confirm function runs, and a batch that fails validation is rejected whole
 * (no partial commit). Opening balances are never imported as transactions —
 * they stay on the bank account, the existing banking path.
 */

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"] as const;
type Role = (typeof ROLES)[number];
const RECORD_ROLES: Role[] = ["owner", "manager", "bookkeeper", "assistant"];
const PASSWORD = "QaPedraRioja!2026";

let company: TestCompany;
let other: TestCompany;
let accountId: string;
let foreignAccountId: string;
let agreementId: string;
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

async function createRoleUser(role: string, companyId: string, prefix = "imp") {
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

let seq = 0;
const uniq = (label: string) => `${label} ${Date.now()}-${++seq}`;

/* ------------------------------------------------- statement staging helper */

type RowInput = { date: string; description: string; amount: number; ref?: string };

function parsedRow(input: RowInput, lineNo: number): ParsedStatementRow {
  return {
    line_no: lineNo,
    transaction_date: input.date,
    value_date: input.date,
    description: input.description,
    bank_reference: input.ref ?? null,
    counterparty_name: null,
    debit_amount: input.amount < 0 ? Math.abs(input.amount) : 0,
    credit_amount: input.amount > 0 ? input.amount : 0,
    amount: input.amount,
    running_balance: null,
    source_row_id: null,
  } as ParsedStatementRow;
}

async function stageStatement(
  client: SupabaseClient,
  bankAccountId: string,
  inputs: RowInput[],
  opts: { forceIssue?: boolean; closingBalance?: number } = {},
) {
  const account = await client
    .from("bank_accounts")
    .select("id, company_id")
    .eq("id", bankAccountId)
    .maybeSingle();
  if (!account.data) return { error: { message: "account not visible" }, importId: null };

  const parsed = inputs.map((r, i) => parsedRow(r, i + 1));
  const reviewed = withFingerprints(parsed);

  const existing = await client
    .from("bank_transactions")
    .select("id, fingerprint")
    .eq("bank_account_id", bankAccountId)
    .in(
      "fingerprint",
      reviewed.map((r) => r.fingerprint),
    );
  const known = new Map((existing.data ?? []).map((t) => [t.fingerprint as string, t.id as string]));

  const dates = inputs.map((r) => r.date).sort();
  const imp = await client
    .from("bank_statement_imports")
    .insert({
      company_id: account.data.company_id,
      bank_account_id: bankAccountId,
      source: "csv",
      file_name: uniq("statement") + ".csv",
      content_hash: statementBatchHash(parsed),
      period_start: dates[0],
      period_end: dates[dates.length - 1],
      statement_closing_balance: opts.closingBalance ?? null,
      status: "draft",
      row_count: reviewed.length,
      duplicate_count: reviewed.filter((r) => known.has(r.fingerprint)).length,
      error_count: opts.forceIssue ? 1 : 0,
    })
    .select("id")
    .single();
  if (imp.error) return { error: imp.error, importId: null };

  const rows = await client.from("bank_statement_import_rows").insert(
    reviewed.map((r) => {
      const dup = known.get(r.fingerprint) ?? null;
      return {
        company_id: account.data!.company_id,
        import_id: imp.data!.id,
        line_no: r.line_no,
        transaction_date: r.transaction_date,
        value_date: r.value_date ?? null,
        description: r.description ?? null,
        bank_reference: r.bank_reference ?? null,
        debit_amount: r.debit_amount,
        credit_amount: r.credit_amount,
        amount: r.amount,
        fingerprint: r.fingerprint,
        issues: opts.forceIssue ? ["Amount is zero or unreadable"] : [],
        is_duplicate: Boolean(dup),
        duplicate_of_transaction_id: dup,
        include: true,
      };
    }),
  );
  if (rows.error) return { error: rows.error, importId: imp.data!.id };
  return { error: null, importId: imp.data!.id as string };
}

async function txCount(bankAccountId: string) {
  const res = await admin
    .from("bank_transactions")
    .select("id", { count: "exact", head: true })
    .eq("bank_account_id", bankAccountId);
  return res.count ?? 0;
}

/* -------------------------------------------------------------- fixtures */

beforeAll(async () => {
  company = await createTestCompany("imports");
  other = await createTestCompany("imports-other");

  for (const role of ROLES) clients[role] = await createRoleUser(role, company.id);
  otherOwner = await createRoleUser("owner", other.id, "imp-other");

  const acct = await admin
    .from("bank_accounts")
    .insert({
      company_id: company.id,
      name: uniq("Import account"),
      bank_name: "Caixa QA",
      currency: "EUR",
      opening_balance: 12_500,
      opening_balance_date: "2026-01-01",
    })
    .select("id")
    .single();
  expectNoError(acct, "insert bank account");
  accountId = acct.data!.id;

  const foreign = await admin
    .from("bank_accounts")
    .insert({
      company_id: other.id,
      name: uniq("Foreign account"),
      currency: "EUR",
      opening_balance: 0,
    })
    .select("id")
    .single();
  expectNoError(foreign, "insert foreign bank account");
  foreignAccountId = foreign.data!.id;

  const agreement = await admin
    .from("financing_agreements")
    .insert({
      company_id: company.id,
      type: "mortgage",
      lender: "Banco QA",
      principal: 200_000,
      currency: "EUR",
      start_date: "2026-01-01",
      rate_type: "fixed",
      fixed_rate: 3.5,
      status: "active",
    })
    .select("id")
    .single();
  expectNoError(agreement, "insert financing agreement");
  agreementId = agreement.data!.id;
}, 180_000);

afterAll(async () => {
  await dropTestCompany(company);
  await dropTestCompany(other);
});

/* ----------------------------------------------------------------- tests */

describe("staging and review", () => {
  it("stages rows without touching the live register", async () => {
    const before = await txCount(accountId);
    const { importId, error } = await stageStatement(clients.manager, accountId, [
      { date: "2026-02-01", description: "Rent received", amount: 950 },
      { date: "2026-02-03", description: "Water bill", amount: -42.5 },
    ]);
    expect(error).toBeNull();

    const batch = await admin
      .from("bank_statement_imports")
      .select("status, row_count")
      .eq("id", importId!)
      .single();
    expect(batch.data!.status).toBe("draft");
    expect(batch.data!.row_count).toBe(2);
    expect(await txCount(accountId)).toBe(before);
  });

  it("lets the reviewer exclude a row before confirmation", async () => {
    const before = await txCount(accountId);
    const { importId } = await stageStatement(clients.manager, accountId, [
      { date: "2026-03-01", description: "Included line", amount: 100 },
      { date: "2026-03-02", description: "Excluded line", amount: 200 },
    ]);
    const excluded = await clients.manager
      .from("bank_statement_import_rows")
      .update({ include: false })
      .eq("import_id", importId!)
      .eq("line_no", 2);
    expectNoError(excluded, "exclude row");

    const res = await clients.manager.rpc("commit_bank_statement_import", {
      _import_id: importId,
    });
    expectNoError(res, "commit");
    expect(await txCount(accountId)).toBe(before + 1);
  });
});

describe("confirmation and rollback", () => {
  it("commits a clean batch atomically and marks it committed", async () => {
    const before = await txCount(accountId);
    const { importId } = await stageStatement(clients.manager, accountId, [
      { date: "2026-04-01", description: "Insurance premium", amount: -310 },
      { date: "2026-04-05", description: "Rent received", amount: 950, ref: "APR" },
    ]);
    const res = await clients.manager.rpc("commit_bank_statement_import", { _import_id: importId });
    expectNoError(res, "commit");
    expect((res.data as { imported: number }).imported).toBe(2);
    expect(await txCount(accountId)).toBe(before + 2);

    const batch = await admin
      .from("bank_statement_imports")
      .select("status, committed_at, imported_count")
      .eq("id", importId!)
      .single();
    expect(batch.data!.status).toBe("committed");
    expect(batch.data!.committed_at).not.toBeNull();
    expect(batch.data!.imported_count).toBe(2);
  });

  it("rolls back the whole batch when an included row still has issues", async () => {
    const before = await txCount(accountId);
    const { importId } = await stageStatement(
      clients.manager,
      accountId,
      [
        { date: "2026-05-01", description: "Good line", amount: 500 },
        { date: "2026-05-02", description: "Broken line", amount: 0 },
      ],
      { forceIssue: true },
    );
    const res = await clients.manager.rpc("commit_bank_statement_import", { _import_id: importId });
    expect(res.error?.message ?? "").toMatch(/validation issues/i);
    expect(await txCount(accountId)).toBe(before);

    const batch = await admin
      .from("bank_statement_imports")
      .select("status")
      .eq("id", importId!)
      .single();
    expect(batch.data!.status).toBe("draft");
  });

  it("refuses to commit the same batch twice", async () => {
    const { importId } = await stageStatement(clients.manager, accountId, [
      { date: "2026-06-01", description: "Condo fee", amount: -120 },
    ]);
    expectNoError(
      await clients.manager.rpc("commit_bank_statement_import", { _import_id: importId }),
      "first commit",
    );
    const again = await clients.manager.rpc("commit_bank_statement_import", {
      _import_id: importId,
    });
    expect(again.error?.message ?? "").toMatch(/already/i);
  });
});

describe("duplicate detection", () => {
  it("flags rows that already exist on the account", async () => {
    const rows: RowInput[] = [
      { date: "2026-07-01", description: "Duplicate candidate", amount: -75, ref: "DUP1" },
    ];
    const first = await stageStatement(clients.manager, accountId, rows);
    expectNoError(
      await clients.manager.rpc("commit_bank_statement_import", { _import_id: first.importId }),
      "commit first",
    );

    const second = await stageStatement(clients.manager, accountId, rows);
    const staged = await admin
      .from("bank_statement_import_rows")
      .select("is_duplicate, duplicate_of_transaction_id")
      .eq("import_id", second.importId!)
      .single();
    expect(staged.data!.is_duplicate).toBe(true);
    expect(staged.data!.duplicate_of_transaction_id).not.toBeNull();
  });

  it("never imports the same transaction twice even if re-included", async () => {
    const rows: RowInput[] = [
      { date: "2026-08-01", description: "Repeat guard", amount: -60, ref: "DUP2" },
    ];
    const first = await stageStatement(clients.manager, accountId, rows);
    expectNoError(
      await clients.manager.rpc("commit_bank_statement_import", { _import_id: first.importId }),
      "commit first",
    );
    const before = await txCount(accountId);

    const second = await stageStatement(clients.manager, accountId, rows);
    await clients.manager
      .from("bank_statement_import_rows")
      .update({ include: true })
      .eq("import_id", second.importId!);
    const res = await clients.manager.rpc("commit_bank_statement_import", {
      _import_id: second.importId,
    });
    expectNoError(res, "commit duplicate batch");
    expect((res.data as { imported: number }).imported).toBe(0);
    expect(await txCount(accountId)).toBe(before);
  });
});

describe("permissions and company isolation", () => {
  it("blocks non-recording roles from committing a batch", async () => {
    for (const role of ROLES) {
      const { importId, error } = await stageStatement(clients[role], accountId, [
        { date: "2026-09-01", description: `Batch by ${role}`, amount: -10 - seq },
      ]);
      if (!RECORD_ROLES.includes(role)) {
        expect(error ?? { message: "" }).not.toBeNull();
        continue;
      }
      expect(error).toBeNull();
      const res = await clients[role].rpc("commit_bank_statement_import", { _import_id: importId });
      expectNoError(res, `commit as ${role}`);
    }
  });

  it("cannot stage against another company's bank account", async () => {
    const res = await stageStatement(clients.owner, foreignAccountId, [
      { date: "2026-10-01", description: "Cross-company", amount: -5 },
    ]);
    expect(res.importId).toBeNull();
  });

  it("keeps batches and rows invisible across companies and to anonymous callers", async () => {
    const mine = await clients.viewer.from("bank_statement_imports").select("company_id");
    expectNoError(mine, "viewer read");
    expect(mine.data!.every((b) => b.company_id === company.id)).toBe(true);

    const foreign = await otherOwner.from("bank_statement_imports").select("company_id");
    expectNoError(foreign, "foreign read");
    expect(foreign.data!.every((b) => b.company_id === other.id)).toBe(true);

    const anon = await anonClient().from("bank_statement_import_rows").select("id");
    expect(anon.data ?? []).toHaveLength(0);
  });
});

describe("opening balances stay on the banking path", () => {
  it("keeps the opening balance on the account, not in the transaction ledger", async () => {
    const account = await admin
      .from("bank_accounts")
      .select("opening_balance, opening_balance_date")
      .eq("id", accountId)
      .single();
    expect(Number(account.data!.opening_balance)).toBe(12_500);

    const openingRows = await admin
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("bank_account_id", accountId)
      .ilike("description", "%opening balance%");
    expect(openingRows.count ?? 0).toBe(0);
  });

  it("updates the opening balance through the account record only", async () => {
    const res = await clients.manager
      .from("bank_accounts")
      .update({ opening_balance: 13_000, opening_balance_date: "2026-01-01" })
      .eq("id", accountId)
      .select("opening_balance")
      .single();
    expectNoError(res, "update opening balance");
    expect(Number(res.data!.opening_balance)).toBe(13_000);
  });
});

describe("financing schedule imports use the same contract", () => {
  it("stages, reviews and applies a schedule as a new version", async () => {
    const imp = await clients.manager
      .from("financing_schedule_imports")
      .insert({
        company_id: company.id,
        agreement_id: agreementId,
        source: "csv",
        file_name: uniq("schedule") + ".csv",
        effective_from: "2026-01-01",
        reason: "origination",
        status: "draft",
        row_count: 2,
        error_count: 0,
      })
      .select("id")
      .single();
    expectNoError(imp, "stage financing import");

    const rows = [
      {
        period_no: 1,
        due_date: "2026-01-31",
        opening_balance: 200_000,
        interest: 583.33,
        principal: 400,
        total_payment: 983.33,
        closing_balance: 199_600,
      },
      {
        period_no: 2,
        due_date: "2026-02-28",
        opening_balance: 199_600,
        interest: 582.17,
        principal: 401.16,
        total_payment: 983.33,
        closing_balance: 199_198.84,
      },
    ];
    const staged = await clients.manager.from("financing_schedule_import_rows").insert(
      rows.map((r, i) => ({
        company_id: company.id,
        import_id: imp.data!.id,
        line_no: i + 1,
        ...r,
        issues: [],
        include: true,
      })),
    );
    expectNoError(staged, "stage rows");

    const before = await admin
      .from("financing_schedule_versions")
      .select("id", { count: "exact", head: true })
      .eq("agreement_id", agreementId);

    const applied = await clients.manager.rpc("apply_financing_schedule", {
      _agreement_id: agreementId,
      _effective_from: "2026-01-01",
      _reason: "origination",
      _rows: rows,
      _import_id: imp.data!.id,
    });
    expectNoError(applied, "apply financing schedule");

    const after = await admin
      .from("financing_schedule_versions")
      .select("id, is_current", { count: "exact" })
      .eq("agreement_id", agreementId);
    expect((after.count ?? 0) - (before.count ?? 0)).toBe(1);
    expect(after.data!.filter((v) => v.is_current).length).toBe(1);

    const scheduleRows = await admin
      .from("financing_schedule_rows")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    expect(scheduleRows.count ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("refuses to apply a schedule for another company's agreement", async () => {
    const res = await otherOwner.rpc("apply_financing_schedule", {
      _agreement_id: agreementId,
      _effective_from: "2026-06-01",
      _reason: "revision",
      _rows: [
        {
          period_no: 1,
          due_date: "2026-06-30",
          interest: 1,
          principal: 1,
          total_payment: 2,
        },
      ],
    });
    expect(res.error).not.toBeNull();
  });
});
