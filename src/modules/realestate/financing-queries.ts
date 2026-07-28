import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AgreementRow = {
  id: string;
  company_id: string;
  property_id: string | null;
  code: string | null;
  type: string;
  lender: string;
  reference: string | null;
  principal: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  term_months: number | null;
  rate_type: string;
  fixed_rate: number | null;
  index_name: string | null;
  index_tenor: string | null;
  spread: number | null;
  repayment_type: string | null;
  grace_months: number | null;
  payment_day: number | null;
  status: string;
  current_version_id: string | null;
  drive_folder_url: string | null;
  notes: string | null;
};

export function useAgreement(agreementId: string) {
  return useQuery({
    queryKey: ["financing-agreement", agreementId],
    queryFn: async () => {
      const [{ data: agreement, error }, { data: summary }, { data: property }] = await Promise.all([
        supabase.from("financing_agreements").select("*").eq("id", agreementId).maybeSingle(),
        supabase
          .from("v_financing_agreement_summary")
          .select("*")
          .eq("agreement_id", agreementId)
          .maybeSingle(),
        supabase
          .from("financing_agreements")
          .select("property_id, properties(id, code, name)")
          .eq("id", agreementId)
          .maybeSingle(),
      ]);
      if (error) throw error;
      return {
        agreement: (agreement ?? null) as AgreementRow | null,
        summary: summary ?? null,
        property: (property as { properties?: { id: string; code: string | null; name: string } | null })
          ?.properties ?? null,
      };
    },
  });
}

/** The live schedule: every non-superseded instalment across all versions. */
export function useAgreementSchedule(agreementId: string) {
  return useQuery({
    queryKey: ["financing-schedule", agreementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_financing_schedule_current")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("due_date", { ascending: true })
        .order("period_no", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAgreementVersions(agreementId: string) {
  return useQuery({
    queryKey: ["financing-versions", agreementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_schedule_versions")
        .select("*")
        .eq("agreement_id", agreementId)
        .is("deleted_at", null)
        .order("version_no", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useScheduleImports(agreementId: string) {
  return useQuery({
    queryKey: ["financing-imports", agreementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_schedule_imports")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImportRows(importId: string | null) {
  return useQuery({
    queryKey: ["financing-import-rows", importId],
    enabled: Boolean(importId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_schedule_import_rows")
        .select("*")
        .eq("import_id", importId!)
        .order("line_no");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAgreementCashFlow(agreementId: string) {
  return useQuery({
    queryKey: ["financing-cash-flow", agreementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_cash_flow_projection")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("month", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
