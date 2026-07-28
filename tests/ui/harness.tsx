/**
 * Shared harness for the bookkeeping component tests.
 *
 * Every backend boundary is mocked here, which is exactly the boundary the
 * Phase 6d extraction must keep: the module only ever reaches the outside
 * world through (a) the Supabase read client and (b) the bookkeeping server
 * functions. If a component ever reached anywhere else, these tests would
 * fail to render.
 */
import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { vi } from "vitest";

import {
  createBankingAdapter,
  createCashFlowAdapter,
  createDimensionAdapter,
  createDocumentsAdapter,
} from "@/modules/bookkeeping/host/adapters";
import { pedraRiojaData } from "@/modules/bookkeeping/host/data";
import { capabilitiesFor } from "@/modules/bookkeeping/host/roles";
import { usePedraRiojaServerContract } from "@/modules/bookkeeping/host/server";
import { fiscalConfig, type BookkeepingHost } from "@/packages/bookkeeping-core/adapters";
import { BookkeepingHostProvider } from "@/packages/bookkeeping-core/host";

/* ------------------------------------------------------------- data store */

export type Row = Record<string, unknown>;

export const db: Record<string, Row[]> = {};
export const rpcResults: Record<string, unknown> = {};

export function seed(tables: Record<string, Row[]>) {
  for (const key of Object.keys(db)) delete db[key];
  for (const key of Object.keys(rpcResults)) delete rpcResults[key];
  Object.assign(db, tables);
}

/** Every filter every component applied, used to assert company scoping. */
export type RecordedCall = { table: string; ops: [string, ...unknown[]][] };
export const calls: RecordedCall[] = [];
export function resetCalls() {
  calls.length = 0;
}
export function callsFor(table: string) {
  return calls.filter((c) => c.table === table);
}
export function opsFor(table: string) {
  return callsFor(table).flatMap((c) => c.ops);
}

/* --------------------------------------------------------- supabase mock */

function builder(table: string) {
  const entry: RecordedCall = { table, ops: [] };
  calls.push(entry);
  let rows = [...(db[table] ?? [])];

  const api: Record<string, unknown> = {};
  const record = (op: string, ...args: unknown[]) => {
    entry.ops.push([op, ...args]);
    return api;
  };

  api.select = (...a: unknown[]) => record("select", ...a);
  api.order = (...a: unknown[]) => {
    const column = a[0] as string;
    const ascending = ((a[1] as { ascending?: boolean } | undefined)?.ascending ?? true) ? 1 : -1;
    rows = [...rows].sort((x, y) => {
      const l = x[column] as string | number;
      const r = y[column] as string | number;
      if (l === r) return 0;
      return (l > r ? 1 : -1) * ascending;
    });
    return record("order", ...a);
  };
  api.limit = (...a: unknown[]) => record("limit", ...a);
  api.or = (...a: unknown[]) => record("or", ...a);
  api.gte = (...a: unknown[]) => record("gte", ...a);
  api.lte = (...a: unknown[]) => record("lte", ...a);
  api.eq = (c: string, v: unknown) => {
    rows = rows.filter((r) => r[c] === v);
    return record("eq", c, v);
  };
  api.in = (c: string, v: unknown[]) => {
    rows = rows.filter((r) => v.includes(r[c] as never));
    return record("in", c, v);
  };
  api.is = (c: string, v: unknown) => {
    rows = rows.filter((r) => (r[c] ?? null) === v);
    return record("is", c, v);
  };
  api.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
  api.single = async () => ({ data: rows[0] ?? null, error: null });
  api.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(resolve, reject);

  return api;
}

export const supabaseProxy = {
  from: (table: string) => builder(table),
  rpc: async (name: string, args?: unknown) => {
    calls.push({ table: `rpc:${name}`, ops: [["rpc", args]] });
    return { data: rpcResults[name] ?? [], error: null };
  },
};

/* --------------------------------------------------- server function mock */

export const SERVER_FN_NAMES = [
  "createCounterparty",
  "updateCounterparty",
  "archiveCounterparty",
  "createClassification",
  "createFinancialDocument",
  "updateFinancialDocument",
  "postFinancialDocument",
  "cancelFinancialDocument",
  "settleFinancialDocument",
  "reverseFinancialPayment",
  "upsertBankClassificationRule",
  "recomputePeriodTotals",
  "createFinancialPeriod",
] as const;

