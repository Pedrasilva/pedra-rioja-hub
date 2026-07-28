/**
 * Pedra Rioja host — server contract.
 *
 * The shared core knows only the operation names; every call lands on Pedra
 * Rioja's authenticated server functions, which keep the amounts source-owned.
 */

import { useServerFn } from "@tanstack/react-start";

import type { BookkeepingServerContract } from "@/packages/bookkeeping-core/adapters";
import {
  archiveCounterparty,
  cancelFinancialDocument,
  createClassification,
  createCounterparty,
  createFinancialDocument,
  createFinancialPeriod,
  postFinancialDocument,
  recomputePeriodTotals,
  reverseFinancialPayment,
  settleFinancialDocument,
  updateCounterparty,
  updateFinancialDocument,
  upsertBankClassificationRule,
} from "../bookkeeping.functions";

/** Builds the contract from the host's server functions. */
export function usePedraRiojaServerContract(): BookkeepingServerContract {
  const call = {
    createCounterparty: useServerFn(createCounterparty),
    updateCounterparty: useServerFn(updateCounterparty),
    archiveCounterparty: useServerFn(archiveCounterparty),
    createDocument: useServerFn(createFinancialDocument),
    updateDocument: useServerFn(updateFinancialDocument),
    postDocument: useServerFn(postFinancialDocument),
    cancelDocument: useServerFn(cancelFinancialDocument),
    settleDocument: useServerFn(settleFinancialDocument),
    reversePayment: useServerFn(reverseFinancialPayment),
    createClassification: useServerFn(createClassification),
    upsertBankRule: useServerFn(upsertBankClassificationRule),
    createPeriod: useServerFn(createFinancialPeriod),
    recomputePeriodTotals: useServerFn(recomputePeriodTotals),
  };

  const run =
    <T,>(fn: (opts: { data: never }) => Promise<T>) =>
    (input: unknown) =>
      fn({ data: input as never });

  return {
    createCounterparty: run(call.createCounterparty) as BookkeepingServerContract["createCounterparty"],
    updateCounterparty: run(call.updateCounterparty),
    archiveCounterparty: run(call.archiveCounterparty),
    createDocument: run(call.createDocument) as BookkeepingServerContract["createDocument"],
    updateDocument: run(call.updateDocument),
    postDocument: run(call.postDocument),
    cancelDocument: run(call.cancelDocument),
    settleDocument: run(call.settleDocument),
    reversePayment: run(call.reversePayment),
    createClassification: run(call.createClassification),
    upsertBankRule: run(call.upsertBankRule),
    createPeriod: run(call.createPeriod),
    recomputePeriodTotals: run(call.recomputePeriodTotals),
  };
}
