/**
 * Phase 8A — commitment reads.
 *
 * Every figure shown in the commitment, maintenance and capex screens is read
 * from the database views (`v_commitment_summary`, `v_capex_summary`) or from
 * the owning tables. Nothing is recomputed in the client beyond formatting and
 * grouping, so the UI can never disagree with the ledger behind it.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CommitmentSummary = {
  commitment_id: string;
  company_id: string;
  code: string | null;
  title: string;
  commitment_type: string;
  status: string;
  approval_status: string;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  counterparty_id: string | null;
  counterparty_name: string | null;
  authorised_amount: number;
  scheduled_amount: number;
  approved_committed_amount: number;
  overdue_scheduled_amount: number;
  retained_amount: number;
  invoiced_amount: number;
  paid_amount: number;
  remaining_commitment: number;
  available_drawdown: number;
  approved_variance: number;
  unapproved_variance: number;
  property_id: string | null;
  unit_id: string | null;
  project_id: string | null;
  archived_at: string | null;
};

export type CommitmentRow = {
  id: string;
  company_id: string;
  title: string;
  code: string | null;
  description: string | null;
  notes: string | null;
  commitment_type: string;
  counterparty_id: string | null;
  currency: string;
  authorised_amount: number;
  status: string;
  approval_status: string;
  start_date: string | null;
  end_date: string | null;
  approval_override_reason: string | null;
  cancellation_reason: string | null;
  completion_notes: string | null;
  source_type: string | null;
  source_id: string | null;
  archived_at: string | null;
};

export type ScheduleVersionRow = {
  id: string;
  commitment_id: string;
  version_no: number;
  schedule_type: string;
  effective_from: string;
  status: string;
  is_current: boolean;
  total_amount: number;
  variance_amount: number;
  variance_approved: boolean;
  variance_reason: string | null;
  requires_approval: boolean;
  reason: string | null;
  notes: string | null;
  activated_at: string | null;
  superseded_at: string | null;
};

export type ScheduleLineRow = {
  id: string;
  commitment_id: string;
  version_id: string;
  line_no: number;
  expected_date: string;
  amount: number;
  line_type: string;
  status: string;
  is_retention: boolean;
  is_contingency: boolean;
  description: string | null;
};

export type DrawdownRow = {
  id: string;
  commitment_id: string;
  document_id: string;
  schedule_line_id: string | null;
  amount: number;
  drawdown_date: string;
  kind: string;
  status: string;
  reverses_drawdown_id: string | null;
  reversal_reason: string | null;
  reversed_at: string | null;
  notes: string | null;
  created_at: string;
};

export type ApprovalRequestRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  requested_amount: number | null;
  requested_by: string | null;
  requested_at: string;
  decision: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
};

export type MaintenanceJobRow = {
  id: string;
  company_id: string;
  code: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  requested_date: string | null;
  target_date: string | null;
  completion_date: string | null;
  responsible_name: string | null;
  counterparty_id: string | null;
  commitment_id: string | null;
  cancellation_reason: string | null;
  notes: string | null;
};

export type CapexSummaryRow = {
  company_id: string;
  project_id: string;
  code: string | null;
  name: string;
  status: string | null;
  project_type: string | null;
  property_id: string | null;
  property_name: string | null;
  currency: string | null;
  budget_amount: number;
  actual_amount: number;
  committed_amount: number;
  forecast_amount: number;
  approved_commitments: number;
  active_commitments: number;
  invoiced_amount: number;
  paid_amount: number;
  remaining_budget: number;
  commitment_variance: number;
  invoice_variance: number;
  spend_pct: number | null;
};

export type DocumentOption = {
  id: string;
  document_number: string | null;
  counterparty_name: string | null;
  issue_date: string | null;
  gross_amount: number;
  payable_amount: number;
  currency: string;
  status: string;
};

const enabled = (companyId?: string | null) => Boolean(companyId);

/* ------------------------------------------------------------ commitments */

export function useCommitmentSummaries(companyId: string | undefined) {
  return useQuery({
    queryKey: ["commitment-summaries", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_commitment_summary")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CommitmentSummary[];
    },
  });
}

