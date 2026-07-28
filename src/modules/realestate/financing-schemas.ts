import { z } from "zod";

/* ------------------------------------------------------------------ options */

export const FINANCING_TYPES = [
  { value: "mortgage", label: "Mortgage" },
  { value: "leasing", label: "Real-estate leasing" },
  { value: "shareholder_loan", label: "Shareholder loan" },
  { value: "credit_line", label: "Credit line" },
  { value: "other", label: "Other" },
] as const;

export const RATE_TYPES = [
  { value: "euribor_spread", label: "Index + spread" },
  { value: "fixed", label: "Fixed" },
  { value: "mixed", label: "Mixed" },
] as const;

export const REPAYMENT_TYPES = [
  { value: "annuity", label: "Annuity (French)" },
  { value: "linear", label: "Linear" },
  { value: "bullet", label: "Bullet" },
  { value: "custom", label: "Custom / imported" },
] as const;

export const AGREEMENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "settled", label: "Settled" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const REVISION_REASONS = [
  { value: "origination", label: "Origination" },
  { value: "rate_reset", label: "Rate reset" },
  { value: "early_repayment", label: "Early repayment" },
  { value: "restructure", label: "Restructure" },
  { value: "correction", label: "Correction" },
] as const;

/* ------------------------------------------------------------------ schemas */

