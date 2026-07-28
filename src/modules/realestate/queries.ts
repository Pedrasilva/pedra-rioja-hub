import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PropertyRow = {
  id: string;
  company_id: string;
  code: string | null;
  name: string;
  property_type: string;
  status: string;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  district: string | null;
  parish: string | null;
  country_code: string;
  area_m2: number | null;
  gross_area_m2: number | null;
  year_built: number | null;
  acquisition_date: string | null;
  disposal_date: string | null;
  matrix_article: string | null;
  land_registry_ref: string | null;
  conservatoria: string | null;
  drive_folder_url: string | null;
  drive_folder_id: string | null;
  notes: string | null;
};

const PROPERTY_COLUMNS =
  "id, company_id, code, name, property_type, status, address_line1, address_line2, postal_code, city, district, parish, country_code, area_m2, gross_area_m2, year_built, acquisition_date, disposal_date, matrix_article, land_registry_ref, conservatoria, drive_folder_url, drive_folder_id, notes";

export function fullAddress(p: Partial<PropertyRow> | null | undefined) {
  if (!p) return "";
  return [p.address_line1, p.address_line2, [p.postal_code, p.city].filter(Boolean).join(" "), p.district]
    .filter(Boolean)
    .join(", ");
}

/** Register data: base rows joined client-side with the derived summary view. */
export function usePropertyRegister(companyId?: string) {
  return useQuery({
    queryKey: ["property-register", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [{ data: properties, error }, { data: summaries, error: sErr }, { data: projects, error: pErr }, { data: tenancies, error: tErr }] =
        await Promise.all([
          supabase
            .from("properties")
            .select(PROPERTY_COLUMNS)
            .eq("company_id", companyId!)
            .is("deleted_at", null)
            .order("code", { ascending: true }),
          supabase.from("v_property_summary").select("*").eq("company_id", companyId!),
          supabase
            .from("capex_projects")
            .select("id, property_id, name, status")
            .eq("company_id", companyId!)
            .is("deleted_at", null),
          supabase
            .from("tenancy_agreements")
            .select("id, property_id, status, base_rent, tenant_id, tenants(name)")
            .eq("company_id", companyId!)
            .is("deleted_at", null),
        ]);
      if (error) throw error;
      if (sErr) throw sErr;
      if (pErr) throw pErr;
      if (tErr) throw tErr;

      const byId = new Map((summaries ?? []).map((s) => [s.property_id as string, s]));
      return (properties ?? []).map((p) => {
        const activeTenancy = (tenancies ?? []).find(
          (t) => t.property_id === p.id && t.status === "active",
        );
        return {
          ...(p as PropertyRow),
          summary: byId.get(p.id) ?? null,
          activeProjects: (projects ?? []).filter(
            (pr) => pr.property_id === p.id && ["planned", "active", "in_progress"].includes(pr.status),
          ).length,
          activeTenantName:
            (activeTenancy?.tenants as { name: string } | null)?.name ?? null,
        };
      });
    },
  });
}

export type RegisterProperty = NonNullable<ReturnType<typeof usePropertyRegister>["data"]>[number];

export function useProperty(propertyId: string) {
  return useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const [{ data: property, error }, { data: summary, error: sErr }] = await Promise.all([
        supabase.from("properties").select(PROPERTY_COLUMNS).eq("id", propertyId).maybeSingle(),
        supabase.from("v_property_summary").select("*").eq("property_id", propertyId).maybeSingle(),
      ]);
      if (error) throw error;
      if (sErr) throw sErr;
      return { property: (property as PropertyRow) ?? null, summary: summary ?? null };
    },
  });
}

