import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { BookkeepingServerContract } from "./adapters";
import { useBookkeepingHost } from "./host";

/**
 * Shared bookkeeping core — reusable write contract.
 *
 * Every write is delegated to the host server contract, which must perform it
 * server-side and authenticated. The client never writes business amounts.
 */

function useContractMutation<TOut>(
  op: keyof BookkeepingServerContract,
  keys: string[],
  successMessage: string,
) {
  const { server } = useBookkeepingHost();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => server[op](data) as Promise<TOut>,
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
  return useContractMutation<{ id: string } | null>(
    "createCounterparty",
    CP_KEYS,
    "Counterparty created",
  );
}
export function useUpdateCounterparty() {
  return useContractMutation("updateCounterparty", CP_KEYS, "Counterparty updated");
}
export function useArchiveCounterparty() {
  return useContractMutation("archiveCounterparty", CP_KEYS, "Counterparty updated");
}

export function useCreateDocument() {
  return useContractMutation<{ id: string } | null>("createDocument", DOC_KEYS, "Draft created");
}
export function useUpdateDocument() {
  return useContractMutation("updateDocument", DOC_KEYS, "Draft saved");
}
export function usePostDocument() {
  return useContractMutation("postDocument", DOC_KEYS, "Document posted");
}
export function useCancelDocument() {
  return useContractMutation("cancelDocument", DOC_KEYS, "Document cancelled");
}

export function useSettleDocument() {
  return useContractMutation("settleDocument", DOC_KEYS, "Payment recorded");
}
export function useReversePayment() {
  return useContractMutation("reversePayment", DOC_KEYS, "Payment reversed");
}

export function useCreateClassification() {
  return useContractMutation(
    "createClassification",
    ["financial-classifications"],
    "Classification created",
  );
}

export function useUpsertBankRule() {
  return useContractMutation(
    "upsertBankRule",
    ["bank-classification-rules", "bank-classification-suggestion"],
    "Rule saved",
  );
}

export function useCreatePeriod() {
  return useContractMutation("createPeriod", ["financial-periods"], "Period created");
}
export function useRecomputePeriodTotals() {
  return useContractMutation(
    "recomputePeriodTotals",
    ["financial-period-totals", "financial-periods"],
    "Period totals recomputed",
  );
}
