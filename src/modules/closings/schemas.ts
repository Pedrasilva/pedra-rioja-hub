/**
 * Phase 8F.4 — closing & handover contracts.
 *
 * A closing case orchestrates the hand-over of an accepted deal into a
 * managed property. `agreedPrice` is an indicative reference for the deal
 * conversation only: the authoritative amount lives on the commitment and on
 * the posted financial documents. Nothing here posts a journal, creates a
 * commitment, writes a cash-flow entry, records a payment or touches a bank
 * transaction (§5C, §5D).
 */

import { z } from "zod";

export const CLOSING_STATUSES = [
  { value: "preparing", label: "Preparing" },
  { value: "conditions_pending", label: "Conditions pending" },
  { value: "ready_to_close", label: "Ready to close" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const HANDOVER_STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
] as const;

export const CONDITION_CATEGORIES = [
  { value: "legal", label: "Legal" },
  { value: "financial", label: "Financial" },
  { value: "technical", label: "Technical" },
  { value: "regulatory", label: "Regulatory" },
  { value: "tax", label: "Tax" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
] as const;

export const RESPONSIBLE_PARTIES = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "notary", label: "Notary" },
  { value: "lender", label: "Lender" },
  { value: "broker", label: "Broker" },
  { value: "other", label: "Other" },
] as const;

export const CONDITION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "satisfied", label: "Satisfied" },
  { value: "waived", label: "Waived" },
  { value: "failed", label: "Failed" },
] as const;

export const HANDOVER_CATEGORIES = [
  { value: "keys", label: "Keys & access" },
  { value: "meters", label: "Meter readings" },
  { value: "utilities", label: "Utilities transfer" },
  { value: "insurance", label: "Insurance" },
  { value: "tenancy", label: "Tenancy hand-over" },
  { value: "documents", label: "Documents" },
  { value: "compliance", label: "Compliance certificates" },
  { value: "works", label: "Outstanding works" },
  { value: "other", label: "Other" },
] as const;

export const HANDOVER_TASK_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "not_applicable", label: "Not applicable" },
] as const;

export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "building", label: "Building" },
  { value: "commercial", label: "Commercial" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "land", label: "Land" },
  { value: "garage", label: "Garage" },
  { value: "other", label: "Other" },
] as const;

const uuid = z.string().uuid();
const optionalUuid = uuid.nullish();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const text = z.string().trim();
const money = z.coerce.number().finite().min(0);

export const closingDraftSchema = z.object({
  opportunityId: uuid,
  title: text.nullish(),
  dueDiligenceCaseId: optionalUuid,
  targetCompletionDate: isoDate.nullish(),
  agreedPrice: money.nullish(),
  reference: text.max(48).nullish(),
});
export type ClosingDraft = z.infer<typeof closingDraftSchema>;

export const closingUpdateSchema = z.object({
  closingId: uuid,
  title: text.nullish(),
  notaryName: text.nullish(),
  notaryReference: text.nullish(),
  deedDate: isoDate.nullish(),
  targetCompletionDate: isoDate.nullish(),
  possessionDate: isoDate.nullish(),
  agreedPrice: money.nullish(),
  commitmentId: optionalUuid,
  dueDiligenceCaseId: optionalUuid,
  notes: text.nullish(),
});

export const conditionSchema = z.object({
  closingId: uuid,
  title: text.min(1, "A condition needs a title"),
  category: z
    .enum(CONDITION_CATEGORIES.map((c) => c.value) as [string, ...string[]])
    .default("legal"),
  responsibleParty: z
    .enum(RESPONSIBLE_PARTIES.map((c) => c.value) as [string, ...string[]])
    .default("buyer"),
  description: text.nullish(),
  isBlocking: z.boolean().default(true),
  ownerId: optionalUuid,
  dueDate: isoDate.nullish(),
  sortOrder: z.coerce.number().int().nullish(),
});

export const conditionStatusSchema = z
  .object({
    conditionId: uuid,
    status: z.enum(["pending", "in_progress", "satisfied", "waived", "failed"]),
    notes: text.nullish(),
    waiverReason: text.nullish(),
  })
  .refine((v) => v.status !== "waived" || (v.waiverReason ?? "").length >= 3, {
    message: "A waiver needs a reason",
    path: ["waiverReason"],
  });

export const handoverTaskSchema = z.object({
  closingId: uuid,
  title: text.min(1, "A handover task needs a title"),
  category: z
    .enum(HANDOVER_CATEGORIES.map((c) => c.value) as [string, ...string[]])
    .default("other"),
  description: text.nullish(),
  ownerId: optionalUuid,
  dueDate: isoDate.nullish(),
  sortOrder: z.coerce.number().int().nullish(),
});

export const handoverStatusSchema = z.object({
  taskId: uuid,
  status: z.enum(["pending", "in_progress", "complete", "not_applicable"]),
  notes: text.nullish(),
});

export const closingIdSchema = z.object({ closingId: uuid });

export const completeClosingSchema = z.object({
  closingId: uuid,
  actualCompletionDate: isoDate.nullish(),
  deedDate: isoDate.nullish(),
  possessionDate: isoDate.nullish(),
  notes: text.nullish(),
});

export const cancelClosingSchema = z.object({
  closingId: uuid,
  reason: text.min(3, "A cancellation needs a reason"),
});

export const archiveClosingSchema = z.object({ closingId: uuid, reason: text.nullish() });

export const propertyFromClosingSchema = z.object({
  closingId: uuid,
  name: text.min(1, "The property needs a name"),
  code: text.max(32).nullish(),
  propertyType: z
    .enum(PROPERTY_TYPES.map((p) => p.value) as [string, ...string[]])
    .default("apartment"),
  status: z
    .enum(["prospect", "owned", "under_works", "for_rent", "rented", "for_sale"])
    .default("owned"),
  addressLine1: text.nullish(),
  postalCode: text.nullish(),
  city: text.nullish(),
  district: text.nullish(),
  areaM2: z.coerce.number().finite().min(0).nullish(),
  notes: text.nullish(),
});
export type PropertyFromClosing = z.infer<typeof propertyFromClosingSchema>;

/**
 * Mirrors `public.closing_readiness`. Presentation only — the database
 * re-checks every clause and fails closed.
 */
export function closingReadiness(input: {
  blocking_outstanding: number;
  failed_conditions: number;
  due_diligence_case_id: string | null;
  diligence_ready: boolean;
}) {
  const reasons: string[] = [];
  if (!input.due_diligence_case_id) reasons.push("No due-diligence case is linked");
  else if (!input.diligence_ready)
    reasons.push("Due diligence is not completed with a proceed recommendation");
  if (input.failed_conditions > 0)
    reasons.push(`${input.failed_conditions} condition(s) have failed`);
  if (input.blocking_outstanding > 0)
    reasons.push(`${input.blocking_outstanding} blocking condition(s) outstanding`);
  return { isReady: reasons.length === 0, reasons };
}