export type ServerFnName = (typeof SERVER_FN_NAMES)[number];

export const serverFns = Object.fromEntries(
  SERVER_FN_NAMES.map((name) => [
    name,
    vi.fn(async (_opts: { data: unknown }) => ({ id: `${name}-result-id` })),
  ]),
) as Record<ServerFnName, ReturnType<typeof vi.fn>>;

export function serverFnModule() {
  return serverFns;
}

export function lastPayload(name: ServerFnName) {
  const call = serverFns[name].mock.calls.at(-1);
  return (call?.[0] as { data: unknown } | undefined)?.data;
}

/* --------------------------------------------------------------- toasts */

export const toasts: { kind: "success" | "error"; message: string }[] = [];
export const toastMock = {
  success: (m: string) => toasts.push({ kind: "success", message: m }),
  error: (m: string) => toasts.push({ kind: "error", message: m }),
};

/* -------------------------------------------------------------- renderer */

/**
 * The tests render the shared core through the real Pedra Rioja host, so the
 * adapter boundary itself is exercised on every component test.
 */
function TestHost({ children }: { children: ReactElement | ReactElement[] }) {
  const server = usePedraRiojaServerContract();
  const host: BookkeepingHost = {
    tenant: { companyId: COMPANY, companyLabel: "Pedra Rioja", isLoading: false },
    capabilities: capabilitiesFor(["owner"]),
    dimensions: createDimensionAdapter(COMPANY),
    documents: createDocumentsAdapter(COMPANY, true),
    banking: createBankingAdapter(COMPANY),
    cashFlow: createCashFlowAdapter(COMPANY),
    fiscal: fiscalConfig(),
    data: pedraRiojaData,
    server,
  };
  return <BookkeepingHostProvider host={host}>{children}</BookkeepingHostProvider>;
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  const result = render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <TestHost>{children as ReactElement}</TestHost>
      </QueryClientProvider>
    ),
    ...options,
  });
  return { ...result, queryClient };
}

/* ------------------------------------------------------------- fixtures */

export const COMPANY = "11111111-1111-4111-8111-111111111111";
export const OTHER_COMPANY = "22222222-2222-4222-8222-222222222222";

export const CLASSIFICATIONS: Row[] = [
  {
    id: "c1",
    company_id: null,
    code: "6",
    name_en: "Operating costs",
    name_pt: "Custos operacionais",
    nature: "expense",
    level: 1,
    parent_id: null,
    cash_flow_category: "operating",
    is_active: true,
    default_vat_rate: 23,
    default_vat_code: "NOR",
    vat_recoverable: true,
    property_link_allowed: true,
    project_link_allowed: true,
    sort_order: 10,
  },
  {
    id: "c2",
    company_id: null,
    code: "6.1",
    name_en: "Maintenance",
    name_pt: "Manutenção",
    nature: "expense",
    level: 2,
    parent_id: "c1",
    cash_flow_category: "operating",
    is_active: true,
    default_vat_rate: 23,
    default_vat_code: "NOR",
    vat_recoverable: true,
    property_link_allowed: true,
    project_link_allowed: true,
    sort_order: 20,
  },
  {
    id: "c3",
    company_id: COMPANY,
    code: "6.1.1",
    name_en: "Lift servicing",
    name_pt: null,
    nature: "expense",
    level: 3,
    parent_id: "c2",
    cash_flow_category: "operating",
    is_active: true,
    default_vat_rate: 23,
    default_vat_code: "NOR",
    vat_recoverable: true,
    property_link_allowed: true,
    project_link_allowed: true,
    sort_order: 30,
  },
];

