/**
 * Phase 8D — preventive maintenance reads.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const enabled = (companyId: string | undefined) => Boolean(companyId);

export type MaintenanceScheduleSummary = {
  schedule_id: string;
  company_id: string;
  code: string | null;
  title: string;
  schedule_kind: string;
  property_id: string | null;
  property_name: string | null;
  unit_id: string | null;
  asset_label: string | null;
  counterparty_id: string | null;
  counterparty_name: string | null;
  responsible_name: string | null;
  priority: string;
  frequency: string;
  interval_days: number | null;
  start_date: string;
  end_date: string | null;
  lead_time_days: number;
  is_active: boolean;
  last_generated_at: string | null;
  last_generated_through: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  job_count: number;
  open_count: number;
  next_planned_date: string | null;
  last_completed_date: string | null;
};

export function useMaintenanceSchedules(companyId: string | undefined) {
  return useQuery({
    queryKey: ["maintenance-schedules", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_maintenance_schedule_summary")
        .select("*")
        .eq("company_id", companyId!)
        .order("title", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MaintenanceScheduleSummary[];
    },
  });
}

export type InspectionEvidenceRow = {
  id: string;
  job_id: string;
  outcome: string;
  finding: string;
  document_id: string | null;
  recorded_at: string;
  notes: string | null;
};

export function useInspectionEvidence(jobIds: string[]) {
  return useQuery({
    queryKey: ["inspection-evidence", jobIds.join(",")],
    enabled: jobIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_inspection_evidence")
        .select("id, job_id, outcome, finding, document_id, recorded_at, notes")
        .in("job_id", jobIds)
        .order("recorded_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as InspectionEvidenceRow[];
    },
  });
}

export const MAINTENANCE_KEYS = [
  "maintenance-schedules",
  "maintenance-jobs",
  "inspection-evidence",
];