export const agreementInputSchema = z.object({
  companyId: z.string().uuid(),
  propertyId: z.string().uuid().nullable().optional(),
  type: z.string().default("mortgage"),
  lender: z.string().min(1, "Lender is required"),
  reference: z.string().optional(),
  principal: z.number().nonnegative().default(0),
  currency: z.string().length(3).default("EUR"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  termMonths: z.number().int().positive().optional(),
  rateType: z.string().default("euribor_spread"),
  fixedRate: z.number().optional(),
  indexName: z.string().optional(),
  indexTenor: z.string().optional(),
  spread: z.number().optional(),
  repaymentType: z.string().default("annuity"),
  graceMonths: z.number().int().min(0).optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
});
export type AgreementInput = z.infer<typeof agreementInputSchema>;

export const scheduleRowSchema = z.object({
  line_no: z.number().int(),
  period_no: z.number().int().nullable(),
  due_date: z.string().nullable(),
  opening_balance: z.number().nullable(),
  interest: z.number().default(0),
  principal: z.number().default(0),
  vat: z.number().default(0),
  commissions: z.number().default(0),
  insurance: z.number().default(0),
  fees: z.number().default(0),
  total_payment: z.number().default(0),
  closing_balance: z.number().nullable(),
});
export type ParsedScheduleRow = z.infer<typeof scheduleRowSchema>;

export const stageImportSchema = z.object({
  agreementId: z.string().uuid(),
  source: z.enum(["manual", "csv", "xlsx"]).default("manual"),
  fileName: z.string().optional(),
  effectiveFrom: z.string().min(1),
  reason: z.string().default("origination"),
  indexRateUsed: z.number().optional(),
  rateApplied: z.number().optional(),
  notes: z.string().optional(),
  rows: z.array(scheduleRowSchema).min(1, "At least one instalment is required"),
});

export const commitImportSchema = z.object({ importId: z.string().uuid() });
export const discardImportSchema = z.object({ importId: z.string().uuid() });

export const instalmentStateSchema = z.object({
  rowId: z.string().uuid(),
  status: z.enum(["scheduled", "due", "settled", "reconciled", "skipped"]),
  settledAmount: z.number().optional(),
  settledOn: z.string().optional(),
});

/* ---------------------------------------------------------------- utilities */

const HEADER_ALIASES: Record<string, keyof ParsedScheduleRow> = {
  period: "period_no",
  "period no": "period_no",
  periodo: "period_no",
  "n": "period_no",
  no: "period_no",
  "#": "period_no",
  prestacao: "period_no",
  date: "due_date",
  "due date": "due_date",
  vencimento: "due_date",
  data: "due_date",
  "opening balance": "opening_balance",
  opening: "opening_balance",
  "capital inicial": "opening_balance",
  interest: "interest",
  juros: "interest",
  principal: "principal",
  capital: "principal",
  amortizacao: "principal",
  vat: "vat",
  iva: "vat",
  commission: "commissions",
  commissions: "commissions",
  comissao: "commissions",
  comissoes: "commissions",
  insurance: "insurance",
  seguro: "insurance",
  seguros: "insurance",
  fees: "fees",
  despesas: "fees",
  total: "total_payment",
  "total payment": "total_payment",
  prestacao_total: "total_payment",
  "closing balance": "closing_balance",
  closing: "closing_balance",
  "capital em divida": "closing_balance",
  divida: "closing_balance",
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

export function mapHeader(header: string): keyof ParsedScheduleRow | null {
  const key = normaliseHeader(header);
  return HEADER_ALIASES[key] ?? (HEADER_ALIASES[key.replace(/ /g, "_")] ?? null);
}

/** Parses "1.234,56", "1,234.56", "€ 1234.56" and plain numbers. */
export function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value).replace(/[^\d,.\-]/g, "").trim();
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Accepts ISO, dd/mm/yyyy, dd-mm-yyyy and Excel serial dates. */
export function parseDateCell(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export type ReviewRow = ParsedScheduleRow & { issues: string[]; include: boolean };

/** Turns a table of raw cells (first row = header) into reviewable instalments. */
export function buildReviewRows(table: unknown[][]): ReviewRow[] {
  if (!table.length) return [];
  const headers = (table[0] ?? []).map((h) => mapHeader(String(h ?? "")));
  const rows: ReviewRow[] = [];

  table.slice(1).forEach((cells, i) => {
    if (!cells || cells.every((c) => c === null || c === undefined || String(c).trim() === "")) return;
    const draft: Record<string, unknown> = {};
    headers.forEach((key, idx) => {
      if (key) draft[key] = cells[idx];
    });
    rows.push(
      reviewRow({
        line_no: rows.length + 1,
        period_no: draft.period_no != null ? Number(parseAmount(draft.period_no)) : rows.length + 1,
        due_date: parseDateCell(draft.due_date),
        opening_balance: parseAmount(draft.opening_balance),
        interest: parseAmount(draft.interest) ?? 0,
        principal: parseAmount(draft.principal) ?? 0,
        vat: parseAmount(draft.vat) ?? 0,
        commissions: parseAmount(draft.commissions) ?? 0,
        insurance: parseAmount(draft.insurance) ?? 0,
        fees: parseAmount(draft.fees) ?? 0,
        total_payment: parseAmount(draft.total_payment) ?? 0,
        closing_balance: parseAmount(draft.closing_balance),
      }),
    );
  });

  return rows;
}

/** Validation applied both in the review step and before committing. */
export function reviewRow(row: ParsedScheduleRow): ReviewRow {
  const issues: string[] = [];
  if (!row.due_date) issues.push("Missing due date");
  if (row.period_no === null || Number.isNaN(row.period_no)) issues.push("Missing period number");

  const components =
    (row.principal ?? 0) +
    (row.interest ?? 0) +
    (row.vat ?? 0) +
    (row.commissions ?? 0) +
    (row.insurance ?? 0) +
    (row.fees ?? 0);
  const total = row.total_payment ?? 0;
  if (total === 0 && components > 0) {
    row = { ...row, total_payment: Number(components.toFixed(2)) };
  } else if (Math.abs(components - total) > 0.05) {
    issues.push(
      `Total ${total.toFixed(2)} does not match components ${components.toFixed(2)}`,
    );
  }
  if ((row.total_payment ?? 0) < 0) issues.push("Negative total payment");

  return { ...row, issues, include: issues.length === 0 };
}

/** Stable fingerprint so the same file cannot be committed twice. */
export function scheduleFingerprint(rows: ParsedScheduleRow[]): string {
  const body = rows
    .map((r) =>
      [r.period_no, r.due_date, r.principal, r.interest, r.vat, r.commissions, r.total_payment].join(
        "|",
      ),
    )
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

/* --------------------------------------------- annuity schedule generation */

export type GenerateInput = {
  principal: number;
  annualRatePct: number;
  termMonths: number;
  firstDueDate: string;
  repaymentType?: string;
  monthlyInsurance?: number;
  monthlyCommission?: number;
  vatRatePct?: number;
  startPeriodNo?: number;
};

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(d, lastDay));
  return base.toISOString().slice(0, 10);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Deterministic projection used by the manual builder; imports bypass this. */
export function generateSchedule(input: GenerateInput): ParsedScheduleRow[] {
  const { principal, annualRatePct, termMonths, firstDueDate } = input;
  const i = annualRatePct / 100 / 12;
  const linear = input.repaymentType === "linear";
  const bullet = input.repaymentType === "bullet";
  const annuity =
    i === 0 ? principal / termMonths : (principal * i) / (1 - Math.pow(1 + i, -termMonths));

  const rows: ParsedScheduleRow[] = [];
  let balance = principal;
  for (let n = 0; n < termMonths; n++) {
    const interest = r2(balance * i);
    let principalPart: number;
    if (bullet) principalPart = n === termMonths - 1 ? balance : 0;
    else if (linear) principalPart = r2(principal / termMonths);
    else principalPart = r2(annuity - interest);
    if (n === termMonths - 1 && !bullet) principalPart = r2(balance);

    const commissions = r2(input.monthlyCommission ?? 0);
    const insurance = r2(input.monthlyInsurance ?? 0);
    const vat = r2(((commissions) * (input.vatRatePct ?? 0)) / 100);
    const opening = r2(balance);
    balance = r2(balance - principalPart);

    rows.push({
      line_no: n + 1,
      period_no: (input.startPeriodNo ?? 1) + n,
      due_date: addMonths(firstDueDate, n),
      opening_balance: opening,
      interest,
      principal: principalPart,
      vat,
      commissions,
      insurance,
      fees: 0,
      total_payment: r2(interest + principalPart + commissions + insurance + vat),
      closing_balance: balance,
    });
  }
  return rows;
}
