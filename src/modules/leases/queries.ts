/**
 * Phase 8E — lease, tenant, occupancy and rent-roll reads.
 *
 * Every financial figure below comes from a database view. The client
 * formats and groups; it never derives rent, occupancy or WAULT itself.
 */

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const LEASE_KEYS = [
  "leases",
  "lease",
  "lease-versions",
  "lease-units",
  "lease-tenants",
  "lease-charges",
  "lease-reviews",
  "lease-breaks",
  "lease-notices",
  "lease-guarantors",
  "tenants",
  "tenant",
  "tenant-contacts",
  "rent-roll",
  "unit-occupancy",
  "occupancy-history",
  "vacancy-periods",
  "occupancy-metrics",
  "lease-expiry-profile",
  "tenant-concentration",
  "lease-reminders",
  "lease-documents",
] as const;

export type LeaseSummary = {
  lease_id: string;
  company_id: string;
  property_id: string;
  property_name: string | null;
  code: string | null;
  title: string | null;
  lease_type: string;
  status: string;
  is_archived: boolean;
  primary_tenant_id: string | null;
  tenant_name: string | null;
  version_id: string | null;
  version_no: number | null;
  start_date: string | null;
  end_date: string | null;
  is_open_ended: boolean | null;
  currency: string | null;
  base_rent: number | null;
  service_charge: number | null;
  payment_frequency: string | null;
  deposit_amount: number | null;
  deposit_expiry_date: string | null;
  notice_period_days: number | null;
  review_cycle_months: number | null;
  indexation_type: string | null;
  total_periodic_charge: number | null;
  annual_charge: number | null;
  unit_count: number | null;
  total_area_m2: number | null;
  next_review_date: string | null;
  next_break_date: string | null;
  next_break_notice_deadline: string | null;
  days_to_expiry: number | null;
};

export type RentRollRow = {
  rent_roll_id: string;
  company_id: string;
  property_id: string;
  property_name: string | null;
  unit_id: string | null;
  unit_code: string | null;
  unit_name: string | null;
  area_m2: number | null;
  lease_id: string;
  lease_code: string | null;
  lease_status: string;
  version_no: number | null;
  tenant_id: string | null;
  tenant_name: string | null;
  currency: string | null;
  rent: number | null;
  service_charge: number | null;
  payment_frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  deposit_amount: number | null;
  next_review_date: string | null;
  next_break_date: string | null;
  occupancy_status: string | null;
  days_to_expiry: number | null;
  annual_rent: number | null;
};

export type UnitOccupancyRow = {
  company_id: string;
  property_id: string;
  property_name: string | null;
  unit_id: string;
  unit_code: string | null;
  unit_name: string | null;
  area_m2: number | null;
  occupancy_status: string;
  status_since: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  vacancy_id: string | null;
  vacancy_start: string | null;
  marketing_status: string | null;
  target_rent: number | null;
  target_occupation_date: string | null;
};

export type OccupancyMetrics = {
  company_id: string;
  unit_count: number;
  occupied_units: number;
  vacant_units: number;
  total_area_m2: number;
  occupied_area_m2: number;
  occupancy_pct: number | null;
  vacancy_pct: number | null;
  contracted_annual_rent: number | null;
  wault_years: number | null;
};

type Row = Record<string, unknown>;

const enabled = (companyId: string | undefined) => Boolean(companyId);

export function useLeaseSummaries(companyId: string | undefined) {
  return useQuery({
    queryKey: ["leases", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_lease_summary")
        .select("*")
        .eq("company_id", companyId!)
        .order("end_date", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LeaseSummary[];
    },
  });
}

export function useLeaseSummary(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease", leaseId],
    enabled: Boolean(leaseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_lease_summary")
        .select("*")
        .eq("lease_id", leaseId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as LeaseSummary | null;
    },
  });
}

