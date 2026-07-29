import { z } from "zod";

/* ----------------------------------------------------------- vocabularies */

export const COUNTERPARTY_TYPES = [
  { value: "supplier", label: "Supplier" },
  { value: "client", label: "Client" },
  { value: "both", label: "Supplier & client" },
] as const;

export const DOCUMENT_DIRECTIONS = [
  { value: "inbound", label: "Purchase (received)" },
  { value: "outbound", label: "Sale (issued)" },
] as const;

export const DOCUMENT_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "credit_note", label: "Credit note" },
  { value: "debit_note", label: "Debit note" },
  { value: "receipt", label: "Receipt" },
  { value: "bill", label: "Bill" },
  { value: "simplified_invoice", label: "Simplified invoice" },
  { value: "other", label: "Other" },
] as const;

export const DOCUMENT_STATUSES = ["draft", "posted", "cancelled"] as const;
export const PAYMENT_STATES = ["unpaid", "partially_paid", "paid", "overpaid"] as const;

/** PT VAT presets — data, never hardcoded logic. */
export const PT_VAT_PRESETS = [
  { code: "NOR", rate: 23, label: "Normal 23%" },
  { code: "INT", rate: 13, label: "Intermédia 13%" },
  { code: "RED", rate: 6, label: "Reduzida 6%" },
  { code: "ISE", rate: 0, label: "Isenta 0%" },
] as const;

/**
 * Canonical link contract: every bookkeeping row that points at another module
 * uses a stable `source_type` + `source_id` pair. Frozen for Phase 6c.
 */
export const SOURCE_TYPES = [
  "bank_transaction",
  "bank_reconciliation_match",
  "cash_flow_entry",
  "financing_schedule_row",
  "rent_schedule",
  "capex_project_cost",
  "property_acquisition_cost",
  "financial_document",
  "financial_payment",
  "commitment",
  "maintenance_job",
  "external_import",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const sourceLinkSchema = z.object({
  sourceType: z.enum(SOURCE_TYPES).nullish(),
  sourceId: z.string().uuid().nullish(),
});

/* --------------------------------------------------------------- helpers */

const money = z.coerce.number().finite();
const uuid = z.string().uuid();
const optionalUuid = uuid.nullish();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Mirrors the database line math exactly, so client previews never drift. */
export function computeLine(input: {
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  vatRate: number;
}) {
  const net = round2(input.quantity * input.unitPrice * (1 - (input.discountPct ?? 0) / 100));
  const vat = round2((net * input.vatRate) / 100);
  return { net, vat, gross: round2(net + vat) };
}

export function computeDocumentTotals(
  lines: { quantity: number; unitPrice: number; discountPct?: number; vatRate: number }[],
  withholdingRate = 0,
) {
  const net = round2(lines.reduce((s, l) => s + computeLine(l).net, 0));
  const vat = round2(lines.reduce((s, l) => s + computeLine(l).vat, 0));
  const withholding = round2((net * withholdingRate) / 100);
  return { net, vat, gross: round2(net + vat), withholding, payable: round2(net + vat - withholding) };
}

/** PT NIF checksum. */
export function isValidNif(nif: string): boolean {
  const v = nif.replace(/\s/g, "");
  if (!/^\d{9}$/.test(v)) return false;
  const sum = v
    .slice(0, 8)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (9 - i), 0);
  const check = 11 - (sum % 11);
  return (check >= 10 ? 0 : check) === Number(v[8]);
}

/* --------------------------------------------------------------- schemas */

export const counterpartySchema = z.object({
  companyId: uuid,
  code: z.string().trim().max(32).nullish(),
  name: z.string().trim().min(1, "Name is required"),
  legalName: z.string().trim().nullish(),
  tradingName: z.string().trim().nullish(),
  counterpartyType: z.enum(["supplier", "client", "both"]).default("supplier"),
  nif: z
    .string()
    .trim()
    .nullish()
    .refine((v) => !v || v.length <= 20, "Tax number is too long"),
  countryCode: z.string().length(2).default("PT"),
  addressLine1: z.string().trim().nullish(),
  addressLine2: z.string().trim().nullish(),
  postalCode: z.string().trim().nullish(),
  city: z.string().trim().nullish(),
  email: z.string().trim().email().nullish().or(z.literal("")),
  phone: z.string().trim().nullish(),
  contactName: z.string().trim().nullish(),
  website: z.string().trim().nullish(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).nullish(),
  paymentMethod: z.string().trim().nullish(),
  iban: z.string().trim().nullish(),
  bic: z.string().trim().nullish(),
  defaultClassificationId: optionalUuid,
  currency: z.string().length(3).default("EUR"),
  notes: z.string().trim().nullish(),
});
export type CounterpartyInput = z.infer<typeof counterpartySchema>;

export const updateCounterpartySchema = counterpartySchema.partial().extend({ id: uuid });

