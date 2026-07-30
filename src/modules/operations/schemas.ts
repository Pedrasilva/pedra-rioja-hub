/**
 * Phase 8B — operational obligation contracts.
 *
 * Pure data: the vocabularies and Zod schemas every operational mutation is
 * validated against. These lists mirror the frozen database check constraints.
 *
 * §5C compliance note: nothing in this file describes an expected expenditure,
 * an invoice, a payment or a cash-flow amount. Operational records hold *why*
 * money is expected; the commitment holds *how much*. The one numeric field
 * below — an insurance excess — is a policy term, not a cost.
 */

import { z } from "zod";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

/* ---------------------------------------------------------- vocabulary */

export const OPERATIONAL_ENTITY_TYPES = [
  "operational_obligation",
  "service_contract",
  "insurance_policy",
  "utility_contract",
  "tax_schedule",
] as const;
export type OperationalEntityType = (typeof OPERATIONAL_ENTITY_TYPES)[number];

export const OBLIGATION_TYPES = [
  "insurance_renewal",
  "service_contract",
  "utility_contract",
  "tax_obligation",
  "statutory_compliance",
  "licence_permit",
  "inspection",
  "recurring",
  "other",
] as const;

export const OBLIGATION_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
  "archived",
] as const;

export const OBLIGATION_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const RECURRENCE_FREQUENCIES = [
  "none",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;

export const SERVICE_TYPES = [
  "cleaning",
  "security",
  "lift",
  "hvac",
  "landscaping",
  "waste",
  "property_management",
  "accounting",
  "legal",
  "it",
  "other",
] as const;

export const SERVICE_CONTRACT_STATUSES = [
  "draft",
  "active",
  "expiring",
  "terminated",
  "expired",
  "archived",
] as const;

export const POLICY_TYPES = [
  "buildings",
  "contents",
  "liability",
  "loss_of_rent",
  "construction",
  "directors",
  "legal_expenses",
  "other",
] as const;

export const INSURANCE_STATUSES = [
  "draft",
  "active",
  "expiring",
  "lapsed",
  "cancelled",
  "archived",
] as const;

export const UTILITY_TYPES = [
  "electricity",
  "gas",
  "water",
  "telecom",
  "internet",
  "waste",
  "heating",
  "other",
] as const;

export const UTILITY_STATUSES = ["draft", "active", "suspended", "terminated", "archived"] as const;

export const TAX_TYPES = ["imi", "aimi", "municipal", "service_charge", "stamp_duty", "other"] as const;

export const TAX_SCHEDULE_STATUSES = [
  "draft",
  "active",
  "settled",
  "cancelled",
  "archived",
] as const;

export const REMINDER_REASONS = [
  "obligation_due",
  "contract_expiry",
  "insurance_renewal",
  "inspection_due",
  "licence_expiry",
  "tax_deadline",
  "utility_review",
] as const;

export const REMINDER_STATUSES = ["pending", "acknowledged", "resolved", "dismissed"] as const;

export const REMINDER_SEVERITIES = ["low", "normal", "high", "critical"] as const;

export const OPERATIONAL_LABELS: Record<string, string> = {
  operational_obligation: "Obligation",
  service_contract: "Service contract",
  insurance_policy: "Insurance policy",
  utility_contract: "Utility contract",
  tax_schedule: "Tax schedule",
  insurance_renewal: "Insurance renewal",
  utility_contract_type: "Utility contract",
  tax_obligation: "Tax obligation",
  statutory_compliance: "Statutory compliance",
  licence_permit: "Licence or permit",
  inspection: "Inspection",
  recurring: "Recurring",
  other: "Other",
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
  draft: "Draft",
  active: "Active",
  expiring: "Expiring",
  terminated: "Terminated",
  expired: "Expired",
  lapsed: "Lapsed",
  suspended: "Suspended",
  settled: "Settled",
  scheduled: "Scheduled",
  none: "Does not repeat",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Every six months",
  annual: "Annually",
  cleaning: "Cleaning",
  security: "Security",
  lift: "Lift",
  hvac: "HVAC",
  landscaping: "Landscaping",
  waste: "Waste",
  property_management: "Property management",
  accounting: "Accounting",
  legal: "Legal",
  it: "IT",
  buildings: "Buildings",
  contents: "Contents",
  liability: "Liability",
  loss_of_rent: "Loss of rent",
  construction: "Construction",
  directors: "Directors and officers",
  legal_expenses: "Legal expenses",
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
  telecom: "Telecom",
  internet: "Internet",
  heating: "Heating",
  imi: "IMI",
  aimi: "AIMI",
  municipal: "Municipal charge",
  service_charge: "Service charge",
  stamp_duty: "Stamp duty",
  obligation_due: "Obligation due",
  contract_expiry: "Contract expiry",
  inspection_due: "Inspection due",
  licence_expiry: "Licence expiry",
  tax_deadline: "Tax deadline",
  utility_review: "Utility review",
  pending: "Pending",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  dismissed: "Dismissed",
  low: "Low",
  normal: "Normal",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
  critical: "Critical",
};

export function operationalLabel(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  return (
    OPERATIONAL_LABELS[value] ??
    value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Archived operational records are read-only; the database enforces it too. */
export function isOperationalEditable(row: { archived_at?: string | null } | null | undefined) {
  return Boolean(row) && !row?.archived_at;
}

/* ------------------------------------------------------------- schemas */

const text = (max: number) => z.string().trim().max(max).nullish();

export const obligationCreateSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "A title is required"),
  obligationType: z.enum(OBLIGATION_TYPES).default("other"),
  description: text(2000),
  priority: z.enum(OBLIGATION_PRIORITIES).default("medium"),
  dueDate: isoDate.nullish(),
  responsibleName: text(120),
  counterpartyId: uuid.nullish(),
  propertyId: uuid.nullish(),
  reminderLeadDays: z.coerce.number().int().min(0).max(365).default(30),
  recurrenceFrequency: z.enum(RECURRENCE_FREQUENCIES).default("none"),
  recurrenceInterval: z.coerce.number().int().min(1).max(60).default(1),
  recurrenceEndDate: isoDate.nullish(),
  commitmentId: uuid.nullish(),
  code: text(40),
  notes: text(2000),
});

