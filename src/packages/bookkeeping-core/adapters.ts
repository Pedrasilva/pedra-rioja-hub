/**
 * Shared bookkeeping core — host adapter contracts.
 *
 * Everything the shared module cannot know about its host lives here. A host
 * application (Pedra Rioja today, PSA Hub in Phase 6e) implements these and
 * supplies them through `BookkeepingHostProvider`.
 *
 * The core must never import host tables, routes, navigation, storage rules or
 * permission internals — only these interfaces.
 */

import type { BookkeepingCapabilities } from "./capabilities";
import type {
  BankRule,
  Classification,
  Counterparty,
  FinancialDocument,
  FinancialDocumentDetail,
  FinancialDocumentLine,
  FinancialPayment,
  FinancialPeriod,
  PeriodDocumentSummary,
  PeriodTotal,
} from "./types";
import type { SourceType } from "./schemas";

/* ------------------------------------------------------------- tenant */

export type TenantAdapter = {
  /** Active tenant. `undefined` while resolving or when the host has none. */
  companyId: string | undefined;
  /** Display label for the active tenant, if the host shows one. */
  companyLabel?: string | null;
  /** True while the host is still resolving the tenant. */
  isLoading?: boolean;
  /** Optional multi-tenant switching. Absent hosts simply omit it. */
  availableTenants?: { id: string; label: string }[];
  switchTenant?: (companyId: string) => void;
};

/* --------------------------------------------------------- dimensions */

/**
 * Host-defined allocation dimension. The core never assumes "property" or
 * "project" exist — it renders whatever dimension fields the host declares.
 */
export type DimensionOption = {
  type: string;
  id: string;
  label: string;
  parentId?: string | null;
  active: boolean;
  meta?: Record<string, unknown>;
};

/**
 * A dimension field rendered on documents, lines and bank rules. `column` is
 * the canonical database column the value is written to.
 */
export type DimensionField = {
  type: string;
  label: string;
  column: "propertyId" | "projectId";
  /** Hosts may hide a field entirely; the core must keep working without it. */
  enabled: boolean;
  /** Restrict this field to a parent value of another dimension type. */
  parentType?: string | null;
};

export type DimensionAdapter = {
  fields: DimensionField[];
  useOptions: (type: string) => { options: DimensionOption[]; isLoading: boolean };
  /**
   * Host-side consistency check across selected dimensions (for Pedra Rioja:
   * a project must belong to the selected property). Returns an error message
   * or null.
   */
  validate?: (selection: Record<string, string | null>) => string | null;
};

/* ---------------------------------------------------------- documents */

export type LinkedFile = {
  id: string;
  title: string;
  kind: "primary" | "supporting" | "proof_of_payment";
  url?: string | null;
  status?: string | null;
};

export type DocumentsAdapter = {
  capabilities: { canLink: boolean; canUpload: boolean };
  useLinkedFiles: (params: {
    sourceType: SourceType;
    sourceId: string | undefined;
  }) => { files: LinkedFile[]; isLoading: boolean };
  linkExisting?: (params: {
    sourceType: SourceType;
    sourceId: string;
    kind: LinkedFile["kind"];
  }) => void | Promise<void>;
  upload?: (params: {
    sourceType: SourceType;
    sourceId: string;
    kind: LinkedFile["kind"];
  }) => void | Promise<void>;
};

/* ------------------------------------------------------------ banking */

export type BankTransactionOption = {
  id: string;
  transaction_date: string;
  description: string | null;
  counterparty_name: string | null;
  amount: number;
  currency: string;
};

export type ReconciliationLink = {
  id: string;
  bankTransactionId: string | null;
  amount: number;
  status: string;
  date: string;
};

export type BankingAdapter = {
  /** Transactions the host considers eligible for settlement / rule preview. */
  useEligibleTransactions: (companyId: string | undefined) => {
    transactions: BankTransactionOption[];
    isLoading: boolean;
  };
  /** Reconciliation lineage for a document, read-only in the shared UI. */
  useReconciliationLinks?: (documentId: string | undefined) => {
    links: ReconciliationLink[];
    isLoading: boolean;
  };
};

/* ---------------------------------------------------------- cash flow */

export type LinkedCashFlowItem = {
  id: string;
  expectedDate: string;
  amount: number;
  direction: string;
  status: string;
  category?: string | null;
};

export type CashFlowAdapter = {
  /** Read-only view of the single ledger item a posted document owns. */
  useLinkedItem: (documentId: string | undefined) => {
    item: LinkedCashFlowItem | null;
    isLoading: boolean;
  };
  /**
   * Host-approved resync. The shared UI never creates arbitrary ledger items;
   * omitting this simply hides the affordance.
   */
  resync?: (documentId: string) => void | Promise<void>;
};

/* --------------------------------------------------- fiscal configuration */

export type FiscalConfig = {
  documentTypes: { value: string; label: string }[];
  vatPresets: { code: string; rate: number; label: string }[];
  withholdingRates: number[];
  periodTypes: { value: string; label: string }[];
  requireAtcud: boolean;
  requireSeries: boolean;
  defaultCurrency: string;
};

/* ------------------------------------------------------ read contract */

export type CounterpartyQuery = {
  type?: "supplier" | "client";
  status?: "active" | "archived" | "all";
  search?: string;
};

