import { z } from "zod";

/* ----------------------------------------------------------- vocabularies */

export const CASH_FLOW_STATES = [
  { value: "actual", label: "Actual", hint: "Bank movement that has occurred" },
  { value: "reconciled", label: "Reconciled", hint: "Actual movement matched to an expected record" },
  { value: "committed", label: "Committed", hint: "Contractually or formally committed" },
  { value: "forecast", label: "Forecast", hint: "Estimate, not yet committed" },
] as const;

export const MANUAL_STATES = [
  { value: "committed", label: "Committed" },
  { value: "forecast", label: "Forecast" },
] as const;

export const CASH_FLOW_DIRECTIONS = [
  { value: "inflow", label: "Inflow" },
  { value: "outflow", label: "Outflow" },
] as const;

export const CASH_FLOW_CATEGORIES = [
  { value: "financing", label: "Financing" },
  { value: "rent", label: "Rent & property income" },
  { value: "service_charge", label: "Service charges" },
  { value: "tax", label: "Taxes" },
  { value: "maintenance", label: "Maintenance" },
  { value: "capex", label: "Projects & works" },
  { value: "professional_fees", label: "Professional fees" },
  { value: "insurance", label: "Insurance" },
  { value: "utilities", label: "Utilities" },
  { value: "acquisition", label: "Acquisition" },
  { value: "disposal", label: "Disposal" },
  { value: "other", label: "Other" },
] as const;

export const CONFIDENCE_LEVELS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export const RECURRENCE_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Half-yearly" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom (every N months)" },
] as const;

export const COUNTERPARTY_TYPES = [
  { value: "supplier", label: "Supplier" },
  { value: "client", label: "Client" },
  { value: "tenant", label: "Tenant" },
  { value: "lender", label: "Lender" },
  { value: "authority", label: "Authority" },
  { value: "other", label: "Other" },
] as const;

export const HORIZONS = [12, 24, 36, 60] as const;

export const RECONCILIATION_STATES = [
  { value: "unmatched", label: "Unmatched" },
  { value: "matched", label: "Matched" },
  { value: "reconciled", label: "Reconciled" },
  { value: "ignored", label: "Ignored" },
] as const;

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

/* ---------------------------------------------------------------- schemas */

const money = z.number().finite();

export const manualEntrySchema = z.object({
  companyId: z.string().uuid(),
  propertyId: z.string().uuid().nullable().optional(),
  unitId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  agreementId: z.string().uuid().nullable().optional(),
  tenancyId: z.string().uuid().nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  documentId: z.string().uuid().nullable().optional(),
  category: z.string().min(1).default("other"),
  direction: z.enum(["inflow", "outflow"]).default("outflow"),
  state: z.enum(["committed", "forecast"]).default("forecast"),
  counterpartyType: z.string().optional(),
  counterpartyName: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  currency: z.string().length(3).default("EUR"),
  amountNet: money.default(0),
  vat: money.default(0),
  expectedDate: z.string().min(1, "Expected date is required"),
  confidence: z.enum(["confirmed", "high", "medium", "low"]).default("medium"),
  scenarioCode: z.string().nullable().optional(),
  notes: z.string().optional(),
});
export type ManualEntryInput = z.infer<typeof manualEntrySchema>;

export const updateEntrySchema = manualEntrySchema
  .partial()
  .extend({ entryId: z.string().uuid() });

export const entryInclusionSchema = z.object({
  entryId: z.string().uuid(),
  isIncluded: z.boolean(),
});

export const recordActualSchema = z.object({
  entryId: z.string().uuid(),
  actualDate: z.string().min(1),
  state: z.enum(["actual", "reconciled"]).default("actual"),
  bankAccountId: z.string().uuid().nullable().optional(),
});

export const archiveEntrySchema = z.object({ entryId: z.string().uuid() });

export const ruleSchema = z.object({
  companyId: z.string().uuid(),
  propertyId: z.string().uuid().nullable().optional(),
  unitId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  agreementId: z.string().uuid().nullable().optional(),
  tenancyId: z.string().uuid().nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1).default("other"),
  direction: z.enum(["inflow", "outflow"]).default("outflow"),
  state: z.enum(["committed", "forecast"]).default("committed"),
  counterpartyType: z.string().optional(),
  counterpartyName: z.string().optional(),
  currency: z.string().length(3).default("EUR"),
  amountNet: money.default(0),
  vat: money.default(0),
  frequency: z
    .enum(["weekly", "monthly", "quarterly", "semiannual", "annual", "custom"])
    .default("monthly"),
  intervalCount: z.number().int().min(1).max(120).default(1),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  maxOccurrences: z.number().int().positive().optional(),
  confidence: z.enum(["confirmed", "high", "medium", "low"]).default("high"),
  scenarioCode: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});
export type RuleInput = z.infer<typeof ruleSchema>;

export const updateRuleSchema = ruleSchema.partial().extend({ ruleId: z.string().uuid() });

export const generateSchema = z.object({
  companyId: z.string().uuid(),
  ruleId: z.string().uuid().optional(),
  through: z.string().min(1),
});

export const bankAccountSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  currency: z.string().length(3).default("EUR"),
  accountType: z.string().default("current"),
  openingBalance: money.default(0),
  openingBalanceDate: z.string().min(1),
  notes: z.string().optional(),
});

/* ----------------------------------------------------------------- helpers */

/** The dates a rule produces up to `through`. Mirrors the database routine. */
export function ruleOccurrences(
  rule: {
    frequency: string;
    interval_count: number;
    start_date: string;
    end_date?: string | null;
    max_occurrences?: number | null;
  },
  through: string,
): string[] {
  const out: string[] = [];
  const limit = new Date(
    rule.end_date && rule.end_date < through ? rule.end_date : through,
  );
  const start = new Date(rule.start_date);
  const n = rule.interval_count || 1;
  let i = 0;
  for (;;) {
    const d = new Date(start);
    switch (rule.frequency) {
      case "weekly":
        d.setDate(d.getDate() + 7 * n * i);
        break;
      case "quarterly":
        d.setMonth(d.getMonth() + 3 * n * i);
        break;
      case "semiannual":
        d.setMonth(d.getMonth() + 6 * n * i);
        break;
      case "annual":
        d.setFullYear(d.getFullYear() + n * i);
        break;
      default:
        d.setMonth(d.getMonth() + n * i);
    }
    if (d > limit) break;
    if (rule.max_occurrences && i >= rule.max_occurrences) break;
    out.push(d.toISOString().slice(0, 10));
    i += 1;
    if (i > 2000) break;
  }
  return out;
}

/** First day of the month, ISO. */
export function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).toISOString().slice(0, 10);
}

export function addMonthsIso(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
