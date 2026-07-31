/**
 * Phase 8F.4 — closing & handover reads.
 *
 * Readiness, condition counts and handover progress are derived in the
 * database view; nothing here recomputes a stored figure.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ClosingCase = {
  closing_id: string;
  company_id: string;
  opportunity_id: string;
  opportunity_reference: string;
  opportunity_title: string;
  due_diligence_case_id: string | null;
  diligence_reference: string | null;
  diligence_status: string | null;
  diligence_recommendation: string | null;
  commitment_id: string | null;
  property_id: string | null;
  property_name: string | null;
  reference: string;
  title: string;
  status: string;
  handover_status: string;
  currency: string;
  agreed_price: number | null;
  notary_name: string | null;
  notary_reference: string | null;
  deed_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  possession_date: string | null;
  notes: string | null;
  cancel_reason: string | null;
  archived_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  condition_count: number;
  conditions_met: number;
  blocking_outstanding: number;
  failed_conditions: number;
  handover_task_count: number;
  handover_tasks_done: number;
  diligence_ready: boolean;
  is_ready: boolean;
};

export type ClosingCondition = {
  id: string;
  closing_id: string;
  title: string;
  description: string | null;
  category: string;
  responsible_party: string;
  is_blocking: boolean;
  status: string;
  owner_id: string | null;
  due_date: string | null;
  satisfied_at: string | null;
  waiver_reason: string | null;
  notes: string | null;
  sort_order: number;
};

export type HandoverTask = {
  id: string;
  closing_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  owner_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  sort_order: number;
};

export type ClosingEvent = {
  id: string;
  closing_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  occurred_at: string;
  actor_id: string | null;
};

const enabled = (companyId?: string) => Boolean(companyId);

export function useClosingCases(companyId: string | undefined) {
  return useQuery({
    queryKey: ["closing-cases", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_closing_case")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ClosingCase[];
    },
  });
}

export function useClosingCase(companyId: string | undefined, closingId: string | undefined) {
  return useQuery({
    queryKey: ["closing-case", companyId, closingId],
    enabled: enabled(companyId) && Boolean(closingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_closing_case")
        .select("*")
        .eq("company_id", companyId!)
        .eq("closing_id", closingId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as ClosingCase | null;
    },
  });
}

export function useClosingForOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["closing-for-opportunity", opportunityId],
    enabled: Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_closing_case")
        .select("*")
        .eq("opportunity_id", opportunityId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as ClosingCase | null;
    },
  });
}

export function useClosingConditions(closingId: string | undefined) {
  return useQuery({
    queryKey: ["closing-conditions", closingId],
    enabled: Boolean(closingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closing_conditions")
        .select(
          "id, closing_id, title, description, category, responsible_party, is_blocking, status, owner_id, due_date, satisfied_at, waiver_reason, notes, sort_order",
        )
        .eq("closing_id", closingId!)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ClosingCondition[];
    },
  });
}

export function useHandoverTasks(closingId: string | undefined) {
  return useQuery({
    queryKey: ["closing-handover-tasks", closingId],
    enabled: Boolean(closingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closing_handover_tasks")
        .select(
          "id, closing_id, title, description, category, status, owner_id, due_date, completed_at, notes, sort_order",
        )
        .eq("closing_id", closingId!)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as HandoverTask[];
    },
  });
}

export function useClosingEvents(closingId: string | undefined) {
  return useQuery({
    queryKey: ["closing-events", closingId],
    enabled: Boolean(closingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closing_events")
        .select("id, closing_id, from_status, to_status, reason, occurred_at, actor_id")
        .eq("closing_id", closingId!)
        .order("occurred_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ClosingEvent[];
    },
  });
}

export const CLOSING_KEYS = [
  "closing-cases",
  "closing-case",
  "closing-for-opportunity",
  "closing-conditions",
  "closing-handover-tasks",
  "closing-events",
  "diligence-cases",
  "diligence-case",
  "acquisition-opportunities",
  "acquisition-opportunity",
  "properties",
];
