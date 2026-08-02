import { z } from "zod";

import { parseAmount, parseDateCell } from "@/modules/realestate/financing-schemas";

/* ----------------------------------------------------------- vocabularies */

export const ACCOUNT_TYPES = [
  { value: "current", label: "Current account" },
  { value: "savings", label: "Savings" },
  { value: "escrow", label: "Escrow" },
  { value: "loan", label: "Loan account" },
  { value: "card", label: "Card" },
] as const;

export const ACCOUNT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

export const BATCH_STATUSES = [
  { value: "draft", label: "In review" },
  { value: "committed", label: "Imported" },
  { value: "reconciled", label: "Reconciled" },
  { value: "discarded", label: "Discarded" },
] as const;

export const TX_RECONCILIATION_STATUSES = [
  { value: "unmatched", label: "Unmatched" },
  { value: "partially_matched", label: "Partly matched" },
  { value: "reconciled", label: "Reconciled" },
  { value: "transfer", label: "Internal transfer" },
  { value: "ignored", label: "Ignored" },
] as const;

export const MATCH_TYPES = [
  { value: "manual", label: "Manual match" },
  { value: "suggested", label: "Accepted suggestion" },
  { value: "partial", label: "Partial settlement" },
  { value: "allocation", label: "Split allocation" },
  { value: "fee", label: "Bank fee / variance" },
  { value: "conversion", label: "Created from transaction" },
] as const;

/** Defaults for the suggestion engine; the user can widen them in the UI. */
export const DEFAULT_AMOUNT_TOLERANCE = 0.02;
export const DEFAULT_DATE_TOLERANCE = 7;

/* ---------------------------------------------------------------- schemas */

const money = z.number().finite();

export const bankAccountSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1, "Account name is required"),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  accountIdentifier: z.string().optional(),
  bic: z.string().optional(),
  currency: z.string().length(3).default("EUR"),
  accountType: z.string().default("current"),
  openingBalance: money.default(0),
  openingBalanceDate: z.string().min(1, "Opening-balance date is required"),
  driveFolderUrl: z.string().optional(),
  status: z.enum(["active", "archived"]).default("active"),
  notes: z.string().optional(),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export const updateBankAccountSchema = bankAccountSchema
  .partial()
  .extend({ bankAccountId: z.string().uuid() });

export const statementRowSchema = z.object({
  line_no: z.number().int(),
  transaction_date: z.string().nullable(),
  value_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  bank_reference: z.string().nullable().optional(),
  counterparty_name: z.string().nullable().optional(),
  counterparty_account: z.string().nullable().optional(),
  debit_amount: z.number().default(0),
  credit_amount: z.number().default(0),
  amount: z.number().default(0),
  running_balance: z.number().nullable().optional(),
  source_row_id: z.string().nullable().optional(),
});
export type ParsedStatementRow = z.infer<typeof statementRowSchema>;

export const stageStatementSchema = z.object({
  bankAccountId: z.string().uuid(),
  source: z.enum(["csv", "xlsx", "manual", "ai_extraction"]).default("csv"),
  fileName: z.string().optional(),
  documentId: z.string().uuid().nullable().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  statementOpeningBalance: money.optional(),
  statementClosingBalance: money.optional(),
  notes: z.string().optional(),
  rows: z.array(statementRowSchema).min(1, "At least one statement line is required"),
});

export const importIdSchema = z.object({ importId: z.string().uuid() });

export const rowInclusionSchema = z.object({
  rowId: z.string().uuid(),
  include: z.boolean(),
});

export const allocationSchema = z.object({
  entryId: z.string().uuid(),
  amount: z.number().positive(),
  matchType: z.string().optional(),
  varianceReason: z.string().optional(),
});

export const confirmMatchSchema = z.object({
  bankTransactionId: z.string().uuid(),
  allocations: z.array(allocationSchema).min(1, "Allocate at least one expected item"),
  notes: z.string().optional(),
});

export const reverseMatchSchema = z.object({
  matchId: z.string().uuid(),
  reason: z.string().min(1, "A reason is required to unreconcile"),
});

export const transferSchema = z.object({
  fromTransactionId: z.string().uuid(),
  toTransactionId: z.string().uuid(),
  notes: z.string().optional(),
});

export const entryFromTransactionSchema = z.object({
  bankTransactionId: z.string().uuid(),
  category: z.string().default("other"),
  description: z.string().optional(),
  propertyId: z.string().uuid().nullable().optional(),
  counterpartyName: z.string().optional(),
  vat: money.default(0),
  notes: z.string().optional(),
});

export const closeBatchSchema = z.object({
  importId: z.string().uuid(),
  overrideReason: z.string().optional(),
});

export const ignoreTransactionSchema = z.object({
  bankTransactionId: z.string().uuid(),
  ignored: z.boolean().default(true),
});

/* --------------------------------------------------------------- parsing */

type Field =
  | "transaction_date"
  | "value_date"
  | "description"
  | "bank_reference"
  | "counterparty_name"
  | "counterparty_account"
  | "debit_amount"
  | "credit_amount"
  | "amount"
  | "running_balance"
  | "source_row_id";

