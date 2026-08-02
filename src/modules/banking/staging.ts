/**
 * Core statement-staging logic, kept out of the *.functions.ts wrapper so it
 * stays callable from other server code (the document-extraction bridge
 * stages Claude-parsed rows through this exact same path instead of
 * inventing a second, less-checked import route).
 *
 * Fingerprints are recomputed here so the caller cannot weaken duplicate
 * detection, and rows already present in the account are flagged (never
 * silently dropped) for the reviewer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import {
  statementBatchHash,
  type stageStatementSchema,
  withFingerprints,
} from "@/modules/banking/schemas";

const nn = <T,>(v: T | null | undefined) => (v === undefined || v === "" ? null : v);

export async function stageStatementImportCore(
  supabase: SupabaseClient,
  data: z.infer<typeof stageStatementSchema>,
) {
  const { data: account, error: aErr } = await supabase
    .from("bank_accounts")
    .select("id, company_id, currency")
    .eq("id", data.bankAccountId)
    .maybeSingle();
  if (aErr) throw new Error(aErr.message);
  if (!account) throw new Error("Bank account not found");

  const reviewed = withFingerprints(
    data.rows.map((r, i) => ({ ...r, line_no: r.line_no ?? i + 1 })),
  );

  const { data: existing, error: eErr } = await supabase
    .from("bank_transactions")
    .select("id, fingerprint")
    .eq("bank_account_id", data.bankAccountId)
    .in(
      "fingerprint",
      reviewed.map((r) => r.fingerprint),
    );
  if (eErr) throw new Error(eErr.message);
  const known = new Map(
    ((existing ?? []) as Array<{ id: string; fingerprint: string }>).map((t) => [
      t.fingerprint,
      t.id,
    ]),
  );

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

  const { data: imp, error } = await supabase
    .from("bank_statement_imports")
    .insert({
      company_id: account.company_id,
      bank_account_id: data.bankAccountId,
      source: data.source,
      file_name: nn(data.fileName),
      document_id: nn(data.documentId),
      content_hash: statementBatchHash(data.rows),
      period_start: data.periodStart || (dates.length ? dates.slice().sort()[0] : null),
      period_end: data.periodEnd || (dates.length ? dates.slice().sort()[dates.length - 1] : null),
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

  const { error: rErr } = await supabase.from("bank_statement_import_rows").insert(
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
}
