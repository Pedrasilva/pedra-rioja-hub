/**
 * Phase 8F.1 — payment execution reads.
 *
 * Every amount on a payment screen comes from the derived views, which read
 * the invoice behind each instruction. The payment layer stores no amount, so
 * a run can never disagree with bookkeeping.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentRunSummary = {
  payment_run_id: string;
  company_id: string;
  reference: string;
  title: string;
  description: string | null;
  status: string;
  approval_status: string;
  approval_request_id: string | null;
  scheduled_execution_date: string | null;
  actual_execution_date: string | null;
  archived_at: string | null;
  cancellation_reason: string | null;
  completion_notes: string | null;
  created_at: string;
  created_by: string | null;
  approved_by: string | null;
  exported_at: string | null;
  executed_at: string | null;
  completed_at: string | null;
  batch_count: number;
  instruction_count: number;
  executed_count: number;
  failed_count: number;
  outstanding_total: number;
  payable_total: number;
};

export type PaymentBatchSummary = {
  batch_id: string;
  company_id: string;
  payment_run_id: string;
  counterparty_id: string | null;
  counterparty_name: string | null;
  currency: string;
  bank_account_id: string | null;
  execution_order: number;
  export_status: string;
  exported_at: string | null;
  export_format: string | null;
  export_reference: string | null;
  instruction_count: number;
  outstanding_total: number;
  payable_total: number;
};

export type PaymentInstructionDetail = {
  instruction_id: string;
  company_id: string;
  payment_run_id: string;
  batch_id: string;
  document_id: string;
  counterparty_id: string | null;
  bank_account_id: string | null;
  payment_method: string;
  payment_reference: string | null;
  status: string;
  failure_reason: string | null;
  executed_at: string | null;
  notes: string | null;
  document_number: string | null;
  series: string | null;
  doc_type: string;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  document_status: string;
  payment_state: string;
  payable_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  counterparty_name: string | null;
  bank_account_name: string | null;
};

export type PaymentRunExport = {
  id: string;
  payment_run_id: string;
  batch_id: string | null;
  format: string;
  provider: string | null;
  file_name: string | null;
  content_hash: string | null;
  instruction_count: number;
  notes: string | null;
  generated_at: string;
  generated_by: string | null;
};

export type PayableDocument = {
  id: string;
  document_number: string | null;
  series: string | null;
  counterparty_id: string | null;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  payable_amount: number;
  outstanding_amount: number;
  payment_state: string;
};

const enabled = (companyId?: string | null) => Boolean(companyId);

export function usePaymentRuns(companyId: string | undefined) {
  return useQuery({
    queryKey: ["payment-runs", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_payment_run_summary")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PaymentRunSummary[];
    },
  });
}

export function usePaymentRun(companyId: string | undefined, runId: string) {
  return useQuery({
    queryKey: ["payment-run", companyId, runId],
    enabled: enabled(companyId) && Boolean(runId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_payment_run_summary")
        .select("*")
        .eq("company_id", companyId!)
        .eq("payment_run_id", runId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as PaymentRunSummary | null;
    },
  });
}

export function usePaymentBatches(runId: string | undefined) {
  return useQuery({
    queryKey: ["payment-batches", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_payment_batch_summary")
        .select("*")
        .eq("payment_run_id", runId!)
        .order("execution_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PaymentBatchSummary[];
    },
  });
}

export function usePaymentInstructions(runId: string | undefined) {
  return useQuery({
    queryKey: ["payment-instructions", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_payment_instruction_detail")
        .select("*")
        .eq("payment_run_id", runId!)
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PaymentInstructionDetail[];
    },
  });
}

export function usePaymentRunExports(runId: string | undefined) {
  return useQuery({
    queryKey: ["payment-run-exports", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_run_exports")
        .select(
          "id, payment_run_id, batch_id, format, provider, file_name, content_hash, instruction_count, notes, generated_at, generated_by",
        )
        .eq("payment_run_id", runId!)
        .order("generated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PaymentRunExport[];
    },
  });
}

/** Posted supplier invoices with something still outstanding. */
export function usePayableDocuments(companyId: string | undefined) {
  return useQuery({
    queryKey: ["payable-documents", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_documents")
        .select(
          "id, document_number, series, counterparty_id, issue_date, due_date, currency, payable_amount, outstanding_amount, payment_state",
        )
        .eq("company_id", companyId!)
        .eq("direction", "inbound")
        .eq("status", "posted")
        .gt("outstanding_amount", 0)
        .order("due_date", { ascending: true })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PayableDocument[];
    },
  });
}

export function useCounterpartyNames(companyId: string | undefined) {
  return useQuery({
    queryKey: ["payment-counterparties", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counterparties")
        .select("id, name")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

export const PAYMENT_KEYS = [
  "payment-runs",
  "payment-run",
  "payment-batches",
  "payment-instructions",
  "payment-run-exports",
  "payable-documents",
  "approval-requests",
  "approval-inbox",
  "financial-documents",
];