const HEADER_ALIASES: Record<string, Field> = {
  date: "transaction_date",
  "transaction date": "transaction_date",
  "booking date": "transaction_date",
  "data movimento": "transaction_date",
  "data operacao": "transaction_date",
  data: "transaction_date",
  "value date": "value_date",
  "data valor": "value_date",
  valor_data: "value_date",
  description: "description",
  descricao: "description",
  descritivo: "description",
  details: "description",
  memo: "description",
  reference: "bank_reference",
  "bank reference": "bank_reference",
  referencia: "bank_reference",
  ref: "bank_reference",
  counterparty: "counterparty_name",
  "counterparty name": "counterparty_name",
  beneficiario: "counterparty_name",
  ordenante: "counterparty_name",
  payee: "counterparty_name",
  "counterparty account": "counterparty_account",
  "counterparty iban": "counterparty_account",
  iban: "counterparty_account",
  debit: "debit_amount",
  debito: "debit_amount",
  "debit amount": "debit_amount",
  withdrawal: "debit_amount",
  credit: "credit_amount",
  credito: "credit_amount",
  "credit amount": "credit_amount",
  deposit: "credit_amount",
  amount: "amount",
  valor: "amount",
  montante: "amount",
  balance: "running_balance",
  "running balance": "running_balance",
  saldo: "running_balance",
  id: "source_row_id",
  "transaction id": "source_row_id",
  "source row id": "source_row_id",
};

function normaliseHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function mapStatementHeader(header: string): Field | null {
  const key = normaliseHeader(header);
  return HEADER_ALIASES[key] ?? HEADER_ALIASES[key.replace(/ /g, "_")] ?? null;
}

/** Minimal RFC-4180 CSV reader: handles quotes, embedded separators and CRLF. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const sep = delimiter ?? guessDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function guessDelimiter(text: string) {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const counts: Record<string, number> = {
    ",": (head.match(/,/g) ?? []).length,
    ";": (head.match(/;/g) ?? []).length,
    "\t": (head.match(/\t/g) ?? []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export type StatementReviewRow = ParsedStatementRow & {
  fingerprint: string;
  issues: string[];
  include: boolean;
  is_duplicate: boolean;
};

/**
 * Turns a table of raw cells (first row = header) into reviewable statement
 * lines. Debit/credit columns and a single signed amount column are both
 * accepted; the signed amount always wins once computed.
 */
export function buildStatementRows(table: unknown[][]): StatementReviewRow[] {
  if (!table.length) return [];
  const headers = (table[0] ?? []).map((h) => mapStatementHeader(String(h ?? "")));
  const parsed: ParsedStatementRow[] = [];

  table.slice(1).forEach((cells) => {
    if (!cells || cells.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      return;
    }
    const draft: Record<string, unknown> = {};
    headers.forEach((key, idx) => {
      if (key) draft[key] = cells[idx];
    });

    const debit = Math.abs(parseAmount(draft.debit_amount) ?? 0);
    const credit = Math.abs(parseAmount(draft.credit_amount) ?? 0);
    const signed = parseAmount(draft.amount);
    const amount = signed !== null && signed !== 0 ? signed : credit - debit;

    parsed.push({
      line_no: parsed.length + 1,
      transaction_date: parseDateCell(draft.transaction_date),
      value_date: parseDateCell(draft.value_date),
      description: text(draft.description),
      bank_reference: text(draft.bank_reference),
      counterparty_name: text(draft.counterparty_name),
      counterparty_account: text(draft.counterparty_account),
      debit_amount: debit || (amount < 0 ? Math.abs(amount) : 0),
      credit_amount: credit || (amount > 0 ? amount : 0),
      amount: round2(amount),
      running_balance: parseAmount(draft.running_balance),
      source_row_id: text(draft.source_row_id),
    });
  });

  return withFingerprints(parsed);
}

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function normaliseText(v: string | null | undefined) {
  return (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 60);
}

/**
 * Account-scoped, stable fingerprint. Two imports covering the same days
 * produce identical fingerprints for the same movement, so overlapping files
 * never create a second copy. Identical same-day movements are separated by
 * their occurrence index, which is stable as long as the bank exports them in
 * the same order.
 */
export function statementFingerprint(row: ParsedStatementRow, occurrence: number): string {
  if (row.source_row_id) return `id:${row.source_row_id}`;
  return [
    row.transaction_date ?? "",
    row.amount.toFixed(2),
    normaliseText(row.description),
    normaliseText(row.bank_reference),
    occurrence,
  ].join("|");
}

/** Adds fingerprints plus the validation issues surfaced in the review step. */
export function withFingerprints(rows: ParsedStatementRow[]): StatementReviewRow[] {
  const seen = new Map<string, number>();
  return rows.map((row, i) => {
    const base = statementFingerprint({ ...row, source_row_id: null }, 0);
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    const fingerprint = statementFingerprint(row, occurrence);

    const issues: string[] = [];
    if (!row.transaction_date) issues.push("Missing transaction date");
    if (!row.amount) issues.push("Amount is zero or unreadable");
    if (
      row.debit_amount > 0 &&
      row.credit_amount > 0 &&
      Math.abs(row.credit_amount - row.debit_amount - row.amount) > 0.01
    ) {
      issues.push("Debit and credit do not agree with the signed amount");
    }

    return {
      ...row,
      line_no: i + 1,
      fingerprint,
      issues,
      include: issues.length === 0,
      is_duplicate: false,
    };
  });
}

/** Fingerprint of the whole file, so the same statement is recognised twice. */
export function statementBatchHash(rows: ParsedStatementRow[]): string {
  const body = rows
    .map((r) => [r.transaction_date, r.amount, r.bank_reference, r.description].join("|"))
    .join(";");
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < body.length; i++) {
    const c = body.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}-${rows.length}`;
}

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}
