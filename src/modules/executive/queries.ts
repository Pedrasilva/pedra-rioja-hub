/**
 * Executive layer — read contract.
 *
 * Every figure here is derived in the database (views and functions). Nothing
 * is recomputed client-side beyond presentation arithmetic.
 */

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/* --------------------------------------------------------------- types */

export type ExecutiveSnapshot = {
  portfolio: {
    property_count: number;
    portfolio_value: number;
    acquisition_total: number;
    outstanding_debt: number;
    estimated_equity: number;
    monthly_rent: number;
    unit_count: number;
    occupancy_pct: number | null;
    under_works: number;
    income_producing: number;
  };
  liquidity: {
    total_cash: number;
    unreconciled_count: number;
    accounts: {
      id: string;
      name: string;
      bank_name: string | null;
      currency: string;
      balance: number;
      unreconciled_count: number;
    }[];
  };
  financing: {
    total_debt: number;
    weighted_rate: number;
    lenders: {
      lender: string;
      outstanding: number;
      agreements: number;
      rate: number;
      next_due_date: string | null;
      earliest_maturity: string | null;
    }[];
  };
  maturity: { year: number; outstanding: number; agreements: number }[];
  next_instalments: {
    agreement_id: string;
    due_date: string;
    total_payment: number;
    principal: number;
    interest: number;
    property_id: string | null;
    lender: string | null;
  }[];
  bookkeeping: {
    draft_count: number;
    posted_count: number;
    cancelled_count: number;
    outstanding_supplier_count: number;
    outstanding_supplier_amount: number;
    outstanding_client_count: number;
    outstanding_client_amount: number;
    overdue_count: number;
    overdue_amount: number;
  } | null;
  projects: {
    active_count: number;
    budget_total: number;
    committed_total: number;
    actual_total: number;
    remaining_total: number;
    items: {
      id: string;
      name: string;
      status: string;
      budget: number;
      committed: number;
      actual: number;
      remaining: number;
      target_end_date: string | null;
      property_name: string | null;
    }[];
  };
  income_costs: {
    rental_income_12m: number;
    other_income_12m: number;
    operating_costs_12m: number;
    financing_costs_12m: number;
    capex_12m: number;
    taxes_12m: number;
  };
  upcoming_costs: {
    id: string;
    date: string;
    description: string | null;
    category: string | null;
    amount: number;
    state: string;
    counterparty_name: string | null;
  }[];
  recent_payments: {
    id: string;
    date: string;
    amount: number;
    method: string | null;
    document_number: string | null;
    counterparty_name: string | null;
    direction: string;
  }[];
};

export type ExecutiveAlert = {
  key: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  detail: string | null;
  due_date: string | null;
  amount: number | null;
  entity_type: string | null;
  entity_id: string | null;
};

export const SEVERITY_ORDER: Record<ExecutiveAlert["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Sorts alerts by severity, then by the soonest date. */
export function sortAlerts(alerts: ExecutiveAlert[]): ExecutiveAlert[] {
  return [...alerts].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
  });
}

/* -------------------------------------------------------------- hooks */

export function useExecutiveSnapshot(companyId: string | undefined) {
  return useQuery({
    queryKey: ["executive-snapshot", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<ExecutiveSnapshot> => {
      const { data, error } = await supabase.rpc("executive_snapshot", {
        _company_id: companyId!,
      });
      if (error) throw error;
      return data as unknown as ExecutiveSnapshot;
    },
  });
}

export function useExecutiveAlerts(companyId: string | undefined) {
  return useQuery({
    queryKey: ["executive-alerts", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<ExecutiveAlert[]> => {
      const { data, error } = await supabase.rpc("executive_alerts", {
        _company_id: companyId!,
      });
      if (error) throw error;
      return sortAlerts(
        ((data ?? []) as ExecutiveAlert[]).map((a) => ({
          ...a,
          amount: a.amount === null ? null : Number(a.amount),
        })),
      );
    },
  });
}

export function useLiquidityForecast(companyId: string | undefined, scenario = "base") {
  return useQuery({
    queryKey: ["liquidity-forecast", companyId, scenario],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("liquidity_forecast", {
        _company_id: companyId!,
        _scenario: scenario,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        horizon_days: Number(r.horizon_days),
        horizon_date: r.horizon_date as string,
        inflows: Number(r.inflows ?? 0),
        outflows: Number(r.outflows ?? 0),
        net_movement: Number(r.net_movement ?? 0),
        projected_balance: Number(r.projected_balance ?? 0),
      }));
    },
  });
}

