import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

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
} from "./bookkeeping.functions";

/**
 * Extractable core — every bookkeeping write goes through a server function.
 * The client never writes business amounts directly.
 */
function useBookkeepingMutation<TIn, TOut>(
  fn: (opts: { data: TIn }) => Promise<TOut>,
  keys: string[],
  successMessage: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TIn) => fn({ data }),
    onSuccess: () => {
      for (const key of keys) void qc.invalidateQueries({ queryKey: [key] });
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

const CP_KEYS = ["counterparties"];
const DOC_KEYS = [
  "financial-documents",
  "financial-document",
  "financial-period-documents",
  "cash-flow-entries",
  "cash-flow-monthly",
];

export function useCreateCounterparty() {
  return useBookkeepingMutation(useServerFn(createCounterparty), CP_KEYS, "Counterparty created");
}
export function useUpdateCounterparty() {
  return useBookkeepingMutation(useServerFn(updateCounterparty), CP_KEYS, "Counterparty updated");
}
export function useArchiveCounterparty() {
  return useBookkeepingMutation(useServerFn(archiveCounterparty), CP_KEYS, "Counterparty updated");
}

export function useCreateDocument() {
  return useBookkeepingMutation(useServerFn(createFinancialDocument), DOC_KEYS, "Draft created");
}
export function useUpdateDocument() {
  return useBookkeepingMutation(useServerFn(updateFinancialDocument), DOC_KEYS, "Draft saved");
}
export function usePostDocument() {
  return useBookkeepingMutation(useServerFn(postFinancialDocument), DOC_KEYS, "Document posted");
}
export function useCancelDocument() {
  return useBookkeepingMutation(useServerFn(cancelFinancialDocument), DOC_KEYS, "Document cancelled");
}

export function useSettleDocument() {
  return useBookkeepingMutation(useServerFn(settleFinancialDocument), DOC_KEYS, "Payment recorded");
}
export function useReversePayment() {
  return useBookkeepingMutation(useServerFn(reverseFinancialPayment), DOC_KEYS, "Payment reversed");
}

export function useCreateClassification() {
  return useBookkeepingMutation(
    useServerFn(createClassification),
    ["financial-classifications"],
    "Classification created",
  );
}

export function useUpsertBankRule() {
  return useBookkeepingMutation(
    useServerFn(upsertBankClassificationRule),
    ["bank-classification-rules", "bank-classification-suggestion"],
    "Rule saved",
  );
}

export function useCreatePeriod() {
  return useBookkeepingMutation(useServerFn(createFinancialPeriod), ["financial-periods"], "Period created");
}
export function useRecomputePeriodTotals() {
  return useBookkeepingMutation(
    useServerFn(recomputePeriodTotals),
    ["financial-period-totals", "financial-periods"],
    "Period totals recomputed",
  );
}
