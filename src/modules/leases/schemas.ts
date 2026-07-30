/**
 * Phase 8E — lease, tenant and occupancy contracts.
 *
 * Leases are OPERATIONAL records. Nothing in this file describes a payment,
 * an invoice, a bank movement or a commitment: rent and charge figures are
 * contract terms, and every reported financial figure is derived in the
 * database views.
 */

import { z } from "zod";

export const LEASE_TYPES = [
  { value: "commercial", label: "Commercial" },
  { value: "retail", label: "Retail" },
  { value: "office", label: "Office" },
  { value: "industrial", label: "Industrial" },
  { value: "residential", label: "Residential" },
  { value: "parking", label: "Parking" },
  { value: "storage", label: "Storage" },
  { value: "other", label: "Other" },
] as const;

export const LEASE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "negotiation", label: "Negotiation" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "renewed", label: "Renewed" },
  { value: "terminated", label: "Terminated" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
] as const;

export const PAYMENT_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semi-annual" },
  { value: "annual", label: "Annual" },
] as const;

export const INDEXATION_TYPES = [
  { value: "none", label: "None" },
  { value: "ipc", label: "IPC" },
  { value: "cpi", label: "CPI" },
  { value: "fixed_pct", label: "Fixed %" },
  { value: "open_market", label: "Open market" },
  { value: "negotiated", label: "Negotiated" },
] as const;

export const CHARGE_TYPES = [
  { value: "base_rent", label: "Base rent" },
  { value: "service_charge", label: "Service charge" },
  { value: "insurance_recharge", label: "Insurance recharge" },
  { value: "utilities_recharge", label: "Utilities recharge" },
  { value: "parking", label: "Parking" },
  { value: "storage", label: "Storage" },
  { value: "marketing", label: "Marketing" },
  { value: "turnover_rent", label: "Turnover rent" },
  { value: "other", label: "Other" },
] as const;

export const REVIEW_TYPES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "manual", label: "Manual" },
  { value: "indexation", label: "Indexation" },
  { value: "open_market", label: "Open market" },
  { value: "stepped", label: "Stepped" },
] as const;

