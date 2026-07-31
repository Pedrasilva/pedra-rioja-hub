/**
 * Phase 8F.3 — due-diligence reads.
 *
 * Progress, blocking counts and the completion predicate are all derived in
 * the database views; nothing here recomputes a stored figure.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DiligenceCase = {
  case_id: string;
  company_id: string;
  opportunity_id: string;
  opportunity_reference: string;
  opportunity_title: string;
  opportunity_stage: string;
  template_id: string | null;
  template_name: string | null;
  reference: string;
  title: string;
  status: string;
  recommendation: string;
  recommendation_notes: string | null;
  summary: string | null;
  assigned_to: string | null;
  started_on: string | null;
  target_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  item_count: number;
  done_count: number;
  blocking_count: number;
  blocking_outstanding: number;
  failed_count: number;
  progress_pct: number;
  permits_completion: boolean;
};

export type DiligenceItem = {
  item_id: string;
  company_id: string;
  case_id: string;
  section: string;
  title: string;
  description: string | null;
  is_blocking: boolean;
  status: string;
  risk_level: string;
  assignee_id: string | null;
  due_date: string | null;
  findings: string | null;
  waiver_reason: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  evidence_count: number;
};

export type DiligenceEvent = {
  id: string;
  case_id: string;
  from_status: string | null;
  to_status: string;
  recommendation: string | null;
  reason: string | null;
  occurred_at: string;
  actor_id: string | null;
};

export type DiligenceTemplate = {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  deal_type: string;
  is_active: boolean;
  archived_at: string | null;
};

const enabled = (companyId?: string) => Boolean(companyId);

export function useDiligenceCases(companyId: string | undefined) {
  return useQuery({
    queryKey: ["diligence-cases", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_due_diligence_case")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DiligenceCase[];
    },
  });
}

export function useDiligenceCase(companyId: string | undefined, caseId: string | undefined) {
  return useQuery({
    queryKey: ["diligence-case", companyId, caseId],
    enabled: enabled(companyId) && Boolean(caseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_due_diligence_case")
        .select("*")
        .eq("company_id", companyId!)
        .eq("case_id", caseId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as DiligenceCase | null;
    },
  });
}

/** The open case for one opportunity, used by the acquisition workspace. */
export function useDiligenceCaseForOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["diligence-case-for-opportunity", opportunityId],
    enabled: Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_due_diligence_case")
        .select("*")
        .eq("opportunity_id", opportunityId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as DiligenceCase | null;
    },
  });
}

export function useDiligenceItems(caseId: string | undefined) {
  return useQuery({
    queryKey: ["diligence-items", caseId],
    enabled: Boolean(caseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_due_diligence_item")
        .select("*")
        .eq("case_id", caseId!)
        .order("section", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DiligenceItem[];
    },
  });
}

export function useDiligenceEvents(caseId: string | undefined) {
  return useQuery({
    queryKey: ["diligence-events", caseId],
    enabled: Boolean(caseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("due_diligence_events")
        .select("id, case_id, from_status, to_status, recommendation, reason, occurred_at, actor_id")
        .eq("case_id", caseId!)
        .order("occurred_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DiligenceEvent[];
    },
  });
}

export function useDiligenceTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: ["diligence-templates", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("due_diligence_templates")
        .select("id, company_id, code, name, description, deal_type, is_active, archived_at")
        .eq("company_id", companyId!)
        .is("archived_at", null)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DiligenceTemplate[];
    },
  });
}

export const DILIGENCE_KEYS = [
  "diligence-cases",
  "diligence-case",
  "diligence-case-for-opportunity",
  "diligence-items",
  "diligence-events",
  "diligence-templates",
  "closing-cases",
  "closing-case",
];
