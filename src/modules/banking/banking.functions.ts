import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bankAccountSchema,
  closeBatchSchema,
  confirmMatchSchema,
  entryFromTransactionSchema,
  ignoreTransactionSchema,
  importIdSchema,
  reverseMatchSchema,
  rowInclusionSchema,
  stageStatementSchema,
  statementBatchHash,
  transferSchema,
  updateBankAccountSchema,
  withFingerprints,
} from "@/modules/banking/schemas";

const nn = <T,>(v: T | null | undefined) => (v === undefined || v === "" ? null : v);

/* --------------------------------------------------------------- accounts */

export const createBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bankAccountSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bank_accounts")
      .insert({
        company_id: data.companyId,
        name: data.name,
        bank_name: nn(data.bankName),
        iban: nn(data.iban),
        account_identifier: nn(data.accountIdentifier),
        bic: nn(data.bic),
        currency: data.currency,
        account_type: data.accountType,
        opening_balance: data.openingBalance,
        opening_balance_date: data.openingBalanceDate,
        drive_folder_url: nn(data.driveFolderUrl),
        status: data.status,
        is_active: data.status === "active",
        notes: nn(data.notes),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateBankAccountSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { bankAccountId, companyId: _c, ...rest } = data;
    const map: Record<string, string> = {
      name: "name",
      bankName: "bank_name",
      iban: "iban",
      accountIdentifier: "account_identifier",
      bic: "bic",
      currency: "currency",
      accountType: "account_type",
      openingBalance: "opening_balance",
      openingBalanceDate: "opening_balance_date",
      driveFolderUrl: "drive_folder_url",
      status: "status",
      notes: "notes",
    };
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && map[k]) patch[map[k]] = v === "" ? null : v;
    }
    if (rest.status) patch.is_active = rest.status === "active";
    const { error } = await context.supabase
      .from("bank_accounts")
      .update(patch as never)
      .eq("id", bankAccountId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------- statement import */

/**
 * Stages a parsed statement for review. Fingerprints are recomputed here so
 * the client cannot weaken duplicate detection, and rows already present in
 * the account are flagged (never silently dropped) for the reviewer.
 */
export const stageStatementImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => stageStatementSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: account, error: aErr } = await context.supabase
      .from("bank_accounts")
      .select("id, company_id, currency")
      .eq("id", data.bankAccountId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!account) throw new Error("Bank account not found");

    const reviewed = withFingerprints(
      data.rows.map((r, i) => ({ ...r, line_no: r.line_no ?? i + 1 })),
    );

    const { data: existing, error: eErr } = await context.supabase
      .from("bank_transactions")
      .select("id, fingerprint")
      .eq("bank_account_id", data.bankAccountId)
      .in(
        "fingerprint",
        reviewed.map((r) => r.fingerprint),
      );
    if (eErr) throw new Error(eErr.message);
    const known = new Map((existing ?? []).map((t) => [t.fingerprint as string, t.id as string]));

    const rows = reviewed.map((r) => {
      const dup = known.get(r.fingerprint) ?? null;
      return {
        ...r,
        is_duplicate: Boolean(dup),
        duplicate_of_transaction_id: dup,
        include: r.issues.length === 0 && !dup,
      };
    });

    // A statement line without a readable date cannot be staged; it is
    // reported back so the reviewer can correct the file and re-upload.
    const stageable = rows.filter(
      (r): r is typeof r & { transaction_date: string } => Boolean(r.transaction_date),
    );
    if (!stageable.length) throw new Error("No statement line has a readable transaction date");
    const rejected = rows.length - stageable.length;

    const dates = stageable.map((r) => r.transaction_date);

    const { data: imp, error } = await context.supabase
      .from("bank_statement_imports")
      .insert({
        company_id: account.company_id,
        bank_account_id: data.bankAccountId,
        source: data.source,
        file_name: nn(data.fileName),
        document_id: nn(data.documentId),
        content_hash: statementBatchHash(data.rows),
        period_start: data.periodStart || (dates.length ? dates.slice().sort()[0] : null),
        period_end:
          data.periodEnd || (dates.length ? dates.slice().sort()[dates.length - 1] : null),
        statement_opening_balance: data.statementOpeningBalance ?? null,
        statement_closing_balance: data.statementClosingBalance ?? null,
        status: "draft",
        row_count: stageable.length,
        duplicate_count: stageable.filter((r) => r.is_duplicate).length,
        error_count: stageable.filter((r) => r.issues.length > 0).length + rejected,
        notes: nn(data.notes),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: rErr } = await context.supabase.from("bank_statement_import_rows").insert(
      stageable.map((r) => ({
        company_id: account.company_id,
        import_id: imp.id,
        line_no: r.line_no,
        transaction_date: r.transaction_date,
        value_date: r.value_date ?? null,
        description: r.description ?? null,
        bank_reference: r.bank_reference ?? null,
        counterparty_name: r.counterparty_name ?? null,
        counterparty_account: r.counterparty_account ?? null,
        debit_amount: r.debit_amount,
        credit_amount: r.credit_amount,
        amount: r.amount,
        running_balance: r.running_balance ?? null,
        source_row_id: r.source_row_id ?? null,
        fingerprint: r.fingerprint,
        issues: r.issues,
        is_duplicate: r.is_duplicate,
        duplicate_of_transaction_id: r.duplicate_of_transaction_id,
        include: r.include,
      })),
    );
    if (rErr) throw new Error(rErr.message);

    return {
      importId: imp.id as string,
      rowCount: stageable.length,
      rejectedCount: rejected,
      duplicateCount: stageable.filter((r) => r.is_duplicate).length,
      errorCount: stageable.filter((r) => r.issues.length > 0).length,
      rows: stageable,
    };

  });