export const obligationUpdateSchema = obligationCreateSchema
  .omit({ companyId: true, commitmentId: true, code: true })
  .partial()
  .extend({
    obligationId: uuid,
    status: z.enum(OBLIGATION_STATUSES).optional(),
  });

export const serviceContractCreateSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "A title is required"),
  serviceType: z.enum(SERVICE_TYPES).default("other"),
  counterpartyId: uuid.nullish(),
  contractNumber: text(80),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
  renewalTerms: text(1000),
  noticePeriodDays: z.coerce.number().int().min(0).max(730).nullish(),
  autoRenew: z.boolean().default(false),
  obligationId: uuid.nullish(),
  commitmentId: uuid.nullish(),
  propertyId: uuid.nullish(),
  reminderLeadDays: z.coerce.number().int().min(0).max(365).default(60),
  code: text(40),
  notes: text(2000),
});

export const serviceContractUpdateSchema = serviceContractCreateSchema
  .omit({ companyId: true, commitmentId: true, code: true, propertyId: true })
  .partial()
  .extend({
    contractId: uuid,
    status: z.enum(SERVICE_CONTRACT_STATUSES).optional(),
  });

export const insurancePolicyCreateSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "A title is required"),
  policyType: z.enum(POLICY_TYPES).default("other"),
  insurerCounterpartyId: uuid.nullish(),
  insurerName: text(160),
  brokerCounterpartyId: uuid.nullish(),
  brokerName: text(160),
  policyNumber: text(80),
  insuredAssets: text(1000),
  propertyId: uuid.nullish(),
  effectiveDate: isoDate.nullish(),
  expiryDate: isoDate.nullish(),
  /** Policy term, not an expected cost — premiums live on the commitment. */
  excessAmount: z.coerce.number().min(0).nullish(),
  obligationId: uuid.nullish(),
  commitmentId: uuid.nullish(),
  reminderLeadDays: z.coerce.number().int().min(0).max(365).default(45),
  code: text(40),
  notes: text(2000),
});

export const insurancePolicyUpdateSchema = insurancePolicyCreateSchema
  .omit({ companyId: true, commitmentId: true, code: true })
  .partial()
  .extend({
    policyId: uuid,
    status: z.enum(INSURANCE_STATUSES).optional(),
  });

