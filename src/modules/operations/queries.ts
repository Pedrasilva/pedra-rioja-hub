/**
 * Phase 8B — operational reads.
 *
 * Every financial column consumed here comes from the derived summary views,
 * which read it from the linked commitment. The operational registers below
 * store no money of their own, so a screen can never disagree with the ledger.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* --------------------------------------------------------------- types */

/** Financial columns every operational summary view exposes, all derived. */
export type DerivedCommitmentFigures = {
  commitment_id: string | null;
  commitment_status: string | null;
  commitment_approval_status: string | null;
  commitment_currency: string | null;
  authorised_amount: number;
  committed_amount: number;
  invoiced_amount: number;
  paid_amount: number;
  remaining_commitment: number;
};

export type ObligationSummary = DerivedCommitmentFigures & {
  obligation_id: string;
  company_id: string;
  code: string | null;
  obligation_type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  responsible_user_id: string | null;
  responsible_name: string | null;
  counterparty_id: string | null;
  counterparty_name: string | null;
  property_id: string | null;
  property_name: string | null;
  due_date: string | null;
  reminder_lead_days: number;
  recurrence_frequency: string;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  notes: string | null;
  archived_at: string | null;
  days_until_due: number | null;
  commitment_title: string | null;
};

export type ServiceContractSummary = DerivedCommitmentFigures & {
  contract_id: string;
  company_id: string;
  code: string | null;
  title: string;
  service_type: string;
  contract_number: string | null;
  counterparty_id: string | null;
  counterparty_name: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_terms: string | null;
  notice_period_days: number | null;
  auto_renew: boolean;
  status: string;
  obligation_id: string | null;
  property_id: string | null;
  reminder_lead_days: number;
  notes: string | null;
  archived_at: string | null;
  days_until_expiry: number | null;
};

export type InsurancePolicySummary = DerivedCommitmentFigures & {
  policy_id: string;
  company_id: string;
  code: string | null;
  title: string;
  policy_number: string | null;
  policy_type: string;
  insured_assets: string | null;
  insurer_counterparty_id: string | null;
  insurer_name: string | null;
  broker_counterparty_id: string | null;
  broker_name: string | null;
  property_id: string | null;
  property_name: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  excess_amount: number | null;
  status: string;
  obligation_id: string | null;
  reminder_lead_days: number;
  notes: string | null;
  archived_at: string | null;
  days_until_expiry: number | null;
};

export type UtilityContractSummary = DerivedCommitmentFigures & {
  contract_id: string;
  company_id: string;
  code: string | null;
  title: string;
  utility_type: string;
  account_number: string | null;
  meter_identifier: string | null;
  service_address: string | null;
  counterparty_id: string | null;
  counterparty_name: string | null;
  property_id: string | null;
  property_name: string | null;
  unit_id: string | null;
  activation_date: string | null;
  termination_date: string | null;
  status: string;
  obligation_id: string | null;
  reminder_lead_days: number;
  notes: string | null;
  archived_at: string | null;
};

export type TaxScheduleSummary = DerivedCommitmentFigures & {
  schedule_id: string;
  company_id: string;
  code: string | null;
  title: string;
  tax_type: string;
  jurisdiction: string | null;
  reference: string | null;
  tax_year: number | null;
  property_id: string | null;
  property_name: string | null;
  status: string;
  obligation_id: string | null;
  reminder_lead_days: number;
  notes: string | null;
  archived_at: string | null;
  scheduled_dates: number;
  next_due_date: string | null;
};

export type TaxScheduleDateRow = {
  id: string;
  company_id: string;
  tax_schedule_id: string;
  sequence_no: number;
  label: string | null;
  due_date: string;
  reminder_date: string | null;
  status: string;
  notes: string | null;
};

export type OperationalReminder = {
  reminder_id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  remind_on: string;
  due_on: string | null;
  severity: string;
  status: string;
  title: string | null;
  notes: string | null;
  resolved_at: string | null;
  days_until_reminder: number | null;
  days_until_due: number | null;
  is_overdue: boolean | null;
  commitment_id: string | null;
};

/* -------------------------------------------------------------- queries */

const enabled = (companyId?: string | null) => Boolean(companyId);

function listQuery<T>(key: string, view: string, companyId: string | undefined, order: string) {
  return {
    queryKey: [key, companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(view as never)
        .select("*")
        .eq("company_id", companyId!)
        .order(order, { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as T[];
    },
  };
}

export function useObligations(companyId: string | undefined) {
  return useQuery(
    listQuery<ObligationSummary>(
      "operational-obligations",
      "v_operational_obligation_summary",
      companyId,
      "due_date",
    ),
  );
}

export function useServiceContracts(companyId: string | undefined) {
  return useQuery(
    listQuery<ServiceContractSummary>(
      "service-contracts",
      "v_service_contract_summary",
      companyId,
      "end_date",
    ),
  );
}

export function useInsurancePolicies(companyId: string | undefined) {
  return useQuery(
    listQuery<InsurancePolicySummary>(
      "insurance-policies",
      "v_insurance_policy_summary",
      companyId,
      "expiry_date",
    ),
  );
}

export function useUtilityContracts(companyId: string | undefined) {
  return useQuery(
    listQuery<UtilityContractSummary>(
      "utility-contracts",
      "v_utility_contract_summary",
      companyId,
      "title",
    ),
  );
}

export function useTaxSchedules(companyId: string | undefined) {
  return useQuery(
    listQuery<TaxScheduleSummary>("tax-schedules", "v_tax_schedule_summary", companyId, "title"),
  );
}

export function useTaxScheduleDates(companyId: string | undefined, scheduleIds: string[]) {
  const key = [...scheduleIds].sort().join(",");
  return useQuery({
    queryKey: ["tax-schedule-dates", companyId, key],
    enabled: enabled(companyId) && scheduleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_schedule_dates")
        .select("*")
        .eq("company_id", companyId!)
        .in("tax_schedule_id", scheduleIds)
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TaxScheduleDateRow[];
    },
  });
}

export function useOperationalReminders(companyId: string | undefined) {
  return useQuery({
    queryKey: ["operational-reminders", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_operational_reminders")
        .select("*")
        .eq("company_id", companyId!)
        .order("remind_on", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as OperationalReminder[];
    },
  });
}

export function usePropertyOptions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["operational-properties", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("company_id", companyId!)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as { id: string; name: string }[];
    },
  });
}

/** Every read key an operational write can invalidate. */
export const OPERATIONS_KEYS = [
  "operational-obligations",
  "service-contracts",
  "insurance-policies",
  "utility-contracts",
  "tax-schedules",
  "tax-schedule-dates",
  "operational-reminders",
  "commitment-summaries",
  "commitment-summary",
  "commitment",
  "cash-flow-entries",
];