/** An authorised reviewer may re-include a suspected duplicate, or drop a row. */
export const setStatementRowInclusion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rowInclusionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bank_statement_import_rows")
      .update({ include: data.include })
      .eq("id", data.rowId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Atomic: the database routine inserts every included row or none of them. */
export const commitStatementImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => importIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("commit_bank_statement_import", {
      _import_id: data.importId,
    });
    if (error) throw new Error(error.message);
    return result as { imported: number; skipped: number };
  });

export const discardStatementImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => importIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bank_statement_imports")
      .update({ status: "discarded" })
      .eq("id", data.importId)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------- reconciliation */

/** Suggestions only — nothing is reconciled until confirmBankMatch is called. */
export const suggestMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data as {
    bankTransactionId: string;
    amountTolerance?: number;
    dateTolerance?: number;
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("suggest_bank_matches", {
      _bank_transaction_id: data.bankTransactionId,
      _amount_tolerance: data.amountTolerance ?? 0.02,
      _date_tolerance: data.dateTolerance ?? 7,
      _limit: 10,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/**
 * Confirms one or more allocations for a transaction. Settlement and
 * reconciliation state are updated by the routine; contractual amounts owned
 * by financing, leases and projects are never touched.
 */
export const confirmBankMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => confirmMatchSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("confirm_bank_match", {
      _bank_transaction_id: data.bankTransactionId,
      _allocations: data.allocations.map((a) => ({
        entry_id: a.entryId,
        amount: a.amount,
        match_type: a.matchType ?? "manual",
        variance_reason: a.varianceReason ?? null,
      })),
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return result as { match_ids: string[]; allocated: number };
  });

/** Reversal keeps the audit record and marks it reversed; it never deletes. */
export const reverseBankMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reverseMatchSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("reverse_bank_match", {
      _match_id: data.matchId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean };
  });

export const setTransactionIgnored = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ignoreTransactionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bank_transactions")
      .update({ reconciliation_status: data.ignored ? "ignored" : "unmatched" })
      .eq("id", data.bankTransactionId)
      .neq("reconciliation_status", "reconciled");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Pairs two opposite movements as an internal transfer, out of the portfolio. */
export const recordInternalTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => transferSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: pair, error } = await context.supabase
      .from("bank_transactions")
      .select("id, company_id, bank_account_id, amount, transaction_date, reconciliation_status")
      .in("id", [data.fromTransactionId, data.toTransactionId]);
    if (error) throw new Error(error.message);
    if (!pair || pair.length !== 2) throw new Error("Both transactions must exist");

    const from = pair.find((t) => t.id === data.fromTransactionId)!;
    const to = pair.find((t) => t.id === data.toTransactionId)!;
    if (from.bank_account_id === to.bank_account_id) {
      throw new Error("An internal transfer must involve two different accounts");
    }
    if (Number(from.amount) >= 0 || Number(to.amount) <= 0) {
      throw new Error("Pair one outgoing movement with one incoming movement");
    }
    if (Math.abs(Math.abs(Number(from.amount)) - Number(to.amount)) > 0.02) {
      throw new Error("The two movements do not have matching amounts");
    }
    if (pair.some((t) => t.reconciliation_status === "reconciled")) {
      throw new Error("A reconciled transaction cannot be turned into a transfer");
    }

    const { error: tErr } = await context.supabase.from("bank_transfers").insert({
      company_id: from.company_id,
      from_transaction_id: from.id,
      to_transaction_id: to.id,
      from_account_id: from.bank_account_id,
      to_account_id: to.bank_account_id,
      amount: Math.abs(Number(from.amount)),
      transfer_date: from.transaction_date,
      notes: data.notes ?? null,
    });
    if (tErr) throw new Error(tErr.message);

    const { error: uErr } = await context.supabase
      .from("bank_transactions")
      .update({ reconciliation_status: "transfer", is_internal_transfer: true })
      .in("id", [from.id, to.id]);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

/**
 * Turns an unmatched movement into a cash-flow item and reconciles the two in
 * one step. The new item is a manual entry, so no source module is bypassed.
 */
export const createEntryFromTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entryFromTransactionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: tx, error } = await context.supabase
      .from("bank_transactions")
      .select("*")
      .eq("id", data.bankTransactionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tx) throw new Error("Bank transaction not found");
    if (tx.reconciliation_status === "reconciled") {
      throw new Error("This transaction is already reconciled");
    }

    const gross = Math.abs(Number(tx.amount));
    const net = Math.round((gross - data.vat) * 100) / 100;
    const { data: entry, error: cErr } = await context.supabase
      .from("cash_flow_entries")
      .insert({
        company_id: tx.company_id,
        property_id: nn(data.propertyId),
        bank_account_id: tx.bank_account_id,
        category: data.category,
        direction: Number(tx.amount) >= 0 ? "inflow" : "outflow",
        state: "actual",
        description: data.description || tx.description || "Bank movement",
        counterparty_name: data.counterpartyName || tx.counterparty_name,
        currency: tx.currency,
        amount_net: net,
        vat: data.vat,
        amount_total: gross,
        entry_date: tx.transaction_date,
        expected_date: tx.transaction_date,
        actual_date: tx.transaction_date,
        confidence: "confirmed",
        notes: data.notes ?? null,
        source_type: "manual",
        is_manual: true,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);

    const { error: mErr } = await context.supabase.rpc("confirm_bank_match", {
      _bank_transaction_id: tx.id,
      _allocations: [{ entry_id: entry.id, amount: gross, match_type: "conversion" }],
      _notes: "Created from unmatched bank transaction",
    });
    if (mErr) throw new Error(mErr.message);
    return { entryId: entry.id as string };
  });

/* ------------------------------------------------------- closing controls */

export const checkStatementBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => importIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("bank_statement_balance_check", {
      _import_id: data.importId,
    });
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

/** Refused while an unexplained balance difference remains, unless overridden. */
export const closeStatementBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => closeBatchSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("mark_statement_batch_reconciled", {
      _import_id: data.importId,
      _override_reason: data.overrideReason || undefined,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean };
  });
