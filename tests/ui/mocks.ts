/**
 * Pure test doubles for the bookkeeping component tests.
 *
 * This module must not import any application module. `vi.mock` factories in
 * the test files import it, and those factories run while the application
 * modules are still being imported — importing app code from here (directly or
 * through the harness) deadlocks module resolution.
 */
import { vi } from "vitest";

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
  "closeFinancialPeriod",
  "reopenFinancialPeriod",
  "attachDocumentToSource",
  "detachDocumentFromSource",
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

/* -------------------------------------------- commitment server functions */

export const COMMITMENT_FN_NAMES = [
  "createCommitmentDraft",
  "updateCommitmentDraft",
  "requestCommitmentApproval",
  "approveCommitment",
  "rejectCommitment",
  "activateCommitment",
  "archiveCommitment",
  "completeCommitment",
  "createScheduleVersion",
  "activateScheduleVersion",
  "approveScheduleVariance",
  "createDrawdown",
  "reverseDrawdown",
  "createMaintenanceJob",
  "updateMaintenanceJob",
] as const;

export type CommitmentFnName = (typeof COMMITMENT_FN_NAMES)[number];

export const commitmentFns = Object.fromEntries(
  COMMITMENT_FN_NAMES.map((name) => [
    name,
    vi.fn(async (_opts: { data: unknown }) => ({ id: `${name}-result-id` })),
  ]),
) as Record<CommitmentFnName, ReturnType<typeof vi.fn>>;

export function commitmentFnModule() {
  return commitmentFns;
}

export function lastCommitmentPayload(name: CommitmentFnName) {
  const call = commitmentFns[name].mock.calls.at(-1);
  return (call?.[0] as { data: unknown } | undefined)?.data;
}
