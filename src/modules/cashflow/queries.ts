import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CashFlowFilters = {
  scenario: string;
  propertyId?: string | null;
  bankAccountId?: string | null;
  projectId?: string | null;
  category?: string | null;
  states?: string[] | null;
  includeInactive?: boolean;
};

export type MonthlyRow = {
  month: string;
  opening_balance: number;
  inflows: number;
  outflows: number;
  financing: number;
  recurring: number;
  projects: number;
  taxes: number;
  other_outflows: number;
  net_movement: number;
  closing_balance: number;
  cumulative_liquidity: number;
  actual_net: number;
  forecast_net: number;
  variance: number;
};

export function useCashFlowMonthly(
  companyId: string | undefined,
  from: string,
  months: number,
  f: CashFlowFilters,
) {
  return useQuery({
    queryKey: ["cash-flow-monthly", companyId, from, months, f],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("cash_flow_monthly", {
        _company_id: companyId!,
        _from: from,
        _months: months,
        _scenario: f.scenario,
        _property_id: f.propertyId ?? undefined,
        _bank_account_id: f.bankAccountId ?? undefined,
        _project_id: f.projectId ?? undefined,
        _category: f.category ?? undefined,
        _states: f.states?.length ? f.states : undefined,
        _include_inactive: f.includeInactive ?? false,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        opening_balance: Number(r.opening_balance ?? 0),
        inflows: Number(r.inflows ?? 0),
        outflows: Number(r.outflows ?? 0),
        financing: Number(r.financing ?? 0),
        recurring: Number(r.recurring ?? 0),
        projects: Number(r.projects ?? 0),
        taxes: Number(r.taxes ?? 0),
        other_outflows: Number(r.other_outflows ?? 0),
        net_movement: Number(r.net_movement ?? 0),
        closing_balance: Number(r.closing_balance ?? 0),
        cumulative_liquidity: Number(r.cumulative_liquidity ?? 0),
        actual_net: Number(r.actual_net ?? 0),
        forecast_net: Number(r.forecast_net ?? 0),
        variance: Number(r.variance ?? 0),
      })) as MonthlyRow[];
    },
  });
}

export function useCashFlowEntries(
  companyId: string | undefined,
  from: string,
  to: string,
  f: CashFlowFilters,
) {
  return useQuery({
    queryKey: ["cash-flow-entries", companyId, from, to, f],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("v_cash_flow_entries")
        .select("*")
        .eq("company_id", companyId!)
        .gte("entry_date", from)
        .lte("entry_date", to)
        .order("entry_date", { ascending: true })
        .limit(1000);
      if (f.propertyId) q = q.eq("property_id", f.propertyId);
      if (f.bankAccountId) q = q.eq("bank_account_id", f.bankAccountId);
      if (f.projectId) q = q.eq("project_id", f.projectId);
      if (f.category) q = q.eq("category", f.category);
      if (f.states?.length) q = q.in("state", f.states);
      if (!f.includeInactive) q = q.eq("property_inactive", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).filter(
        (e) => !e.scenario_code || e.scenario_code === f.scenario,
      );
    },
  });
}

export function useRecurringRules(companyId: string | undefined) {
  return useQuery({
    queryKey: ["cash-flow-rules", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_flow_recurring_rules")
        .select("*, properties(name, code)")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useScenarios(companyId: string | undefined) {
  return useQuery({
    queryKey: ["cash-flow-scenarios", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_flow_scenarios")
        .select("*")
        .eq("company_id", companyId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBankAccounts(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bank-accounts", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Filter option sources: properties and projects still in play. */
export function useCashFlowFilterOptions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["cash-flow-filter-options", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [{ data: properties }, { data: projects }] = await Promise.all([
        supabase
          .from("properties")
          .select("id, code, name, status")
          .eq("company_id", companyId!)
          .is("deleted_at", null)
          .order("code"),
        supabase
          .from("capex_projects")
          .select("id, name, property_id")
          .eq("company_id", companyId!)
          .is("deleted_at", null)
          .order("name"),
      ]);
      return { properties: properties ?? [], projects: projects ?? [] };
    },
  });
}