export function usePropertyUnits(propertyId: string) {
  return useQuery({
    queryKey: ["property-units", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_units")
        .select("*")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePropertyTenancies(propertyId: string) {
  return useQuery({
    queryKey: ["property-tenancies", propertyId],
    queryFn: async () => {
      const [{ data, error }, { data: loans, error: lErr }] = await Promise.all([
        supabase
          .from("tenancy_agreements")
          .select(
            "id, code, unit_id, start_date, end_date, base_rent, currency, vat_applicable, payment_frequency, status, tenant_id, tenants(name), property_units(code, name)",
          )
          .eq("property_id", propertyId)
          .is("deleted_at", null)
          .order("start_date", { ascending: false }),
        supabase
          .from("tenant_fitout_loans")
          .select("id, tenancy_id, code, principal, currency, status")
          .eq("property_id", propertyId)
          .is("deleted_at", null),
      ]);
      if (error) throw error;
      if (lErr) throw lErr;
      return (data ?? []).map((t) => ({
        ...t,
        fitoutLoan: (loans ?? []).find((l) => l.tenancy_id === t.id) ?? null,
      }));
    },
  });
}

export function usePropertyFinancing(propertyId: string) {
  return useQuery({
    queryKey: ["property-financing", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_agreements")
        .select("*")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false });
      if (error) throw error;

      const ids = (data ?? []).map((a) => a.id);
      if (!ids.length) return [] as Array<(typeof data)[number] & { outstanding: number | null; versionCount: number }>;

      const { data: versions } = await supabase
        .from("financing_schedule_versions")
        .select("id, agreement_id, version_no, is_current")
        .in("agreement_id", ids);

      const currentIds = (versions ?? []).filter((v) => v.is_current).map((v) => v.id);
      const { data: rows } = currentIds.length
        ? await supabase
            .from("financing_schedule_rows")
            .select("version_id, due_date, period_no, closing_balance")
            .in("version_id", currentIds)
            .lte("due_date", new Date().toISOString().slice(0, 10))
            .order("due_date", { ascending: false })
        : { data: [] as Array<{ version_id: string; due_date: string; period_no: number; closing_balance: number }> };

      return (data ?? []).map((a) => {
        const current = (versions ?? []).find((v) => v.agreement_id === a.id && v.is_current);
        const row = current ? (rows ?? []).find((r) => r.version_id === current.id) : undefined;
        return {
          ...a,
          outstanding: row ? Number(row.closing_balance) : (a.principal ?? null),
          versionCount: (versions ?? []).filter((v) => v.agreement_id === a.id).length,
        };
      });
    },
  });
}

export function usePropertyProjects(propertyId: string) {
  return useQuery({
    queryKey: ["property-projects", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capex_projects")
        .select("*")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false });
      if (error) throw error;

      const ids = (data ?? []).map((p) => p.id);
      const { data: costs } = ids.length
        ? await supabase
            .from("capex_project_costs")
            .select("project_id, amount, is_capitalised")
            .in("project_id", ids)
            .is("deleted_at", null)
        : { data: [] as Array<{ project_id: string; amount: number; is_capitalised: boolean }> };

      return (data ?? []).map((p) => {
        const actual = (costs ?? [])
          .filter((c) => c.project_id === p.id)
          .reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
        return { ...p, actualCost: actual };
      });
    },
  });
}

export function usePropertyValuations(propertyId: string) {
  return useQuery({
    queryKey: ["property-valuations", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_valuations")
        .select("*")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("valuation_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePropertyInsurance(propertyId: string) {
  return useQuery({
    queryKey: ["property-insurance", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_insurance_policies")
        .select("*")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("renewal_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePropertyDepreciation(propertyId: string) {
  return useQuery({
    queryKey: ["property-depreciation", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depreciation_assets")
        .select("*")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("in_service_date", { ascending: false });
      if (error) throw error;

      const ids = (data ?? []).map((a) => a.id);
      const { data: entries } = ids.length
        ? await supabase
            .from("depreciation_entries")
            .select("asset_id, period_start, period_end, amount, accumulated_amount, status")
            .in("asset_id", ids)
            .order("period_start", { ascending: false })
        : { data: [] as Array<{ asset_id: string; period_start: string; period_end: string; amount: number; accumulated_amount: number; status: string }> };

      return { assets: data ?? [], entries: entries ?? [] };
    },
  });
}

export function usePropertyDocuments(propertyId: string) {
  return useQuery({
    queryKey: ["property-documents", propertyId],
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from("document_links")
        .select("document_id, entity_type, relation")
        .eq("entity_type", "properties")
        .eq("entity_id", propertyId);
      if (error) throw error;

      const ids = (links ?? []).map((l) => l.document_id);
      if (!ids.length) return [];
      const { data: docs, error: dErr } = await supabase
        .from("documents")
        .select(
          "id, title, category, subcategory, doc_type, status, issue_date, expiry_date, version, sync_status, original_filename, drive_url, tags",
        )
        .in("id", ids)
        .is("deleted_at", null)
        .order("issue_date", { ascending: false });
      if (dErr) throw dErr;
      return docs ?? [];
    },
  });
}

export function usePropertyDriveFolders(propertyId: string) {
  return useQuery({
    queryKey: ["property-drive-folders", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drive_folders")
        .select("id, folder_kind, path, drive_url, sync_status")
        .eq("entity_type", "properties")
        .eq("entity_id", propertyId)
        .order("path");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePropertyTimeline(propertyId: string) {
  return useQuery({
    queryKey: ["property-timeline", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_property_timeline")
        .select("*")
        .eq("property_id", propertyId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
