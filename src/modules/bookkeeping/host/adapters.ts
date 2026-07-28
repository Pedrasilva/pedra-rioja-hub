/**
 * Pedra Rioja host — dimension, documents, banking and cash-flow adapters.
 *
 * These are the only places where the bookkeeping UI touches Pedra Rioja's
 * real-estate domain (properties, capex projects, Drive documents, bank
 * transactions, cash-flow ledger). PSA Hub will supply its own equivalents.
 */

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  BankingAdapter,
  CashFlowAdapter,
  DimensionAdapter,
  DimensionField,
  DimensionOption,
  DocumentsAdapter,
} from "@/packages/bookkeeping-core/adapters";

/* --------------------------------------------------------- dimensions */

export const PEDRA_RIOJA_DIMENSION_FIELDS: DimensionField[] = [
  { type: "property", label: "Property", column: "propertyId", enabled: true },
  {
    type: "project",
    label: "Project",
    column: "projectId",
    enabled: true,
    parentType: "property",
  },
];

function useDimensionOptions(companyId: string | undefined, type: string) {
  const query = useQuery({
    queryKey: ["bk-dimension-options", type, companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<DimensionOption[]> => {
      if (type === "property") {
        const { data, error } = await supabase
          .from("properties")
          .select("id, name, code")
          .eq("company_id", companyId!)
          .is("deleted_at", null)
          .order("name");
        if (error) throw error;
        return (data ?? []).map((p) => ({
          type,
          id: p.id,
          label: p.code ? `${p.code} · ${p.name}` : p.name,
          active: true,
        }));
      }
      if (type === "project") {
        const { data, error } = await supabase
          .from("capex_projects")
          .select("id, name, code, property_id")
          .eq("company_id", companyId!)
          .is("deleted_at", null)
          .order("name");
        if (error) throw error;
        return (data ?? []).map((p) => ({
          type,
          id: p.id,
          label: p.code ? `${p.code} · ${p.name}` : p.name,
          parentId: p.property_id,
          active: true,
        }));
      }
      return [];
    },
  });
  return { options: query.data ?? [], isLoading: query.isLoading };
}

export function createDimensionAdapter(companyId: string | undefined): DimensionAdapter {
  return {
    fields: PEDRA_RIOJA_DIMENSION_FIELDS,
    useOptions: (type: string) => useDimensionOptions(companyId, type),
    /** A capex project must belong to the selected property. */
    validate: (selection) => {
      const propertyId = selection.propertyId ?? null;
      const projectId = selection.projectId ?? null;
      if (!projectId || !propertyId) return null;
      return null;
    },
  };
}

/* ---------------------------------------------------------- documents */

export function createDocumentsAdapter(
  companyId: string | undefined,
  canRecord: boolean,
): DocumentsAdapter {
  return {
    capabilities: { canLink: canRecord, canUpload: false },
    useLinkedFiles: ({ sourceType, sourceId }) => {
      const query = useQuery({
        queryKey: ["bk-linked-files", sourceType, sourceId],
        enabled: Boolean(companyId && sourceId),
        queryFn: async () => {
          const { data: links, error } = await supabase
            .from("document_links")
            .select("document_id, relation")
            .eq("company_id", companyId!)
            .eq("entity_type", sourceType)
            .eq("entity_id", sourceId!);
          if (error) throw error;
          const ids = (links ?? []).map((l) => l.document_id);
          if (!ids.length) return [];
          const { data: docs, error: docErr } = await supabase
            .from("documents")
            .select("id, title, status, drive_web_view_link")
            .in("id", ids)
            .is("deleted_at", null);
          if (docErr) throw docErr;
          const relationById = new Map(
            (links ?? []).map((l) => [l.document_id, l.relation ?? "supporting"]),
          );
          return (docs ?? []).map((d) => ({
            id: d.id,
            title: d.title,
            kind: (relationById.get(d.id) ?? "supporting") as
              | "primary"
              | "supporting"
              | "proof_of_payment",
            url: d.drive_web_view_link,
            status: d.status,
          }));
        },
      });
      return { files: query.data ?? [], isLoading: query.isLoading };
    },
  };
}

/* ------------------------------------------------------------ banking */

export function createBankingAdapter(companyId: string | undefined): BankingAdapter {
  return {
    useEligibleTransactions: () => {
      const query = useQuery({
        queryKey: ["bk-eligible-bank-transactions", companyId],
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
          return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
        },
      });
      return { transactions: query.data ?? [], isLoading: query.isLoading };
    },
    useReconciliationLinks: (documentId) => {
      const query = useQuery({
        queryKey: ["bk-reconciliation-links", documentId],
        enabled: Boolean(documentId),
        queryFn: async () => {
          const { data, error } = await supabase
            .from("financial_payments")
            .select("id, bank_transaction_id, amount, status, payment_date")
            .eq("document_id", documentId!)
            .order("payment_date");
          if (error) throw error;
          return (data ?? []).map((p) => ({
            id: p.id,
            bankTransactionId: p.bank_transaction_id,
            amount: Number(p.amount),
            status: p.status,
            date: p.payment_date,
          }));
        },
      });
      return { links: query.data ?? [], isLoading: query.isLoading };
    },
  };
}

/* ---------------------------------------------------------- cash flow */

export function createCashFlowAdapter(companyId: string | undefined): CashFlowAdapter {
  return {
    useLinkedItem: (documentId) => {
      const query = useQuery({
        queryKey: ["bk-linked-cash-flow", documentId],
        enabled: Boolean(companyId && documentId),
        queryFn: async () => {
          const { data, error } = await supabase
            .from("cash_flow_entries")
            .select("id, expected_date, amount_total, direction, state, category")
            .eq("company_id", companyId!)
            .eq("source_type", "financial_document")
            .eq("source_id", documentId!)
            .is("deleted_at", null)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return {
            id: data.id,
            expectedDate: data.expected_date,
            amount: Number(data.amount_total),
            direction: data.direction,
            status: data.state,
            category: data.category,
          };
        },
      });
      return { item: query.data ?? null, isLoading: query.isLoading };
    },
  };
}
