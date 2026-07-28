/**
 * Shared bookkeeping core — canonical row shapes.
 *
 * These are the columns the shared UI reads. They are asserted against the
 * host's generated database types by the drift tests, so a schema change that
 * removes or renames a canonical column fails the suite instead of failing at
 * runtime in one of the host applications.
 */

export const CANONICAL_TABLES = [
  "counterparties",
  "financial_classifications",
  "financial_documents",
  "financial_document_lines",
  "financial_payments",
  "financial_periods",
  "financial_period_totals",
  "bank_classification_rules",
] as const;
export type CanonicalTable = (typeof CANONICAL_TABLES)[number];

/** Canonical database operations the host server contract must expose. */
export const SERVER_OPERATIONS = [
  "createCounterparty",
  "updateCounterparty",
  "archiveCounterparty",
  "createDocument",
  "updateDocument",
  "postDocument",
  "cancelDocument",
  "settleDocument",
  "reversePayment",
  "createClassification",
  "upsertBankRule",
  "createPeriod",
  "recomputePeriodTotals",
] as const;
export type ServerOperation = (typeof SERVER_OPERATIONS)[number];

export type Counterparty = {
  id: string;
  name: string;
  legal_name: string | null;
  trading_name: string | null;
  nif: string | null;
  counterparty_type: string;
  is_supplier: boolean;
  is_client: boolean;
  status: string;
  payment_terms_days: number | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  currency: string;
  default_classification_id: string | null;
  deleted_at: string | null;
};

export type Classification = {
  id: string;
  company_id: string | null;
  code: string;
  name_en: string;
  name_pt: string | null;
  nature: string;
  level: number;
  parent_id: string | null;
  cash_flow_category: string | null;
  is_active: boolean;
  default_vat_rate: number | null;
  default_vat_code: string | null;
  vat_recoverable: boolean;
  property_link_allowed: boolean;
  project_link_allowed: boolean;
  sort_order: number;
};

export type FinancialDocument = {
  id: string;
  direction: string;
  doc_type: string;
  series: string | null;
  document_number: string | null;
  atcud: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  payment_state: string;
  currency: string;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  withholding_amount: number;
  payable_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  counterparty_id: string | null;
  counterparty_name: string | null;
  classification_id: string | null;
  property_id: string | null;
  project_id: string | null;
  period_id: string | null;
  notes: string | null;
};

export type FinancialDocumentDetail = FinancialDocument & {
  company_id: string;
  tax_period: string | null;
  withholding_rate: number | null;
  cancellation_reason: string | null;
  corrects_document_id: string | null;
};

export type FinancialDocumentLine = {
  id: string;
  document_id: string;
  line_no: number;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  vat_rate: number;
  vat_code: string | null;
  vat_recoverable: boolean;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  classification_id: string | null;
  property_id: string | null;
  project_id: string | null;
};

export type FinancialPayment = {
  id: string;
  document_id: string;
  payment_date: string;
  amount: number;
  currency: string;
  method: string | null;
  bank_transaction_id: string | null;
  status: string;
  reversal_reason: string | null;
  reversed_at: string | null;
  notes: string | null;
  created_at: string;
};

export type BankRule = {
  id: string;
  company_id: string;
  bank_account_id: string | null;
  name: string;
  priority: number;
  match_field: string;
  match_type: string;
  match_value: string;
  direction: string | null;
  min_amount: number | null;
  max_amount: number | null;
  classification_id: string | null;
  counterparty_id: string | null;
  property_id: string | null;
  project_id: string | null;
  cash_flow_category: string | null;
  is_internal_transfer: boolean;
  is_active: boolean;
  notes: string | null;
};

export type FinancialPeriod = {
  id: string;
  company_id: string;
  code: string;
  period_type: string;
  period_start: string;
  period_end: string;
  status: string;
  closed_at: string | null;
  notes: string | null;
};

export type PeriodTotal = {
  id: string;
  period_id: string;
  bucket: string;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  vat_code: string | null;
  vat_rate: number | null;
  direction: string | null;
};

export type PeriodDocumentSummary = {
  id: string;
  direction: string;
  status: string;
  gross_amount: number;
  vat_amount: number;
  paid_amount: number;
  outstanding_amount: number;
};

/** Columns the drift test requires to exist in every host database. */
export const CANONICAL_COLUMNS: Record<CanonicalTable, string[]> = {
  counterparties: [
    "id",
    "company_id",
    "name",
    "legal_name",
    "trading_name",
    "nif",
    "counterparty_type",
    "is_supplier",
    "is_client",
    "status",
    "payment_terms_days",
    "iban",
    "email",
    "phone",
    "city",
    "currency",
    "default_classification_id",
    "deleted_at",
  ],
  financial_classifications: [
    "id",
    "company_id",
    "code",
    "name_en",
    "name_pt",
    "nature",
    "level",
    "parent_id",
    "cash_flow_category",
    "is_active",
    "default_vat_rate",
    "default_vat_code",
    "vat_recoverable",
    "property_link_allowed",
    "project_link_allowed",
    "sort_order",
  ],
  financial_documents: [
    "id",
    "company_id",
    "direction",
    "doc_type",
    "series",
    "document_number",
    "atcud",
    "issue_date",
    "due_date",
    "tax_period",
    "status",
    "payment_state",
    "currency",
    "net_amount",
    "vat_amount",
    "gross_amount",
    "withholding_rate",
    "withholding_amount",
    "payable_amount",
    "paid_amount",
    "outstanding_amount",
    "counterparty_id",
    "counterparty_name",
    "classification_id",
    "property_id",
    "project_id",
    "period_id",
    "cancellation_reason",
    "corrects_document_id",
    "notes",
  ],
  financial_document_lines: [
    "id",
    "document_id",
    "line_no",
    "description",
    "quantity",
    "unit_price",
    "discount_pct",
    "vat_rate",
    "vat_code",
    "vat_recoverable",
    "net_amount",
    "vat_amount",
    "gross_amount",
    "classification_id",
    "property_id",
    "project_id",
  ],
  financial_payments: [
    "id",
    "document_id",
    "payment_date",
    "amount",
    "currency",
    "method",
    "bank_transaction_id",
    "status",
    "reversal_reason",
    "reversed_at",
    "notes",
  ],
  financial_periods: [
    "id",
    "company_id",
    "code",
    "period_type",
    "period_start",
    "period_end",
    "status",
    "closed_at",
    "notes",
  ],
  financial_period_totals: [
    "id",
    "period_id",
    "bucket",
    "net_amount",
    "vat_amount",
    "gross_amount",
    "vat_code",
    "vat_rate",
    "direction",
  ],
  bank_classification_rules: [
    "id",
    "company_id",
    "bank_account_id",
    "name",
    "priority",
    "match_field",
    "match_type",
    "match_value",
    "direction",
    "min_amount",
    "max_amount",
    "classification_id",
    "counterparty_id",
    "property_id",
    "project_id",
    "cash_flow_category",
    "is_internal_transfer",
    "is_active",
    "notes",
  ],
};
