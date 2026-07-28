import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCounterparties(companyId: string | undefined, type?: "supplier" | "client") {
  return useQuery({
    queryKey: ["counterparties", companyId, type ?? "all"],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("counterparties")
        .select("id, name, legal_name, nif, counterparty_type, status, payment_terms_days, iban")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("name");
      if (type === "supplier") q = q.in("counterparty_type", ["supplier", "both"]);
      if (type === "client") q = q.in("counterparty_type", ["client", "both"]);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFinancialDocuments(
  companyId: string | undefined,
  filters: { direction?: "inbound" | "outbound"; status?: string; propertyId?: string | null } = {},
) {
  return useQuery({
    queryKey: ["financial-documents", companyId, filters],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("financial_documents")
        .select(
          "id, direction, doc_type, series, document_number, atcud, issue_date, due_date, status, payment_state, currency, net_amount, vat_amount, gross_amount, withholding_amount, payable_amount, paid_amount, outstanding_amount, counterparty_id, counterparty_name, property_id, project_id",
        )
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("issue_date", { ascending: false });
      if (filters.direction) q = q.eq("direction", filters.direction);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.propertyId) q = q.eq("property_id", filters.propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

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

export function useClassifications(companyId: string | undefined) {
  return useQuery({
    queryKey: ["financial-classifications", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_classifications")
        .select("id, company_id, code, name_en, name_pt, nature, level, parent_id, cash_flow_category, is_active")
        .or(`company_id.is.null,company_id.eq.${companyId}`)
        .order("sort_order")
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBankClassificationRules(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bank-classification-rules", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_classification_rules")
        .select("*")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("priority");
      if (error) throw error;
      return data ?? [];
    },
  });
}

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