export const utilityContractCreateSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "A title is required"),
  utilityType: z.enum(UTILITY_TYPES).default("other"),
  counterpartyId: uuid.nullish(),
  accountNumber: text(80),
  meterIdentifier: text(80),
  serviceAddress: text(400),
  propertyId: uuid.nullish(),
  unitId: uuid.nullish(),
  activationDate: isoDate.nullish(),
  terminationDate: isoDate.nullish(),
  obligationId: uuid.nullish(),
  commitmentId: uuid.nullish(),
  reminderLeadDays: z.coerce.number().int().min(0).max(365).default(30),
  code: text(40),
  notes: text(2000),
});

export const utilityContractUpdateSchema = utilityContractCreateSchema
  .omit({ companyId: true, commitmentId: true, code: true })
  .partial()
  .extend({
    contractId: uuid,
    status: z.enum(UTILITY_STATUSES).optional(),
  });

export const taxScheduleCreateSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "A title is required"),
  taxType: z.enum(TAX_TYPES).default("other"),
  jurisdiction: text(120),
  reference: text(80),
  taxYear: z.coerce.number().int().min(1900).max(2200).nullish(),
  propertyId: uuid.nullish(),
  obligationId: uuid.nullish(),
  commitmentId: uuid.nullish(),
  reminderLeadDays: z.coerce.number().int().min(0).max(365).default(21),
  code: text(40),
  notes: text(2000),
  dueDates: z.array(isoDate).default([]),
});

export const taxScheduleUpdateSchema = taxScheduleCreateSchema
  .omit({ companyId: true, commitmentId: true, code: true, dueDates: true })
  .partial()
  .extend({
    scheduleId: uuid,
    status: z.enum(TAX_SCHEDULE_STATUSES).optional(),
  });

export const taxScheduleDateSchema = z.object({
  scheduleId: uuid,
  dueDate: isoDate,
  label: text(120),
  reminderDate: isoDate.nullish(),
  notes: text(1000),
});

export const archiveOperationalSchema = z.object({
  entityType: z.enum(OPERATIONAL_ENTITY_TYPES),
  entityId: uuid,
  reason: z.string().trim().min(3, "An archive reason is required"),
});

export const linkCommitmentSchema = z.object({
  entityType: z.enum(OPERATIONAL_ENTITY_TYPES),
  entityId: uuid,
  commitmentId: uuid.nullable(),
});

export const operationalCommitmentSchema = z.object({
  entityType: z.enum(OPERATIONAL_ENTITY_TYPES),
  entityId: uuid,
  title: z.string().trim().min(2, "A title is required"),
  commitmentType: z.string().trim().min(2),
  authorisedAmount: z.coerce.number().min(0, "The authorised amount cannot be negative"),
  currency: z.string().trim().length(3).default("EUR"),
  counterpartyId: uuid.nullish(),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
  notes: text(2000),
});

export const reminderUpsertSchema = z.object({
  companyId: uuid,
  entityType: z.enum(OPERATIONAL_ENTITY_TYPES),
  entityId: uuid,
  reason: z.enum(REMINDER_REASONS),
  remindOn: isoDate,
  dueOn: isoDate.nullish(),
  severity: z.enum(REMINDER_SEVERITIES).default("normal"),
  title: text(200),
  notes: text(1000),
});

export const reminderResolveSchema = z.object({
  reminderId: uuid,
  status: z.enum(REMINDER_STATUSES).default("resolved"),
  notes: text(1000),
});

export const generateRemindersSchema = z.object({ companyId: uuid });

/* ------------------------------------------------------------- helpers */

/** The commitment type each operational register naturally authorises. */
export const DEFAULT_COMMITMENT_TYPE: Record<OperationalEntityType, string> = {
  operational_obligation: "other",
  service_contract: "service_contract",
  insurance_policy: "insurance",
  utility_contract: "utility",
  tax_schedule: "tax_instalment",
};

/** Presentation-only urgency banding for a countdown in days. */
export function urgencyOf(days: number | null | undefined) {
  if (days === null || days === undefined) return "none" as const;
  if (days < 0) return "overdue" as const;
  if (days <= 14) return "critical" as const;
  if (days <= 45) return "soon" as const;
  return "later" as const;
}

export function countdownLabel(days: number | null | undefined) {
  if (days === null || days === undefined) return "—";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  return `in ${days} days`;
}