export function useCounterpartyAgeing(
  companyId: string | undefined,
  direction: "inbound" | "outbound",
) {
  return useQuery({
    queryKey: ["counterparty-ageing", companyId, direction],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_counterparty_ageing")
        .select("*")
        .eq("company_id", companyId!)
        .eq("direction", direction)
        .order("outstanding_amount", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        outstanding_amount: Number(r.outstanding_amount ?? 0),
        not_due: Number(r.not_due ?? 0),
        due_1_30: Number(r.due_1_30 ?? 0),
        due_31_60: Number(r.due_31_60 ?? 0),
        due_61_90: Number(r.due_61_90 ?? 0),
        due_over_90: Number(r.due_over_90 ?? 0),
      }));
    },
  });
}

export type ReportRange = { from: string; to: string; propertyId?: string | null };

export function useIncomeStatement(companyId: string | undefined, range: ReportRange) {
  return useQuery({
    queryKey: ["income-statement", companyId, range],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("v_income_statement")
        .select("*")
        .eq("company_id", companyId!)
        .gte("issue_date", range.from)
        .lte("issue_date", range.to);
      if (range.propertyId) q = q.eq("property_id", range.propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        net_amount: Number(r.net_amount ?? 0),
        vat_amount: Number(r.vat_amount ?? 0),
        gross_amount: Number(r.gross_amount ?? 0),
      }));
    },
  });
}

export function usePropertyProfitability(companyId: string | undefined, range: ReportRange) {
  return useQuery({
    queryKey: ["property-profitability", companyId, range.from, range.to],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("property_profitability", {
        _company_id: companyId!,
        _from: range.from,
        _to: range.to,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        current_valuation: Number(r.current_valuation ?? 0),
        acquisition_total: Number(r.acquisition_total ?? 0),
        outstanding_debt: Number(r.outstanding_debt ?? 0),
        rental_income: Number(r.rental_income ?? 0),
        other_income: Number(r.other_income ?? 0),
        operating_costs: Number(r.operating_costs ?? 0),
        financing_costs: Number(r.financing_costs ?? 0),
        capex_spend: Number(r.capex_spend ?? 0),
        taxes: Number(r.taxes ?? 0),
        net_operating_income: Number(r.net_operating_income ?? 0),
        net_cash_flow: Number(r.net_cash_flow ?? 0),
        gross_yield: r.gross_yield === null ? null : Number(r.gross_yield),
        net_yield: r.net_yield === null ? null : Number(r.net_yield),
        roi: r.roi === null ? null : Number(r.roi),
      }));
    },
  });
}

export function useDebtSummary(companyId: string | undefined) {
  return useQuery({
    queryKey: ["debt-summary", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_debt_summary")
        .select("*")
        .eq("company_id", companyId!)
        .order("outstanding_principal", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        original_principal: Number(r.original_principal ?? 0),
        outstanding_principal: Number(r.outstanding_principal ?? 0),
        interest_paid: Number(r.interest_paid ?? 0),
        remaining_total: Number(r.remaining_total ?? 0),
        weighted_rate: Number(r.weighted_rate ?? 0),
      }));
    },
  });
}

export function useCapexSummary(companyId: string | undefined) {
  return useQuery({
    queryKey: ["capex-summary", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_capex_summary")
        .select("*")
        .eq("company_id", companyId!)
        .order("budget_amount", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        budget_amount: Number(r.budget_amount ?? 0),
        actual_amount: Number(r.actual_amount ?? 0),
        committed_amount: Number(r.committed_amount ?? 0),
        forecast_amount: Number(r.forecast_amount ?? 0),
        remaining_budget: Number(r.remaining_budget ?? 0),
      }));
    },
  });
}

export function useVatSummary(companyId: string | undefined, range: ReportRange) {
  return useQuery({
    queryKey: ["vat-summary", companyId, range.from, range.to],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("vat_summary", {
        _company_id: companyId!,
        _from: range.from,
        _to: range.to,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        vat_rate: Number(r.vat_rate ?? 0),
        net_amount: Number(r.net_amount ?? 0),
        vat_amount: Number(r.vat_amount ?? 0),
        gross_amount: Number(r.gross_amount ?? 0),
      }));
    },
  });
}

export function useDocumentJournal(companyId: string | undefined, range: ReportRange) {
  return useQuery({
    queryKey: ["document-journal", companyId, range],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("v_document_journal")
        .select("*")
        .eq("company_id", companyId!)
        .gte("issue_date", range.from)
        .lte("issue_date", range.to)
        .order("issue_date")
        .limit(2000);
      if (range.propertyId) q = q.eq("property_code", range.propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