export type DocumentFilters = {
  direction?: "inbound" | "outbound";
  status?: string;
  paymentState?: string;
  counterpartyId?: string | null;
  classificationId?: string | null;
  propertyId?: string | null;
  projectId?: string | null;
  periodId?: string | null;
  dueFrom?: string | null;
  dueTo?: string | null;
  search?: string;
};

/** Every read the shared UI performs. Hosts back this with their own client. */
export type BookkeepingDataAdapter = {
  listCounterparties: (companyId: string, query: CounterpartyQuery) => Promise<Counterparty[]>;
  listClassifications: (companyId: string) => Promise<Classification[]>;
  listDocuments: (companyId: string, filters: DocumentFilters) => Promise<FinancialDocument[]>;
  getDocument: (documentId: string) => Promise<{
    document: FinancialDocumentDetail | null;
    lines: FinancialDocumentLine[];
    payments: FinancialPayment[];
  }>;
  /** Authoritative saved totals, used to detect preview drift. */
  getDocumentTotals: (
    documentId: string,
  ) => Promise<{ net_amount: number; vat_amount: number; gross_amount: number } | null>;
  listBankRules: (companyId: string) => Promise<BankRule[]>;
  listPeriods: (companyId: string) => Promise<FinancialPeriod[]>;
  listPeriodTotals: (periodId: string) => Promise<PeriodTotal[]>;
  listPeriodDocuments: (
    companyId: string,
    periodId: string,
  ) => Promise<PeriodDocumentSummary[]>;
  /** Advisory only — suggestions are never applied automatically. */
  suggestClassification: (bankTransactionId: string) => Promise<unknown[]>;
};

/* ---------------------------------------------------- server contract */

/**
 * Every privileged operation. Hosts implement these with authenticated
 * server-side calls; no business logic or credentials live in the core.
 */
export type BookkeepingServerContract = {
  createCounterparty: (input: unknown) => Promise<{ id: string } | null>;
  updateCounterparty: (input: unknown) => Promise<unknown>;
  archiveCounterparty: (input: unknown) => Promise<unknown>;
  createDocument: (input: unknown) => Promise<{ id: string } | null>;
  updateDocument: (input: unknown) => Promise<unknown>;
  postDocument: (input: unknown) => Promise<unknown>;
  cancelDocument: (input: unknown) => Promise<unknown>;
  settleDocument: (input: unknown) => Promise<unknown>;
  reversePayment: (input: unknown) => Promise<unknown>;
  createClassification: (input: unknown) => Promise<unknown>;
  upsertBankRule: (input: unknown) => Promise<unknown>;
  createPeriod: (input: unknown) => Promise<unknown>;
  recomputePeriodTotals: (input: unknown) => Promise<unknown>;
};

/* -------------------------------------------------------------- host */

export type BookkeepingHost = {
  tenant: TenantAdapter;
  capabilities: BookkeepingCapabilities;
  dimensions: DimensionAdapter;
  documents: DocumentsAdapter;
  banking: BankingAdapter;
  cashFlow: CashFlowAdapter;
  fiscal: FiscalConfig;
  data: BookkeepingDataAdapter;
  server: BookkeepingServerContract;
};

/* ------------------------------------------------------- PT defaults */

export const PT_FISCAL_DEFAULTS: FiscalConfig = {
  documentTypes: [
    { value: "invoice", label: "Invoice" },
    { value: "credit_note", label: "Credit note" },
    { value: "debit_note", label: "Debit note" },
    { value: "receipt", label: "Receipt" },
    { value: "bill", label: "Bill" },
    { value: "simplified_invoice", label: "Simplified invoice" },
    { value: "other", label: "Other" },
  ],
  vatPresets: [
    { code: "NOR", rate: 23, label: "Normal 23%" },
    { code: "INT", rate: 13, label: "Intermédia 13%" },
    { code: "RED", rate: 6, label: "Reduzida 6%" },
    { code: "ISE", rate: 0, label: "Isenta 0%" },
  ],
  withholdingRates: [0, 11.5, 16.5, 25],
  periodTypes: [
    { value: "month", label: "Monthly" },
    { value: "quarter", label: "Quarterly" },
    { value: "year", label: "Annual" },
  ],
  requireAtcud: false,
  requireSeries: false,
  defaultCurrency: "EUR",
};

/** Hosts may narrow (subset) or extend the Portuguese defaults. */
export function fiscalConfig(overrides: Partial<FiscalConfig> = {}): FiscalConfig {
  return { ...PT_FISCAL_DEFAULTS, ...overrides };
}

/** Empty adapters — used for fail-closed defaults and in tests. */
export const NO_DIMENSIONS: DimensionAdapter = {
  fields: [],
  useOptions: () => ({ options: [], isLoading: false }),
};

export const NO_DOCUMENTS: DocumentsAdapter = {
  capabilities: { canLink: false, canUpload: false },
  useLinkedFiles: () => ({ files: [], isLoading: false }),
};

export const NO_BANKING: BankingAdapter = {
  useEligibleTransactions: () => ({ transactions: [], isLoading: false }),
};

export const NO_CASH_FLOW: CashFlowAdapter = {
  useLinkedItem: () => ({ item: null, isLoading: false }),
};