export function useLeaseVersions(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease-versions", leaseId],
    enabled: Boolean(leaseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_versions")
        .select("*")
        .eq("lease_id", leaseId!)
        .order("version_no", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useLeaseUnits(versionId: string | undefined) {
  return useQuery({
    queryKey: ["lease-units", versionId],
    enabled: Boolean(versionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_units")
        .select("*, property_units(code, name, area_m2)")
        .eq("version_id", versionId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useLeaseTenants(versionId: string | undefined) {
  return useQuery({
    queryKey: ["lease-tenants", versionId],
    enabled: Boolean(versionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_tenants")
        .select("*, tenants(name, legal_name)")
        .eq("version_id", versionId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useLeaseCharges(versionId: string | undefined) {
  return useQuery({
    queryKey: ["lease-charges", versionId],
    enabled: Boolean(versionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_charges")
        .select("*")
        .eq("version_id", versionId!)
        .order("charge_type");
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useLeaseReviews(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease-reviews", leaseId],
    enabled: Boolean(leaseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_reviews")
        .select("*")
        .eq("lease_id", leaseId!)
        .order("effective_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useLeaseBreaks(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease-breaks", leaseId],
    enabled: Boolean(leaseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_breaks")
        .select("*")
        .eq("lease_id", leaseId!)
        .order("window_start");
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useLeaseNotices(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease-notices", leaseId],
    enabled: Boolean(leaseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_notices")
        .select("*")
        .eq("lease_id", leaseId!)
        .order("served_on", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useLeaseGuarantors(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease-guarantors", leaseId],
    enabled: Boolean(leaseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_guarantors")
        .select("*")
        .eq("lease_id", leaseId!)
        .order("expiry_date", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useLeaseReminders(companyId: string | undefined) {
  return useQuery({
    queryKey: ["lease-reminders", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_reminders")
        .select("*")
        .eq("company_id", companyId!)
        .eq("status", "pending")
        .order("remind_on");
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

/* --------------------------------------------------------------- tenants */

export type TenantRow = {
  id: string;
  company_id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  trading_name: string | null;
  tax_number: string | null;
  registration_number: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  sector: string | null;
  tenant_type: string;
  status: string;
  notes: string | null;
  archived_at: string | null;
};

export function useTenants(companyId: string | undefined) {
  return useQuery({
    queryKey: ["tenants", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TenantRow[];
    },
  });
}

export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as TenantRow | null;
    },
  });
}

export function useTenantContacts(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-contacts", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_contacts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .is("archived_at", null)
        .order("is_primary", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useTenantLeases(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["leases", "tenant", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_lease_summary")
        .select("*")
        .eq("primary_tenant_id", tenantId!)
        .order("start_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LeaseSummary[];
    },
  });
}

/* ------------------------------------------------- occupancy & rent roll */

export function useRentRoll(companyId: string | undefined) {
  return useQuery({
    queryKey: ["rent-roll", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_rent_roll")
        .select("*")
        .eq("company_id", companyId!)
        .order("property_name")
        .order("unit_code");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as RentRollRow[];
    },
  });
}

export function useUnitOccupancy(companyId: string | undefined) {
  return useQuery({
    queryKey: ["unit-occupancy", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_unit_occupancy")
        .select("*")
        .eq("company_id", companyId!)
        .order("property_name")
        .order("unit_code");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as UnitOccupancyRow[];
    },
  });
}

export function useOccupancyHistory(unitId: string | undefined) {
  return useQuery({
    queryKey: ["occupancy-history", unitId],
    enabled: Boolean(unitId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("occupancy_history")
        .select("*")
        .eq("unit_id", unitId!)
        .order("period_start", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useVacancyPeriods(companyId: string | undefined) {
  return useQuery({
    queryKey: ["vacancy-periods", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacancy_periods")
        .select("*, property_units(code, name), properties(name)")
        .eq("company_id", companyId!)
        .order("vacancy_start", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
}

export function useOccupancyMetrics(companyId: string | undefined) {
  return useQuery({
    queryKey: ["occupancy-metrics", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_occupancy_metrics")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as OccupancyMetrics | null;
    },
  });
}

export function useLeaseExpiryProfile(companyId: string | undefined) {
  return useQuery({
    queryKey: ["lease-expiry-profile", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_lease_expiry_profile")
        .select("*")
        .eq("company_id", companyId!)
        .order("expiry_year");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as {
        expiry_year: number;
        lease_count: number;
        annual_rent_expiring: number | null;
      }[];
    },
  });
}

export function useTenantConcentration(companyId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-concentration", companyId],
    enabled: enabled(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_tenant_concentration")
        .select("*")
        .eq("company_id", companyId!)
        .order("annual_rent", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as {
        tenant_id: string | null;
        tenant_name: string | null;
        lease_count: number;
        unit_count: number;
        annual_rent: number | null;
        rent_share_pct: number | null;
      }[];
    },
  });
}

/** Documents attached to a lease through the unified document model. */
export function useLeaseDocuments(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease-documents", leaseId],
    enabled: Boolean(leaseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_links")
        .select("document_id, documents(id, title, category, issue_date, status)")
        .eq("entity_type", "lease")
        .eq("entity_id", leaseId!);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .map((link) => (link as { documents: unknown }).documents)
        .filter(Boolean) as Row[];
    },
  });
}
