/**
 * Phase 8F.2 — acquisition pipeline reads.
 *
 * Everything here is operational. The money columns are indicative deal
 * estimates; they never appear in a portfolio, valuation or investment view
 * and are never presented as an accounting balance.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AcquisitionOpportunity = {
  opportunity_id: string;
  company_id: string;
  reference: string;
  title: string;
  property_name: string | null;
  address: string | null;
  location: string | null;
  opportunity_type: string;
  source: string | null;
  broker_id: string | null;
  broker_name: string | null;
  seller_id: string | null;
  seller_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  assigned_to: string | null;
  stage: string;
  probability: number;
  link_kind: string;
  property_id: string | null;
  currency: string;
  asking_price: number | null;
  indicative_offer: number | null;
  valuation_amount: number | null;
  target_acquisition_date: string | null;
  expected_closing_date: string | null;
  decision: string | null;
  decision_reason: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_archived: boolean;
  weighted_estimate: number;
  activity_count: number;
  open_task_count: number;
  offer_count: number;
  latest_offer_amount: number | null;
  latest_valuation: number | null;
  linked_commitment_count: number;
};

export type AcquisitionStageEvent = {
  id: string;
  opportunity_id: string;
  from_stage: string | null;
  to_stage: string;
  is_reopen: boolean;
  reason: string | null;
  occurred_at: string;
  actor_id: string | null;
};

export type AcquisitionActivity = {
  id: string;
  opportunity_id: string;
  activity_type: string;
  summary: string;
  body: string | null;
  occurred_at: string;
  author_id: string | null;
};

export type AcquisitionTask = {
  id: string;
  opportunity_id: string;
  description: string;
  assignee_id: string | null;
  due_date: string | null;
  priority: string;
  reminder_at: string | null;
  status: string;
  completed_at: string | null;
};

export type AcquisitionValuation = {
  id: string;
  opportunity_id: string;
  valued_on: string;
  method: string;
  estimated_value: number;
  currency: string;
  comments: string | null;
  author_id: string | null;
};

export type AcquisitionOffer = {
  id: string;
  opportunity_id: string;
  offer_no: number;
  amount: number;
  currency: string;
  submitted_on: string | null;
  expires_on: string | null;
  status: string;
  negotiation_notes: string | null;
  decided_on: string | null;
  decision_notes: string | null;
};

export type AcquisitionCommitmentLink = {
  link_id: string;
  opportunity_id: string;
  commitment_id: string;
  link_reason: string | null;
  linked_at: string;
  commitment_code: string | null;
  commitment_title: string;
  commitment_status: string;
  commitment_currency: string;
  authorised_amount: number;
};

export type AcquisitionStageSummary = {
  company_id: string;
  stage: string;
  opportunity_count: number;
  estimate_total: number;
  weighted_total: number;
};

const enabled = (companyId: string | undefined) => Boolean(companyId);

export function useOpportunities(companyId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-opportunities", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_acquisition_pipeline")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AcquisitionOpportunity[];
    },
  });
}

export function useOpportunity(companyId: string | undefined, opportunityId: string) {
  return useQuery({
    queryKey: ["acquisition-opportunity", companyId, opportunityId],
    enabled: enabled(companyId) && Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_acquisition_pipeline")
        .select("*")
        .eq("company_id", companyId!)
        .eq("opportunity_id", opportunityId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as AcquisitionOpportunity | null;
    },
  });
}

export function useStageSummary(companyId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-stage-summary", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_acquisition_stage_summary")
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AcquisitionStageSummary[];
    },
  });
}

export function useStageHistory(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-stage-events", opportunityId],
    enabled: Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisition_stage_events")
        .select("id, opportunity_id, from_stage, to_stage, is_reopen, reason, occurred_at, actor_id")
        .eq("opportunity_id", opportunityId!)
        .order("occurred_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AcquisitionStageEvent[];
    },
  });
}

export function useAcquisitionActivities(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-activities", opportunityId],
    enabled: Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisition_activities")
        .select("id, opportunity_id, activity_type, summary, body, occurred_at, author_id")
        .eq("opportunity_id", opportunityId!)
        .order("occurred_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AcquisitionActivity[];
    },
  });
}

export function useAcquisitionTasks(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-tasks", opportunityId],
    enabled: Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisition_tasks")
        .select(
          "id, opportunity_id, description, assignee_id, due_date, priority, reminder_at, status, completed_at",
        )
        .eq("opportunity_id", opportunityId!)
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AcquisitionTask[];
    },
  });
}

export function useAcquisitionValuations(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-valuations", opportunityId],
    enabled: Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisition_valuations")
        .select("id, opportunity_id, valued_on, method, estimated_value, currency, comments, author_id")
        .eq("opportunity_id", opportunityId!)
        .order("valued_on", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AcquisitionValuation[];
    },
  });
}

export function useAcquisitionOffers(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-offers", opportunityId],
    enabled: Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquisition_offers")
        .select(
          "id, opportunity_id, offer_no, amount, currency, submitted_on, expires_on, status, negotiation_notes, decided_on, decision_notes",
        )
        .eq("opportunity_id", opportunityId!)
        .order("offer_no", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AcquisitionOffer[];
    },
  });
}

export function useAcquisitionCommitmentLinks(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-commitment-links", opportunityId],
    enabled: Boolean(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_acquisition_commitment_link")
        .select("*")
        .eq("opportunity_id", opportunityId!)
        .order("linked_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AcquisitionCommitmentLink[];
    },
  });
}

/** Draft and approved commitments a user may attach to an opportunity. */
export function useLinkableCommitments(companyId: string | undefined) {
  return useQuery({
    queryKey: ["acquisition-linkable-commitments", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitments")
        .select("id, code, title, status, currency, authorised_amount")
        .eq("company_id", companyId!)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as {
        id: string;
        code: string | null;
        title: string;
        status: string;
        currency: string;
        authorised_amount: number;
      }[];
    },
  });
}

export const ACQUISITION_KEYS = [
  "acquisition-opportunities",
  "acquisition-opportunity",
  "acquisition-stage-summary",
  "acquisition-stage-events",
  "acquisition-activities",
  "acquisition-tasks",
  "acquisition-valuations",
  "acquisition-offers",
  "acquisition-commitment-links",
  "acquisition-linkable-commitments",
  "commitments",
];
