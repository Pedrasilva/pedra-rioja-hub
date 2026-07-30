/**
 * Phase 8E — lease, tenant and occupancy server functions.
 *
 * Thin wrappers only. Every write lands on a SECURITY DEFINER database
 * contract that owns lease versioning, immutability, occupancy transitions
 * and reminder generation. No function here creates a commitment, a
 * bookkeeping document, a bank transaction or a cash-flow entry.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { compact } from "@/modules/leases/payload";
import {
  applyReviewSchema,
  archiveLeaseSchema,
  archiveTenantSchema,
  leaseBreakSchema,
  leaseChargesSchema,
  leaseCreateSchema,
  leaseNoticeSchema,
  leaseReviewSchema,
  leaseTenantsSchema,
  leaseUnitsSchema,
  leaseUpdateSchema,
  leaseVersionCreateSchema,
  leaseVersionUpdateSchema,
  occupancySchema,
  remindersSchema,
  tenantContactSchema,
  tenantSchema,
  terminateLeaseSchema,
  vacancyUpdateSchema,
  versionIdSchema,
} from "@/modules/leases/schemas";

export const upsertTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tenantSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("upsert_tenant_record", {
      p: compact({
        id: data.id,
        company_id: data.companyId,
        name: data.name,
        code: data.code,
        legal_name: data.legalName,
        trading_name: data.tradingName,
        tax_number: data.taxNumber,
        registration_number: data.registrationNumber,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        sector: data.sector,
        tenant_type: data.tenantType,
        status: data.status,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const upsertTenantContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tenantContactSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("upsert_tenant_contact", {
      p: compact({
        id: data.id,
        company_id: data.companyId,
        tenant_id: data.tenantId,
        name: data.name,
        role: data.role,
        email: data.email,
        phone: data.phone,
        is_primary: data.isPrimary,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const archiveTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveTenantSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_tenant_record", {
      p_tenant_id: data.tenantId,
      p_reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.tenantId };
  });

export const createLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_lease", {
      p: compact({
        company_id: data.companyId,
        property_id: data.propertyId,
        code: data.code,
        title: data.title,
        primary_tenant_id: data.primaryTenantId,
        lease_type: data.leaseType,
        status: data.status,
        start_date: data.startDate,
        end_date: data.endDate,
        is_open_ended: data.isOpenEnded,
        currency: data.currency,
        base_rent: data.baseRent,
        service_charge: data.serviceCharge,
        payment_frequency: data.paymentFrequency,
        payment_day: data.paymentDay,
        vat_applicable: data.vatApplicable,
        indexation_type: data.indexationType,
        indexation_index: data.indexationIndex,
        indexation_month: data.indexationMonth,
        indexation_pct: data.indexationPct,
        review_cycle_months: data.reviewCycleMonths,
        notice_period_days: data.noticePeriodDays,
        deposit_amount: data.depositAmount,
        deposit_reference: data.depositReference,
        deposit_expiry_date: data.depositExpiryDate,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_lease", {
      p: compact({
        lease_id: data.leaseId,
        code: data.code,
        title: data.title,
        lease_type: data.leaseType,
        status: data.status,
        primary_tenant_id: data.primaryTenantId,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: data.leaseId };
  });

export const updateLeaseVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseVersionUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_lease_version", {
      p: compact({
        version_id: data.versionId,
        effective_from: data.effectiveFrom,
        start_date: data.startDate,
        end_date: data.endDate,
        is_open_ended: data.isOpenEnded,
        base_rent: data.baseRent,
        service_charge: data.serviceCharge,
        payment_frequency: data.paymentFrequency,
        payment_day: data.paymentDay,
        vat_applicable: data.vatApplicable,
        indexation_type: data.indexationType,
        indexation_index: data.indexationIndex,
        indexation_month: data.indexationMonth,
        indexation_pct: data.indexationPct,
        review_cycle_months: data.reviewCycleMonths,
        notice_period_days: data.noticePeriodDays,
        deposit_amount: data.depositAmount,
        deposit_reference: data.depositReference,
        deposit_expiry_date: data.depositExpiryDate,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: data.versionId };
  });

export const createLeaseVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseVersionCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_lease_version", {
      p: compact({
        lease_id: data.leaseId,
        version_reason: data.versionReason,
        effective_from: data.effectiveFrom,
        start_date: data.startDate,
        end_date: data.endDate,
        base_rent: data.baseRent,
        service_charge: data.serviceCharge,
        payment_frequency: data.paymentFrequency,
        notice_period_days: data.noticePeriodDays,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const activateLeaseVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => versionIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("activate_lease_version", {
      p_version_id: data.versionId,
    });
    if (error) throw new Error(error.message);
    return { id: data.versionId };
  });

export const setLeaseUnits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseUnitsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_lease_units", {
      p_version_id: data.versionId,
      p_units: data.units.map((u) =>
        compact({
          unit_id: u.unitId,
          demise_label: u.demiseLabel,
          area_m2: u.areaM2,
          apportionment_pct: u.apportionmentPct,
          notes: u.notes,
        }),
      ) as never,
    });
    if (error) throw new Error(error.message);
    return { id: data.versionId };
  });

export const setLeaseTenants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseTenantsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_lease_tenants", {
      p_version_id: data.versionId,
      p_tenants: data.tenants.map((t) =>
        compact({
          tenant_id: t.tenantId,
          is_primary: t.isPrimary,
          share_pct: t.sharePct,
          role: t.role,
        }),
      ) as never,
    });
    if (error) throw new Error(error.message);
    return { id: data.versionId };
  });

export const setLeaseCharges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseChargesSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_lease_charges", {
      p_version_id: data.versionId,
      p_charges: data.charges.map((c) =>
        compact({
          charge_type: c.chargeType,
          label: c.label,
          amount: c.amount,
          frequency: c.frequency,
          vat_applicable: c.vatApplicable,
          vat_rate: c.vatRate,
          start_date: c.startDate,
          end_date: c.endDate,
          notes: c.notes,
        }),
      ) as never,
    });
    if (error) throw new Error(error.message);
    return { id: data.versionId };
  });

export const upsertLeaseReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("upsert_lease_review", {
      p: compact({
        id: data.id,
        lease_id: data.leaseId,
        review_type: data.reviewType,
        review_date: data.reviewDate,
        effective_date: data.effectiveDate,
        index_name: data.indexName,
        index_value: data.indexValue,
        index_pct: data.indexPct,
        current_rent: data.currentRent,
        proposed_rent: data.proposedRent,
        agreed_rent: data.agreedRent,
        status: data.status,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const applyLeaseReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => applyReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("apply_lease_review", {
      p_review_id: data.reviewId,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const upsertLeaseBreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseBreakSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("upsert_lease_break", {
      p: compact({
        id: data.id,
        lease_id: data.leaseId,
        break_type: data.breakType,
        window_start: data.windowStart,
        window_end: data.windowEnd,
        notice_days: data.noticeDays,
        status: data.status,
        conditions: data.conditions,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const recordLeaseNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leaseNoticeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("record_lease_notice", {
      p: compact({
        lease_id: data.leaseId,
        notice_type: data.noticeType,
        served_by: data.servedBy,
        served_on: data.servedOn,
        effective_date: data.effectiveDate,
        reference: data.reference,
        summary: data.summary,
        break_id: data.breakId,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const terminateLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => terminateLeaseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("terminate_lease", {
      p: compact({
        lease_id: data.leaseId,
        termination_date: data.terminationDate,
        status: data.status,
        reason: data.reason,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: data.leaseId };
  });

export const archiveLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveLeaseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_lease", {
      p_lease_id: data.leaseId,
      p_reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.leaseId };
  });

export const setUnitOccupancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => occupancySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("set_unit_occupancy", {
      p: compact({
        company_id: data.companyId,
        property_id: data.propertyId,
        unit_id: data.unitId,
        status: data.status,
        lease_id: data.leaseId,
        tenant_id: data.tenantId,
        period_start: data.periodStart,
        reason: data.reason,
        vacancy_reason: data.vacancyReason,
        marketing_status: data.marketingStatus,
        target_rent: data.targetRent,
        target_occupation_date: data.targetOccupationDate,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateVacancyPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => vacancyUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_vacancy_period", {
      p: compact({
        id: data.id,
        marketing_status: data.marketingStatus,
        reason: data.reason,
        target_rent: data.targetRent,
        target_occupation_date: data.targetOccupationDate,
        vacancy_end: data.vacancyEnd,
        notes: data.notes,
      }) as never,
    });
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const generateLeaseReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => remindersSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: count, error } = await context.supabase.rpc("generate_lease_reminders", {
      p_company_id: data.companyId,
      p_horizon_days: data.horizonDays ?? 365,
    });
    if (error) throw new Error(error.message);
    return { generated: (count as number) ?? 0 };
  });
