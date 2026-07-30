/**
 * Phase 8C — approval reads.
 *
 * Every value shown by the approval UI comes from the canonical views
 * (`v_approval_inbox`, `v_approval_request_detail`, `v_approval_history`,
 * `v_approval_workflow_overview`) or from the append-only tables behind them.
 * The UI computes nothing authoritative: amounts, statuses, step names and
 * callback state are read exactly as the engine recorded them.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ApprovalCandidateRow,
  ApprovalEventRow,
  ApprovalHistoryRow,
  ApprovalInboxItem,
  ApprovalInboxRow,
  ApprovalMemberRow,
  ApprovalRequestDetailRow,
  ApprovalStepAssignmentRow,
  ApprovalTargetTypeRow,
  ApprovalWorkflowOverviewRow,
  ApprovalWorkflowRow,
  ApprovalWorkflowStepRow,
  ApprovalWorkflowVersionRow,
} from "./types";

const on = (companyId: string | undefined) => Boolean(companyId);
const NO_ID = "00000000-0000-0000-0000-000000000000";

export const APPROVAL_KEYS = [
  "approval-requests",
  "approval-request",
  "approval-inbox-rows",
  "approval-decisions",
  "approval-events",
  "approval-candidates",
  "approval-workflows",
  "approval-workflow",
  "approval-workflow-versions",
  "approval-workflow-steps",
  "approval-step-assignments",
  "approval-target-types",
  "approval-members",
  // Phase 8A compatibility: the commitment screens read the same trail.
  "approval-history",
  "commitment",
  "commitment-summary",
  "commitment-summaries",
];

/* ------------------------------------------------------------ requests */