export const COUNTERPARTIES: Row[] = [
  {
    id: "cp-supplier",
    company_id: COMPANY,
    name: "Rioja Manutenção Lda",
    legal_name: "Rioja Manutenção Unipessoal Lda",
    trading_name: null,
    nif: "501442600",
    counterparty_type: "supplier",
    is_supplier: true,
    is_client: false,
    status: "active",
    payment_terms_days: 30,
    iban: "PT50000201231234567890154",
    email: "faturas@rioja.test",
    phone: null,
    city: "Porto",
    currency: "EUR",
    default_classification_id: "c2",
    deleted_at: null,
  },
  {
    id: "cp-client",
    company_id: COMPANY,
    name: "Inquilino Norte SA",
    legal_name: null,
    trading_name: null,
    nif: null,
    counterparty_type: "client",
    is_supplier: false,
    is_client: true,
    status: "active",
    payment_terms_days: 15,
    iban: null,
    email: null,
    phone: null,
    city: "Braga",
    currency: "EUR",
    default_classification_id: null,
    deleted_at: null,
  },
  {
    id: "cp-both",
    company_id: COMPANY,
    name: "Duarte & Filhos",
    legal_name: null,
    trading_name: null,
    nif: null,
    counterparty_type: "both",
    is_supplier: true,
    is_client: true,
    status: "active",
    payment_terms_days: null,
    iban: null,
    email: null,
    phone: null,
    city: null,
    currency: "EUR",
    default_classification_id: null,
    deleted_at: null,
  },
  {
    id: "cp-archived",
    company_id: COMPANY,
    name: "Fornecedor Antigo",
    legal_name: null,
    trading_name: null,
    nif: null,
    counterparty_type: "supplier",
    is_supplier: true,
    is_client: false,
    status: "archived",
    payment_terms_days: null,
    iban: null,
    email: null,
    phone: null,
    city: null,
    currency: "EUR",
    default_classification_id: null,
    deleted_at: null,
  },
  {
    id: "cp-other-company",
    company_id: OTHER_COMPANY,
    name: "Outra Empresa Lda",
    legal_name: null,
    trading_name: null,
    nif: null,
    counterparty_type: "supplier",
    is_supplier: true,
    is_client: false,
    status: "active",
    payment_terms_days: null,
    iban: null,
    email: null,
    phone: null,
    city: null,
    currency: "EUR",
    default_classification_id: null,
    deleted_at: null,
  },
];

export function documentRow(overrides: Row = {}): Row {
  return {
    id: "doc-draft",
    company_id: COMPANY,
    direction: "inbound",
    doc_type: "invoice",
    series: "A",
    document_number: "2026/1",
    atcud: "JFT7C4KZ-1",
    issue_date: "2026-02-01",
    due_date: "2026-03-03",
    status: "draft",
    payment_state: "unpaid",
    currency: "EUR",
    net_amount: 1000,
    vat_amount: 230,
    gross_amount: 1230,
    withholding_amount: 0,
    payable_amount: 1230,
    paid_amount: 0,
    outstanding_amount: 1230,
    counterparty_id: "cp-supplier",
    counterparty_name: "Rioja Manutenção Lda",
    classification_id: "c2",
    property_id: null,
    project_id: null,
    period_id: "p1",
    tax_period: "2026-Q1",
    withholding_rate: 0,
    notes: null,
    ...overrides,
  };
}

export const PERIODS: Row[] = [
  {
    id: "p1",
    company_id: COMPANY,
    code: "2026-Q1",
    period_type: "quarter",
    period_start: "2026-01-01",
    period_end: "2026-03-31",
    status: "open",
  },
  {
    id: "p2",
    company_id: COMPANY,
    code: "2025-Q4",
    period_type: "quarter",
    period_start: "2025-10-01",
    period_end: "2025-12-31",
    status: "closed",
  },
];

export const BANK_TRANSACTIONS: Row[] = [
  {
    id: "tx-1",
    company_id: COMPANY,
    transaction_date: "2026-02-10",
    description: "TRF EDP ENERGIA FEV",
    counterparty_name: "EDP",
    amount: -120.5,
    currency: "EUR",
    deleted_at: null,
  },
  {
    id: "tx-2",
    company_id: COMPANY,
    transaction_date: "2026-02-12",
    description: "RENDA FEVEREIRO",
    counterparty_name: "Inquilino Norte SA",
    amount: 950,
    currency: "EUR",
    deleted_at: null,
  },
  {
    id: "tx-other",
    company_id: OTHER_COMPANY,
    transaction_date: "2026-02-12",
    description: "TRF EDP OUTRA EMPRESA",
    counterparty_name: "EDP",
    amount: -80,
    currency: "EUR",
    deleted_at: null,
  },
];
