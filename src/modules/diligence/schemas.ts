/**
 * Phase 8F.3 — due-diligence contracts.
 *
 * A due-diligence case is an operational record hanging off an acquisition
 * opportunity. Nothing here posts a journal, creates a commitment, writes a
 * cash-flow entry, records a payment or touches a bank transaction
 * (§5C, §5D).
 */

import { z } from "zod";

export const DILIGENCE_STATUSES = [
  { value: "preparing", label: "Preparing" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Abandoned" },
] as const;

export const DILIGENCE_RECOMMENDATIONS = [
  { value: "pending", label: "Pending" },
  { value: "proceed", label: "Proceed" },
  { value: "proceed_with_conditions", label: "Proceed with conditions" },
  { value: "renegotiate", label: "Renegotiate" },
  { value: "withdraw", label: "Withdraw" },
] as const;

/** Only these two recommendations open the Phase 8F.4 closing gate. */
export const PROCEED_RECOMMENDATIONS = ["proceed", "proceed_with_conditions"] as const;

export const DILIGENCE_ITEM_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "waived", label: "Waived" },
  { value: "failed", label: "Failed" },
] as const;

export const RISK_LEVELS = [
  { value: "none", label: "No concern" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const DILIGENCE_SECTIONS = [
  "Legal & title",
  "Tax",
  "Technical & building",
  "Regulatory & licensing",
  "Commercial & tenancy",
  "Financial",
  "Environmental",
  "General",
] as const;

export const DEAL_TYPES = [
  { value: "any", label: "Any deal" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "retail", label: "Retail" },
  { value: "office", label: "Office" },
  { value: "industrial", label: "Industrial" },
  { value: "land", label: "Land" },
  { value: "building", label: "Building" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "portfolio", label: "Portfolio" },
  { value: "other", label: "Other" },
] as const;

const uuid = z.string().uuid();
const optionalUuid = uuid.nullish();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const text = z.string().trim();

export const templateDraftSchema = z.object({
  companyId: uuid,
  name: text.min(1, "A template needs a name"),
  code: text.max(32).nullish(),
  description: text.nullish(),
  dealType: z.enum(DEAL_TYPES.map((d) => d.value) as [string, ...string[]]).default("any"),
});
export type TemplateDraft = z.infer<typeof templateDraftSchema>;

export const templateItemSchema = z.object({
  templateId: uuid,
  title: text.min(1, "A checklist item needs a title"),
  section: text.default("general"),
  description: text.nullish(),
  isBlocking: z.boolean().default(false),
  sortOrder: z.coerce.number().int().nullish(),
});

export const templateIdSchema = z.object({ templateId: uuid });

export const caseDraftSchema = z.object({
  opportunityId: uuid,
  title: text.nullish(),
  templateId: optionalUuid,
  assignedTo: optionalUuid,
  targetDate: isoDate.nullish(),
  reference: text.max(48).nullish(),
});
export type CaseDraft = z.infer<typeof caseDraftSchema>;

export const caseUpdateSchema = z.object({
  caseId: uuid,
  title: text.nullish(),
  assignedTo: optionalUuid,
  targetDate: isoDate.nullish(),
  summary: text.nullish(),
});

export const caseItemSchema = z.object({
  caseId: uuid,
  title: text.min(1, "A checklist item needs a title"),
  section: text.default("general"),
  description: text.nullish(),
  isBlocking: z.boolean().default(false),
  assigneeId: optionalUuid,
  dueDate: isoDate.nullish(),
  sortOrder: z.coerce.number().int().nullish(),
});

export const itemStatusSchema = z
  .object({
    itemId: uuid,
    status: z.enum(["pending", "in_progress", "complete", "waived", "failed"]),
    findings: text.nullish(),
    riskLevel: z.enum(["none", "low", "medium", "high"]).nullish(),
    waiverReason: text.nullish(),
  })
  .refine((v) => v.status !== "waived" || (v.waiverReason ?? "").length >= 3, {
    message: "A waiver needs a reason",
    path: ["waiverReason"],
  });

export const caseStatusSchema = z.object({
  caseId: uuid,
  status: z.enum(["preparing", "in_progress", "on_hold", "abandoned"]),
  reason: text.nullish(),
});

export const completeCaseSchema = z.object({
  caseId: uuid,
  recommendation: z.enum(["proceed", "proceed_with_conditions", "renegotiate", "withdraw"]),
  summary: text.nullish(),
  recommendationNotes: text.nullish(),
});

export const caseArchiveSchema = z.object({ caseId: uuid, reason: text.nullish() });
export const caseIdSchema = z.object({ caseId: uuid });

/** Mirrors `public.due_diligence_permits_completion`. */
export function permitsCompletion(input: {
  status: string;
  recommendation: string;
  is_archived?: boolean;
  archived_at?: string | null;
}): boolean {
  const archived = input.is_archived ?? Boolean(input.archived_at);
  return (
    !archived &&
    input.status === "completed" &&
    (PROCEED_RECOMMENDATIONS as readonly string[]).includes(input.recommendation)
  );
}