export function useApprovalRequests(companyId: string | undefined) {
  return useQuery({
    queryKey: ["approval-requests", companyId],
    enabled: on(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_approval_request_detail")
        .select("*")
        .eq("company_id", companyId!)
        .order("requested_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalRequestDetailRow[];
    },
  });
}

export function useApprovalRequest(companyId: string | undefined, requestId: string) {
  return useQuery({
    queryKey: ["approval-request", companyId, requestId],
    enabled: on(companyId) && Boolean(requestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_approval_request_detail")
        .select("*")
        .eq("company_id", companyId!)
        .eq("request_id", requestId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as ApprovalRequestDetailRow | null;
    },
  });
}

/** Rows of `v_approval_inbox` — one per (request, resolved approver). */
export function useInboxAssignments(companyId: string | undefined) {
  return useQuery({
    queryKey: ["approval-inbox-rows", companyId],
    enabled: on(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_approval_inbox")
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalInboxRow[];
    },
  });
}

export function useApprovalCandidates(companyId: string | undefined, requestId?: string) {
  return useQuery({
    queryKey: ["approval-candidates", companyId, requestId ?? "all"],
    enabled: on(companyId),
    queryFn: async () => {
      let q = supabase.from("approval_request_candidates").select("*").eq("company_id", companyId!);
      if (requestId) q = q.eq("request_id", requestId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalCandidateRow[];
    },
  });
}

export function useApprovalDecisions(companyId: string | undefined, requestId: string) {
  return useQuery({
    queryKey: ["approval-decisions", companyId, requestId],
    enabled: on(companyId) && Boolean(requestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_approval_history")
        .select("*")
        .eq("company_id", companyId!)
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalHistoryRow[];
    },
  });
}

export function useApprovalEvents(companyId: string | undefined, requestId: string) {
  return useQuery({
    queryKey: ["approval-events", companyId, requestId],
    enabled: on(companyId) && Boolean(requestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_events")
        .select("*")
        .eq("company_id", companyId!)
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalEventRow[];
    },
  });
}

/* ----------------------------------------------------------- workflows */

export function useApprovalWorkflows(companyId: string | undefined) {
  return useQuery({
    queryKey: ["approval-workflows", companyId],
    enabled: on(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_approval_workflow_overview")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalWorkflowOverviewRow[];
    },
  });
}

export function useApprovalWorkflow(companyId: string | undefined, workflowId: string) {
  return useQuery({
    queryKey: ["approval-workflow", companyId, workflowId],
    enabled: on(companyId) && Boolean(workflowId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_workflows")
        .select("*")
        .eq("company_id", companyId!)
        .eq("id", workflowId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as ApprovalWorkflowRow | null;
    },
  });
}

export function useWorkflowVersions(companyId: string | undefined, workflowId: string) {
  return useQuery({
    queryKey: ["approval-workflow-versions", companyId, workflowId],
    enabled: on(companyId) && Boolean(workflowId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_workflow_versions")
        .select("*")
        .eq("company_id", companyId!)
        .eq("workflow_id", workflowId)
        .order("version_no", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalWorkflowVersionRow[];
    },
  });
}

export function useWorkflowSteps(companyId: string | undefined, versionId: string | undefined) {
  return useQuery({
    queryKey: ["approval-workflow-steps", companyId, versionId ?? "none"],
    enabled: on(companyId) && Boolean(versionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_workflow_steps")
        .select("*")
        .eq("company_id", companyId!)
        .eq("version_id", versionId!)
        .order("step_no", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalWorkflowStepRow[];
    },
  });
}

export function useStepAssignments(companyId: string | undefined, stepIds: string[]) {
  const key = [...stepIds].sort().join(",");
  return useQuery({
    queryKey: ["approval-step-assignments", companyId, key],
    enabled: on(companyId) && stepIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_step_assignments")
        .select("*")
        .eq("company_id", companyId!)
        .in("step_id", stepIds);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalStepAssignmentRow[];
    },
  });
}

export function useApprovalTargetTypes() {
  return useQuery({
    queryKey: ["approval-target-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_target_types")
        .select("*")
        .order("label", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalTargetTypeRow[];
    },
  });
}

/** Company members, used for named assignments and delegation targets. */
export function useApprovalMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["approval-members", companyId],
    enabled: on(companyId),
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("company_id", companyId!);
      if (error) throw new Error(error.message);
      const ids = [...new Set((roles ?? []).map((r) => r.user_id as string))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids.length ? ids : [NO_ID]);
      return (roles ?? []).map((r) => {
        const p = (profiles ?? []).find((x) => x.id === r.user_id) as
          | { full_name: string | null; email: string | null }
          | undefined;
        return {
          user_id: r.user_id as string,
          role: r.role as string,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
        };
      }) as ApprovalMemberRow[];
    },
  });
}

/* -------------------------------------------------------------- derived */

/**
 * Pure projection: which requests belong in *this* user's inbox and why.
 * No authoritative value is computed here — only membership and lateness,
 * both derived from fields the engine wrote.
 */
export function buildInbox(
  requests: ApprovalRequestDetailRow[],
  assignments: ApprovalInboxRow[],
  candidates: ApprovalCandidateRow[],
  userId: string | undefined,
  now: Date = new Date(),
): ApprovalInboxItem[] {
  const mine = new Set(
    assignments.filter((a) => userId && a.approver_id === userId).map((a) => a.request_id),
  );
  const delegated = new Set(
    candidates
      .filter((c) => userId && c.user_id === userId && c.source === "delegation")
      .map((c) => c.request_id),
  );
  const escalated = new Set(
    candidates
      .filter((c) => userId && c.user_id === userId && c.source === "escalation")
      .map((c) => c.request_id),
  );
  return requests.map((r) => ({
    ...r,
    assignedToMe: mine.has(r.request_id),
    delegatedToMe: delegated.has(r.request_id),
    escalatedToMe: escalated.has(r.request_id),
    overdue:
      r.decision === "pending" && Boolean(r.expires_at) && new Date(r.expires_at!) <= now,
  }));
}

export function matchesSearch(item: ApprovalInboxItem, term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return [
    item.target_label,
    item.target_type,
    item.target_type_label,
    item.workflow_name,
    item.workflow_code,
    item.reason,
    item.current_step_name,
  ]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}
