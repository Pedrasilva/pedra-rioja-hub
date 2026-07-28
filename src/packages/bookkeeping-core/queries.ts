import { useQuery } from "@tanstack/react-query";

import type { CounterpartyQuery, DocumentFilters } from "./adapters";
import { useBookkeepingHost } from "./host";

/**
 * Shared bookkeeping core — reusable read contract.
 *
 * Every read goes through the host data adapter, so the core never names a
 * host table or imports a host database client.
 */

export function useCounterparties(companyId: string | undefined, opts: CounterpartyQuery = {}) {
  const { data } = useBookkeepingHost();
  const { type, status = "active", search = "" } = opts;
  return useQuery({
    queryKey: ["counterparties", companyId, type ?? "all", status, search],
    enabled: Boolean(companyId),
    queryFn: () => data.listCounterparties(companyId!, { type, status, search }),
  });
}

export function useClassifications(companyId: string | undefined) {
  const { data } = useBookkeepingHost();
  return useQuery({
    queryKey: ["financial-classifications", companyId],
    enabled: Boolean(companyId),
    queryFn: () => data.listClassifications(companyId!),
  });
}

export function useFinancialDocuments(
  companyId: string | undefined,
  filters: DocumentFilters = {},
) {
  const { data } = useBookkeepingHost();
  return useQuery({
    queryKey: ["financial-documents", companyId, filters],
    enabled: Boolean(companyId),
    queryFn: () => data.listDocuments(companyId!, filters),
  });
}

export function useFinancialDocument(documentId: string | undefined) {
  const { data } = useBookkeepingHost();
  return useQuery({
    queryKey: ["financial-document", documentId],
    enabled: Boolean(documentId),
    queryFn: () => data.getDocument(documentId!),
  });
}

export function useBankClassificationRules(companyId: string | undefined) {
  const { data } = useBookkeepingHost();
  return useQuery({
    queryKey: ["bank-classification-rules", companyId],
    enabled: Boolean(companyId),
    queryFn: () => data.listBankRules(companyId!),
  });
}

/** Suggestions are advisory only — the UI never applies them automatically. */
export function useClassificationSuggestion(bankTransactionId: string | undefined) {
  const { data } = useBookkeepingHost();
  return useQuery({
    queryKey: ["bank-classification-suggestion", bankTransactionId],
    enabled: Boolean(bankTransactionId),
    queryFn: () => data.suggestClassification(bankTransactionId!),
  });
}

/** Bank transactions come from the banking adapter, never from a host table. */
export function useEligibleBankTransactions(companyId: string | undefined) {
  return useBookkeepingHost().banking.useEligibleTransactions(companyId);
}

export function useFinancialPeriods(companyId: string | undefined) {
  const { data } = useBookkeepingHost();
  return useQuery({
    queryKey: ["financial-periods", companyId],
    enabled: Boolean(companyId),
    queryFn: () => data.listPeriods(companyId!),
  });
}

export function usePeriodTotals(periodId: string | undefined) {
  const { data } = useBookkeepingHost();
  return useQuery({
    queryKey: ["financial-period-totals", periodId],
    enabled: Boolean(periodId),
    queryFn: () => data.listPeriodTotals(periodId!),
  });
}

export function usePeriodDocuments(companyId: string | undefined, periodId: string | undefined) {
  const { data } = useBookkeepingHost();
  return useQuery({
    queryKey: ["financial-period-documents", companyId, periodId],
    enabled: Boolean(companyId && periodId),
    queryFn: () => data.listPeriodDocuments(companyId!, periodId!),
  });
}
