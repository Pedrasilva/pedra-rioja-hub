/**
 * Pedra Rioja host — bookkeeping read adapter.
 *
 * The shared core never names a table or imports a database client; every read
 * it performs lands here, on Pedra Rioja's own Supabase client and RLS.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  BookkeepingDataAdapter,
  CounterpartyQuery,
  DocumentFilters,
} from "@/packages/bookkeeping-core/adapters";

const COUNTERPARTY_COLUMNS =
  "id, name, legal_name, trading_name, nif, counterparty_type, is_supplier, is_client, status, payment_terms_days, iban, email, phone, city, currency, default_classification_id, deleted_at";

const CLASSIFICATION_COLUMNS =
  "id, company_id, code, name_en, name_pt, nature, level, parent_id, cash_flow_category, is_active, default_vat_rate, default_vat_code, vat_recoverable, property_link_allowed, project_link_allowed, sort_order";

const DOCUMENT_COLUMNS =
  "id, direction, doc_type, series, document_number, atcud, issue_date, due_date, status, payment_state, currency, net_amount, vat_amount, gross_amount, withholding_amount, payable_amount, paid_amount, outstanding_amount, counterparty_id, counterparty_name, classification_id, property_id, project_id, period_id, notes";

export const pedraRiojaData: BookkeepingDataAdapter = {
  async listCounterparties(companyId: string, query: CounterpartyQuery) {
    const { type, status = "active", search = "" } = query;
    let q = supabase
      .from("counterparties")
      .select(COUNTERPARTY_COLUMNS)
      .eq("company_id", companyId)
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

  async listClassifications(companyId: string) {
    const { data, error } = await supabase
      .from("financial_classifications")
      .select(CLASSIFICATION_COLUMNS)
      .or(`company_id.is.null,company_id.eq.${companyId}`)
      .order("sort_order")
      .order("code");
    if (error) throw error;
    return data ?? [];
  },

  async listDocuments(companyId: string, filters: DocumentFilters) {
    let q = supabase
      .from("financial_documents")
      .select(DOCUMENT_COLUMNS)
      .eq("company_id", companyId)
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

  async getDocument(documentId: string) {
    const [doc, lines, payments] = await Promise.all([
      supabase.from("financial_documents").select("*").eq("id", documentId).maybeSingle(),
      supabase
        .from("financial_document_lines")
        .select("*")
        .eq("document_id", documentId)
        .order("line_no"),
      supabase
        .from("financial_payments")
        .select("*")
        .eq("document_id", documentId)
        .order("payment_date"),
    ]);
    if (doc.error) throw doc.error;
    return { document: doc.data, lines: lines.data ?? [], payments: payments.data ?? [] };
  },

  async getDocumentTotals(documentId: string) {
    const { data, error } = await supabase
      .from("financial_documents")
      .select("net_amount, vat_amount, gross_amount")
      .eq("id", documentId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async listBankRules(companyId: string) {
    const { data, error } = await supabase
      .from("bank_classification_rules")
      .select("*")
      .eq("company_id", companyId)
      .order("priority");
    if (error) throw error;
    return data ?? [];
  },

  async listPeriods(companyId: string) {
    const { data, error } = await supabase
      .from("financial_periods")
      .select("*")
      .eq("company_id", companyId)
      .order("period_start", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listPeriodTotals(periodId: string) {
    const { data, error } = await supabase
      .from("financial_period_totals")
      .select("*")
      .eq("period_id", periodId)
      .order("bucket");
    if (error) throw error;
    return data ?? [];
  },

  async listPeriodDocuments(companyId: string, periodId: string) {
    const { data, error } = await supabase
      .from("financial_documents")
      .select("id, direction, status, gross_amount, vat_amount, paid_amount, outstanding_amount")
      .eq("company_id", companyId)
      .eq("period_id", periodId);
    if (error) throw error;
    return data ?? [];
  },

  /** Advisory only — Pedra Rioja never applies a suggestion automatically. */
  async suggestClassification(bankTransactionId: string) {
    const { data, error } = await supabase.rpc("suggest_bank_classification", {
      _bank_transaction_id: bankTransactionId,
    });
    if (error) throw error;
    return (data as unknown[]) ?? [];
  },
};
