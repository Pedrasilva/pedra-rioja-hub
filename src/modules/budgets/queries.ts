/**
 * Phase 8D — budget reads.
 *
 * Every consumption figure on this screen comes from
 * `v_budget_line_performance` / `v_budget_version_summary`, which derive
 * committed, invoiced and paid from commitments at query time. Nothing is
 * stored, so a budget screen can never disagree with the ledger.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const enabled = (companyId: string | undefined) => Boolean(companyId);

export type BudgetVersionSummary = {
  version_id: string;
  company_id: string;
  budget_id: string;
  code: string | null;
  name: string;
  fiscal_year: number;
  currency: string;
  budget_status: string;
  property_id: string | null;
  unit_id: string | null;
  project_id: string | null;
  property_name: string | null;
  version_no: number;
  status: string;
  approval_status: string;
  approval_request_id: string | null;
  is_current: boolean;
  reason: string | null;
  notes: string | null;
  published_at: string | null;
  published_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  line_count: number;
  planned_amount: number;
  planned_inflow: number;
  planned_outflow: number;
  committed_amount: number;
  invoiced_amount: number;
  paid_amount: number;
  remaining_amount: number;
  variance_amount: number;
};

export type BudgetLinePerformance = {
  line_id: string;
  company_id: string;
  budget_version_id: string;
  budget_id: string;
  fiscal_year: number;
  budget_name: string;
  currency: string;
  version_no: number;
  version_status: string;
  line_no: number;
  label: string;
  direction: string;
  period_month: number | null;
  planned_amount: number;
  dimension_id: string | null;
  dimension_value_id: string | null;
  dimension_value_label: string | null;
  property_id: string | null;
  unit_id: string | null;
  project_id: string | null;
  notes: string | null;
  committed_amount: number;
  invoiced_amount: number;
  paid_amount: number;
  remaining_amount: number;
  variance_amount: number;
  consumed_pct: number | null;
};

export function useBudgetVersions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["budget-versions", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_budget_version_summary")
        .select("*")
        .eq("company_id", companyId!)
        .order("fiscal_year", { ascending: false })
        .order("version_no", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as BudgetVersionSummary[];
    },
  });
}

export function useBudgetVersionsFor(budgetId: string | undefined) {
  return useQuery({
    queryKey: ["budget-versions-for", budgetId],
    enabled: Boolean(budgetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_budget_version_summary")
        .select("*")
        .eq("budget_id", budgetId!)
        .order("version_no", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as BudgetVersionSummary[];
    },
  });
}

export function useBudgetLines(versionId: string | undefined) {
  return useQuery({
    queryKey: ["budget-lines", versionId],
    enabled: Boolean(versionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_budget_line_performance")
        .select("*")
        .eq("budget_version_id", versionId!)
        .order("line_no", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as BudgetLinePerformance[];
    },
  });
}

export type DimensionValueOption = {
  id: string;
  label: string;
  dimension_id: string;
  dimension_name: string;
};

export function useDimensionValueOptions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["budget-dimension-values", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dimension_values")
        .select("id, label, dimension_id, dimensions(name)")
        .eq("company_id", companyId!)
        .order("label", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        label: String(row.label),
        dimension_id: String(row.dimension_id),
        dimension_name: String(
          (row.dimensions as { name?: string } | null)?.name ?? "Dimension",
        ),
      })) as DimensionValueOption[];
    },
  });
}

export type CapexProjectOption = { id: string; name: string };

export function useProjectOptions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["budget-projects", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capex_projects")
        .select("id, name")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CapexProjectOption[];
    },
  });
}

/** Every read key a budget write can invalidate. */
export const BUDGET_KEYS = [
  "budget-versions",
  "budget-versions-for",
  "budget-lines",
  "approval-inbox",
  "approval-requests",
];