export function useCommitmentSummary(companyId: string | undefined, commitmentId: string) {
  return useQuery({
    queryKey: ["commitment-summary", companyId, commitmentId],
    enabled: enabled(companyId) && Boolean(commitmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_commitment_summary")
        .select("*")
        .eq("company_id", companyId!)
        .eq("commitment_id", commitmentId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as CommitmentSummary | null;
    },
  });
}

export function useCommitment(companyId: string | undefined, commitmentId: string) {
  return useQuery({
    queryKey: ["commitment", companyId, commitmentId],
    enabled: enabled(companyId) && Boolean(commitmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitments")
        .select("*")
        .eq("company_id", companyId!)
        .eq("id", commitmentId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as CommitmentRow | null;
    },
  });
}

export function useScheduleVersions(companyId: string | undefined, commitmentId: string) {
  return useQuery({
    queryKey: ["commitment-versions", companyId, commitmentId],
    enabled: enabled(companyId) && Boolean(commitmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_schedule_versions")
        .select("*")
        .eq("company_id", companyId!)
        .eq("commitment_id", commitmentId)
        .order("version_no", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ScheduleVersionRow[];
    },
  });
}

export function useScheduleLines(companyId: string | undefined, commitmentId: string) {
  return useQuery({
    queryKey: ["commitment-lines", companyId, commitmentId],
    enabled: enabled(companyId) && Boolean(commitmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_schedule_lines")
        .select("*")
        .eq("company_id", companyId!)
        .eq("commitment_id", commitmentId)
        .order("expected_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ScheduleLineRow[];
    },
  });
}

export function useDrawdowns(companyId: string | undefined, commitmentId: string) {
  return useQuery({
    queryKey: ["commitment-drawdowns", companyId, commitmentId],
    enabled: enabled(companyId) && Boolean(commitmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_drawdowns")
        .select("*")
        .eq("company_id", companyId!)
        .eq("commitment_id", commitmentId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DrawdownRow[];
    },
  });
}

export function useApprovalHistory(companyId: string | undefined, targetIds: string[]) {
  const key = [...targetIds].sort().join(",");
  return useQuery({
    queryKey: ["approval-history", companyId, key],
    enabled: enabled(companyId) && targetIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("company_id", companyId!)
        .in("target_id", targetIds)
        .order("requested_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalRequestRow[];
    },
  });
}

/** The committed projections this commitment put on the cash-flow timeline. */
export function useCommitmentProjections(companyId: string | undefined, lineIds: string[]) {
  const key = [...lineIds].sort().join(",");
  return useQuery({
    queryKey: ["commitment-projections", companyId, key],
    enabled: enabled(companyId) && lineIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_flow_entries")
        .select("id, source_id, expected_date, amount_total, state, reconciliation_state")
        .eq("company_id", companyId!)
        .eq("source_type", "commitment_schedule_line")
        .in("source_id", lineIds);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as {
        id: string;
        source_id: string;
        expected_date: string;
        amount_total: number;
        state: string;
        reconciliation_state: string;
      }[];
    },
  });
}

/* ------------------------------------------------------------ supporting */

export function useSupplierOptions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["commitment-suppliers", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counterparties")
        .select("id, name, counterparty_type, status")
        .eq("company_id", companyId!)
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as {
        id: string;
        name: string;
        counterparty_type: string;
        status: string;
      }[];
    },
  });
}

/** Posted supplier documents are the only valid drawdown evidence. */
export function usePostedInboundDocuments(companyId: string | undefined) {
  return useQuery({
    queryKey: ["commitment-documents", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_documents")
        .select(
          "id, document_number, counterparty_name, issue_date, gross_amount, payable_amount, currency, status, direction",
        )
        .eq("company_id", companyId!)
        .eq("direction", "inbound")
        .eq("status", "posted")
        .order("issue_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DocumentOption[];
    },
  });
}

/* ------------------------------------------------------- maintenance/capex */

export function useMaintenanceJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ["maintenance-jobs", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_jobs")
        .select("*")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MaintenanceJobRow[];
    },
  });
}

export function useCapexSummaries(companyId: string | undefined) {
  return useQuery({
    queryKey: ["capex-summary", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_capex_summary")
        .select("*")
        .eq("company_id", companyId!)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CapexSummaryRow[];
    },
  });
}

/* ------------------------------------------------------------- derived */

export const COMMITMENT_KEYS = [
  "commitment-summaries",
  "commitment-summary",
  "commitment",
  "commitment-versions",
  "commitment-lines",
  "commitment-drawdowns",
  "commitment-projections",
  "approval-history",
  "maintenance-jobs",
  "capex-summary",
  "cash-flow-entries",
];