export const documentLineSchema = z.object({
  lineNo: z.coerce.number().int().min(1),
  description: z.string().trim().nullish(),
  quantity: z.coerce.number().default(1),
  unitPrice: money.default(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  vatCode: z.string().trim().nullish(),
  vatRecoverable: z.boolean().default(true),
  classificationId: optionalUuid,
  propertyId: optionalUuid,
  unitId: optionalUuid,
  projectId: optionalUuid,
  notes: z.string().trim().nullish(),
});
export type DocumentLineInput = z.infer<typeof documentLineSchema>;

export const financialDocumentSchema = z
  .object({
    companyId: uuid,
    counterpartyId: optionalUuid,
    direction: z.enum(["inbound", "outbound"]),
    docType: z.enum(["invoice", "credit_note", "debit_note", "receipt", "bill", "simplified_invoice", "other"]).default("invoice"),
    series: z.string().trim().nullish(),
    documentNumber: z.string().trim().nullish(),
    atcud: z.string().trim().nullish(),
    issueDate: isoDate,
    dueDate: isoDate.nullish(),
    taxPeriod: z.string().trim().nullish(),
    periodId: optionalUuid,
    currency: z.string().length(3).default("EUR"),
    withholdingRate: z.coerce.number().min(0).max(100).nullish(),
    classificationId: optionalUuid,
    propertyId: optionalUuid,
    unitId: optionalUuid,
    projectId: optionalUuid,
    bankAccountId: optionalUuid,
    documentId: optionalUuid,
    correctsDocumentId: optionalUuid,
    notes: z.string().trim().nullish(),
    lines: z.array(documentLineSchema).default([]),
  })
  .merge(sourceLinkSchema);
export type FinancialDocumentInput = z.infer<typeof financialDocumentSchema>;

export const updateFinancialDocumentSchema = financialDocumentSchema
  .partial()
  .extend({ id: uuid });

export const postDocumentSchema = z.object({ id: uuid });
export const cancelDocumentSchema = z.object({
  id: uuid,
  reason: z.string().trim().min(3, "A cancellation reason is required"),
});
export const archiveCounterpartySchema = z.object({ id: uuid, archived: z.boolean().default(true) });

export const settlementSchema = z.object({
  documentId: uuid,
  amount: money.refine((n) => n !== 0, "Amount cannot be zero"),
  paymentDate: isoDate,
  bankTransactionId: optionalUuid,
  method: z.string().trim().nullish(),
  notes: z.string().trim().nullish(),
});

export const reversePaymentSchema = z.object({
  paymentId: uuid,
  reason: z.string().trim().min(3, "A reversal reason is required"),
});

export const classificationSchema = z.object({
  companyId: uuid,
  parentId: optionalUuid,
  level: z.coerce.number().int().min(1).max(5).default(1),
  code: z.string().trim().min(1),
  namePt: z.string().trim().nullish(),
  nameEn: z.string().trim().min(1),
  nature: z.enum(["income", "expense", "asset", "liability", "equity", "transfer"]).default("expense"),
  defaultVatRate: z.coerce.number().min(0).max(100).nullish(),
  defaultVatCode: z.string().trim().nullish(),
  vatRecoverable: z.boolean().default(true),
  affectsCashFlow: z.boolean().default(true),
  affectsProfit: z.boolean().default(true),
  counterpartyRequired: z.boolean().default(false),
  cashFlowCategory: z.string().trim().nullish(),
  sortOrder: z.coerce.number().int().default(100),
});

export const bankClassificationRuleSchema = z.object({
  companyId: uuid,
  bankAccountId: optionalUuid,
  name: z.string().trim().min(1),
  priority: z.coerce.number().int().min(1).max(9999).default(100),
  matchField: z
    .enum(["description", "counterparty_name", "counterparty_account", "bank_reference"])
    .default("description"),
  matchType: z.enum(["contains", "equals", "starts_with", "regex"]).default("contains"),
  matchValue: z.string().trim().min(1),
  direction: z.enum(["inflow", "outflow"]).nullish(),
  minAmount: money.nullish(),
  maxAmount: money.nullish(),
  classificationId: optionalUuid,
  counterpartyId: optionalUuid,
  propertyId: optionalUuid,
  projectId: optionalUuid,
  cashFlowCategory: z.string().trim().nullish(),
  isInternalTransfer: z.boolean().default(false),
  notes: z.string().trim().nullish(),
});

export const periodSchema = z.object({
  companyId: uuid,
  code: z.string().trim().min(1),
  periodType: z.enum(["month", "quarter", "year"]).default("quarter"),
  periodStart: isoDate,
  periodEnd: isoDate,
  notes: z.string().trim().nullish(),
});

/* ------------------------------------------------- period close / reopen */

export const closePeriodSchema = z.object({
  periodId: uuid,
  notes: z.string().trim().nullish(),
});

export const reopenPeriodSchema = z.object({
  periodId: uuid,
  reason: z.string().trim().min(3),
});

/* ------------------------------------------------------------ evidence */

export const attachDocumentSchema = z.object({
  companyId: uuid,
  sourceType: z.string().trim().min(1),
  sourceId: uuid,
  documentId: uuid,
  relation: z.enum(["primary", "supporting", "proof_of_payment"]).default("supporting"),
});

export const detachDocumentSchema = z.object({
  companyId: uuid,
  sourceType: z.string().trim().min(1),
  sourceId: uuid,
  documentId: uuid,
});