export const REVIEW_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "proposed", label: "Proposed" },
  { value: "agreed", label: "Agreed" },
  { value: "rejected", label: "Rejected" },
  { value: "applied", label: "Applied" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const BREAK_TYPES = [
  { value: "tenant", label: "Tenant break" },
  { value: "landlord", label: "Landlord break" },
  { value: "mutual", label: "Mutual break" },
] as const;

export const BREAK_STATUSES = [
  { value: "open", label: "Open" },
  { value: "notice_served", label: "Notice served" },
  { value: "exercised", label: "Exercised" },
  { value: "lapsed", label: "Lapsed" },
  { value: "waived", label: "Waived" },
] as const;

export const NOTICE_TYPES = [
  { value: "renewal", label: "Renewal" },
  { value: "termination", label: "Termination" },
  { value: "break", label: "Break" },
  { value: "rent_review", label: "Rent review" },
  { value: "default", label: "Default" },
  { value: "general", label: "General" },
] as const;

export const OCCUPANCY_STATUSES = [
  { value: "occupied", label: "Occupied" },
  { value: "vacant", label: "Vacant" },
  { value: "reserved", label: "Reserved" },
  { value: "under_offer", label: "Under offer" },
  { value: "under_refurbishment", label: "Under refurbishment" },
  { value: "unavailable", label: "Unavailable" },
] as const;

export const MARKETING_STATUSES = [
  { value: "not_marketed", label: "Not marketed" },
  { value: "preparing", label: "Preparing" },
  { value: "marketed", label: "Marketed" },
  { value: "under_offer", label: "Under offer" },
  { value: "let_agreed", label: "Let agreed" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export const VACANCY_REASONS = [
  { value: "lease_ended", label: "Lease ended" },
  { value: "termination", label: "Termination" },
  { value: "break_exercised", label: "Break exercised" },
  { value: "refurbishment", label: "Refurbishment" },
  { value: "new_build", label: "New build" },
  { value: "strategic", label: "Strategic" },
  { value: "other", label: "Other" },
] as const;

const uuid = z.string().uuid();
const optionalText = z.string().trim().min(1).optional();
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date")
  .optional();
const money = z.number().finite().optional();

/* -------------------------------------------------------------- tenants */

export const tenantSchema = z.object({
  id: uuid.optional(),
  companyId: uuid,
  name: z.string().trim().min(1, "A tenant name is required"),
  code: optionalText,
  legalName: optionalText,
  tradingName: optionalText,
  taxNumber: optionalText,
  registrationNumber: optionalText,
  email: optionalText,
  phone: optionalText,
  website: optionalText,
  address: optionalText,
  sector: optionalText,
  tenantType: z.enum(["company", "individual"]).optional(),
  status: z.enum(["prospect", "active", "former", "blacklisted"]).optional(),
  notes: optionalText,
});
export type TenantInput = z.infer<typeof tenantSchema>;

export const tenantContactSchema = z.object({
  id: uuid.optional(),
  companyId: uuid,
  tenantId: uuid,
  name: z.string().trim().min(1, "A contact name is required"),
  role: optionalText,
  email: optionalText,
  phone: optionalText,
  isPrimary: z.boolean().optional(),
  notes: optionalText,
});
export type TenantContactInput = z.infer<typeof tenantContactSchema>;

export const archiveTenantSchema = z.object({ tenantId: uuid, reason: optionalText });

/* --------------------------------------------------------------- leases */

export const leaseCreateSchema = z.object({
  companyId: uuid,
  propertyId: uuid,
  code: optionalText,
  title: optionalText,
  primaryTenantId: uuid.optional(),
  leaseType: z.string().optional(),
  status: z.string().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  isOpenEnded: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  baseRent: money,
  serviceCharge: money,
  paymentFrequency: z.string().optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
  vatApplicable: z.boolean().optional(),
  indexationType: z.string().optional(),
  indexationIndex: optionalText,
  indexationMonth: z.number().int().min(1).max(12).optional(),
  indexationPct: z.number().optional(),
  reviewCycleMonths: z.number().int().positive().optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
  depositAmount: money,
  depositReference: optionalText,
  depositExpiryDate: optionalDate,
  notes: optionalText,
});
export type LeaseCreateInput = z.infer<typeof leaseCreateSchema>;

export const leaseUpdateSchema = z.object({
  leaseId: uuid,
  code: optionalText,
  title: optionalText,
  leaseType: z.string().optional(),
  status: z.string().optional(),
  primaryTenantId: uuid.optional(),
  notes: optionalText,
});

export const leaseVersionUpdateSchema = z.object({
  versionId: uuid,
  effectiveFrom: optionalDate,
  startDate: optionalDate,
  endDate: optionalDate,
  isOpenEnded: z.boolean().optional(),
  baseRent: money,
  serviceCharge: money,
  paymentFrequency: z.string().optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
  vatApplicable: z.boolean().optional(),
  indexationType: z.string().optional(),
  indexationIndex: optionalText,
  indexationMonth: z.number().int().min(1).max(12).optional(),
  indexationPct: z.number().optional(),
  reviewCycleMonths: z.number().int().positive().optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
  depositAmount: money,
  depositReference: optionalText,
  depositExpiryDate: optionalDate,
  notes: optionalText,
});

export const leaseVersionCreateSchema = z.object({
  leaseId: uuid,
  versionReason: z
    .enum(["renewal", "variation", "rent_review", "regularisation", "correction"])
    .optional(),
  effectiveFrom: optionalDate,
  startDate: optionalDate,
  endDate: optionalDate,
  baseRent: money,
  serviceCharge: money,
  paymentFrequency: z.string().optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
  notes: optionalText,
});

export const versionIdSchema = z.object({ versionId: uuid });

export const leaseUnitsSchema = z.object({
  versionId: uuid,
  units: z.array(
    z.object({
      unitId: uuid.optional(),
      demiseLabel: optionalText,
      areaM2: z.number().optional(),
      apportionmentPct: z.number().min(0).max(100).optional(),
      notes: optionalText,
    }),
  ),
});

export const leaseTenantsSchema = z.object({
  versionId: uuid,
  tenants: z.array(
    z.object({
      tenantId: uuid,
      isPrimary: z.boolean().optional(),
      sharePct: z.number().min(0).max(100).optional(),
      role: z.enum(["tenant", "co_tenant", "occupier", "assignee"]).optional(),
    }),
  ),
});

export const leaseChargesSchema = z.object({
  versionId: uuid,
  charges: z.array(
    z.object({
      chargeType: z.string(),
      label: optionalText,
      amount: z.number(),
      frequency: z.string().optional(),
      vatApplicable: z.boolean().optional(),
      vatRate: z.number().optional(),
      startDate: optionalDate,
      endDate: optionalDate,
      notes: optionalText,
    }),
  ),
});

export const leaseReviewSchema = z.object({
  id: uuid.optional(),
  leaseId: uuid,
  reviewType: z.string().optional(),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  indexName: optionalText,
  indexValue: z.number().optional(),
  indexPct: z.number().optional(),
  currentRent: money,
  proposedRent: money,
  agreedRent: money,
  status: z.string().optional(),
  notes: optionalText,
});

export const applyReviewSchema = z.object({ reviewId: uuid });

export const leaseBreakSchema = z.object({
  id: uuid.optional(),
  leaseId: uuid,
  breakType: z.string().optional(),
  windowStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  windowEnd: optionalDate,
  noticeDays: z.number().int().min(0).optional(),
  status: z.string().optional(),
  conditions: optionalText,
  notes: optionalText,
});

export const leaseNoticeSchema = z.object({
  leaseId: uuid,
  noticeType: z.enum(["renewal", "termination", "break", "rent_review", "default", "general"]),
  servedBy: z.enum(["landlord", "tenant"]).optional(),
  servedOn: optionalDate,
  effectiveDate: optionalDate,
  reference: optionalText,
  summary: optionalText,
  breakId: uuid.optional(),
});

export const terminateLeaseSchema = z.object({
  leaseId: uuid,
  terminationDate: optionalDate,
  status: z.enum(["terminated", "expired"]).optional(),
  reason: optionalText,
});

export const archiveLeaseSchema = z.object({ leaseId: uuid, reason: optionalText });

export const remindersSchema = z.object({
  companyId: uuid,
  horizonDays: z.number().int().positive().max(1825).optional(),
});

/* ------------------------------------------------------- occupancy */

export const occupancySchema = z.object({
  companyId: uuid,
  propertyId: uuid,
  unitId: uuid,
  status: z.enum([
    "occupied",
    "vacant",
    "reserved",
    "under_offer",
    "under_refurbishment",
    "unavailable",
  ]),
  leaseId: uuid.optional(),
  tenantId: uuid.optional(),
  periodStart: optionalDate,
  reason: optionalText,
  vacancyReason: z.string().optional(),
  marketingStatus: z.string().optional(),
  targetRent: money,
  targetOccupationDate: optionalDate,
  notes: optionalText,
});

export const vacancyUpdateSchema = z.object({
  id: uuid,
  marketingStatus: z.string().optional(),
  reason: z.string().optional(),
  targetRent: money,
  targetOccupationDate: optionalDate,
  vacancyEnd: optionalDate,
  notes: optionalText,
});
