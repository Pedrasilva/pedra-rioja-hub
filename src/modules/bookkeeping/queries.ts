import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------ lookups */

export function useCounterparties(
  companyId: string | undefined,
  opts: { type?: "supplier" | "client"; status?: "active" | "archived" | "all"; search?: string } = {},
) {
  const { type, status = "active", search = "" } = opts;
  return useQuery({
    queryKey: ["counterparties", companyId, type ?? "all", status, search],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("counterparties")
        .select(
          "id, name, legal_name, trading_name, nif, counterparty_type, is_supplier, is_client, status, payment_terms_days, iban, email, phone, city, currency, default_classification_id, deleted_at",
        )
        .eq("company_id", companyId!)
        .order("name");
      if (status !== "all") q = q.eq("status", status);
      if (type === "supplier") q = q.in("counterparty_type", ["supplier", "both"]);
      if (type === "client") q = q.in("counterparty_type", ["client", "both"]);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`name.ilike.${s},legal_name.ilike.${s},nif.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type CounterpartyRow = NonNullable<ReturnType<typeof useCounterparties>["data"]>[number];

export function useClassifications(companyId: string | undefined) {
  return useQuery({
    queryKey: ["financial-classifications", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_classifications")
        .select(
          "id, company_id, code, name_en, name_pt, nature, level, parent_id, cash_flow_category, is_active, default_vat_rate, default_vat_code, vat_recoverable, property_link_allowed, project_link_allowed, sort_order",
        )
        .or(`company_id.is.null,company_id.eq.${companyId}`)
        .order("sort_order")
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type ClassificationRow = NonNullable<ReturnType<typeof useClassifications>["data"]>[number];

export function useBookkeepingProperties(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bk-properties", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, code")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBookkeepingProjects(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bk-projects", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capex_projects")
        .select("id, name, code, property_id")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* -------------------------------------------------------- documents */

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

export function useFinancialDocuments(companyId: string | undefined, filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: ["financial-documents", companyId, filters],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("financial_documents")
        .select(
          "id, direction, doc_type, series, document_number, atcud, issue_date, due_date, status, payment_state, currency, net_amount, vat_amount, gross_amount, withholding_amount, payable_amount, paid_amount, outstanding_amount, counterparty_id, counterparty_name, classification_id, property_id, project_id, period_id, notes",
        )
        .eq("company_id", companyId!)
        .order("issue_date", { ascending: false });
      if (filters.direction) q = q.eq("direction", filters.direction);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.paymentState) q = q.eq("payment_state", filters.paymentState);
      if (filters.counterpartyId) q = q.eq("counterparty_id", filters.counterpartyId);
      if (filters.classificationId) q = q.eq("classification_id", filters.classificationId);
      if (filters.propertyId) q = q.eq("property_id", filters.propertyId);
      if (filters.projectId) q = q.eq("project_id", filters.projectId);
      if (filters.periodId) q = q.eq("period_id", filters.periodId);
      if (filters.dueFrom) q = q.gte("due_date", filters.dueFrom);
      if (filters.dueTo) q = q.lte("due_date", filters.dueTo);
      if (filters.search?.trim()) {
        const s = `%${filters.search.trim()}%`;
        q = q.or(`document_number.ilike.${s},counterparty_name.ilike.${s},atcud.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type DocumentRow = NonNullable<ReturnType<typeof useFinancialDocuments>["data"]>[number];

export function useFinancialDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ["financial-document", documentId],
    enabled: Boolean(documentId),
    queryFn: async () => {
      const [doc, lines, payments] = await Promise.all([
        supabase.from("financial_documents").select("*").eq("id", documentId!).maybeSingle(),
        supabase
          .from("financial_document_lines")
          .select("*")
          .eq("document_id", documentId!)
          .order("line_no"),
        supabase
          .from("financial_payments")
          .select("*")
          .eq("document_id", documentId!)
          .order("payment_date"),
      ]);
      if (doc.error) throw doc.error;
      return { document: doc.data, lines: lines.data ?? [], payments: payments.data ?? [] };
    },
  });
}

/* ------------------------------------------------------- bank rules */

export function useBankClassificationRules(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bank-classification-rules", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_classification_rules")
        .select("*")
        .eq("company_id", companyId!)
        .order("priority");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type BankRuleRow = NonNullable<ReturnType<typeof useBankClassificationRules>["data"]>[number];

/** Suggestions are advisory only — the UI never applies them automatically. */
export function useClassificationSuggestion(bankTransactionId: string | undefined) {
  return useQuery({
    queryKey: ["bank-classification-suggestion", bankTransactionId],
    enabled: Boolean(bankTransactionId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("suggest_bank_classification", {
        _bank_transaction_id: bankTransactionId!,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRulePreviewTransactions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bk-rule-preview-transactions", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("id, transaction_date, description, counterparty_name, amount, currency")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------------------------------------------------------- periods */

export function useFinancialPeriods(companyId: string | undefined) {
  return useQuery({
    queryKey: ["financial-periods", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_periods")
        .select("*")
        .eq("company_id", companyId!)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type PeriodRow = NonNullable<ReturnType<typeof useFinancialPeriods>["data"]>[number];

export function usePeriodTotals(periodId: string | undefined) {
  return useQuery({
    queryKey: ["financial-period-totals", periodId],
    enabled: Boolean(periodId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_period_totals")
        .select("*")
        .eq("period_id", periodId!)
        .order("bucket");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Documents inside a period, used for the period detail counts. */
export function usePeriodDocuments(companyId: string | undefined, periodId: string | undefined) {
  return useQuery({
    queryKey: ["financial-period-documents", companyId, periodId],
    enabled: Boolean(companyId && periodId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_documents")
        .select("id, direction, status, gross_amount, vat_amount, paid_amount, outstanding_amount")
        .eq("company_id", companyId!)
        .eq("period_id", periodId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}
