/**
 * Phase 8A — commitment module contracts.
 *
 * Pure data: enumerations, labels and the Zod schemas every privileged
 * mutation is validated against before it reaches the database contract.
 * No component and no server function may invent a status value outside the
 * lists below — they mirror the frozen database check constraints.
 */

import { z } from "zod";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

/* ------------------------------------------------------------ vocabulary */

export const COMMITMENT_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "active",
  "completed",
  "cancelled",
] as const;
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const APPROVAL_STATUSES = ["not_requested", "pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const COMMITMENT_TYPES = [
  "capex_contract",
  "purchase_order",
  "maintenance",
  "service_contract",
  "insurance",
  "utility",
  "tax_instalment",
  "other",
] as const;
export type CommitmentType = (typeof COMMITMENT_TYPES)[number];

export const SCHEDULE_TYPES = ["single", "milestone", "monthly", "custom"] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export const SCHEDULE_LINE_TYPES = [
  "instalment",
  "milestone",
  "retention",
  "contingency",
  "final",
] as const;
export type ScheduleLineType = (typeof SCHEDULE_LINE_TYPES)[number];

export const SCHEDULE_LINE_STATUSES = [
  "scheduled",
  "invoiced",
  "paid",
  "reconciled",
  "superseded",
  "cancelled",
] as const;

export const DRAWDOWN_KINDS = [
  "allocation",
  "retention_release",
  "variation",
  "reversal",
] as const;

export const MAINTENANCE_STATUSES = [
  "requested",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

/** Schedule lines that no longer belong to the live schedule. */
export const IMMUTABLE_LINE_STATUSES = ["invoiced", "paid", "reconciled", "superseded", "cancelled"];

/** A commitment stops being editable once it leaves draft. */
export function isCommitmentEditable(status: string | null | undefined) {
  return status === "draft";
}

/** Only these states may still be archived (the database also enforces it). */
export function isCommitmentArchivable(status: string | null | undefined) {
  return status !== "completed" && status !== "cancelled";
}

export function isFinalState(status: string | null | undefined) {
  return status === "completed" || status === "cancelled";
}

export const LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  not_requested: "Not requested",
  pending: "Pending",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  superseded: "Superseded",
  scheduled: "Scheduled",
  invoiced: "Invoiced",
  paid: "Paid",
  reconciled: "Reconciled",
  reversed: "Reversed",
  active_version: "Active",
  capex_contract: "Capex contract",
  purchase_order: "Purchase order",
  maintenance: "Maintenance",
  service_contract: "Service contract",
  insurance: "Insurance",
  utility: "Utility",
  tax_instalment: "Tax instalment",
  other: "Other",
  single: "Single date",
  milestone: "Milestone",
  monthly: "Monthly",
  custom: "Custom",
  instalment: "Instalment",
  retention: "Retention",
  contingency: "Contingency",
  final: "Final",
  requested: "Requested",
  in_progress: "In progress",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
  allocation: "Allocation",
  retention_release: "Retention release",
  variation: "Variation",
  reversal: "Reversal",
};

export function labelOf(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  return LABELS[value] ?? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* -------------------------------------------------------------- schemas */

export const commitmentDraftSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "A title is required"),
  commitmentType: z.enum(COMMITMENT_TYPES).default("other"),
  counterpartyId: uuid.nullish(),
  authorisedAmount: z.coerce.number().min(0, "The authorised amount cannot be negative"),
  currency: z.string().trim().length(3).default("EUR"),
  description: z.string().trim().max(2000).nullish(),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
  code: z.string().trim().max(40).nullish(),
  sourceType: z.string().trim().max(40).nullish(),
  sourceId: uuid.nullish(),
  notes: z.string().trim().max(2000).nullish(),
});
export type CommitmentDraftInput = z.infer<typeof commitmentDraftSchema>;

export const commitmentUpdateSchema = commitmentDraftSchema
  .omit({ companyId: true, code: true, sourceType: true, sourceId: true })
  .partial()
  .extend({ commitmentId: uuid });

export const commitmentIdSchema = z.object({ commitmentId: uuid });

export const reasonedCommitmentSchema = z.object({
  commitmentId: uuid,
  reason: z.string().trim().min(3, "A reason is required"),
});

export const approveCommitmentSchema = z.object({
  commitmentId: uuid,
  comment: z.string().trim().max(1000).nullish(),
  overrideReason: z.string().trim().min(3).nullish(),
});

export const requestApprovalSchema = z.object({
  commitmentId: uuid,
  reason: z.string().trim().max(1000).nullish(),
});

export const completeCommitmentSchema = z.object({
  commitmentId: uuid,
  notes: z.string().trim().max(1000).nullish(),
});

export const scheduleLineSchema = z.object({
  lineNo: z.coerce.number().int().min(1),
  expectedDate: isoDate,
  amount: z.coerce.number().positive("Every line needs a positive amount"),
  lineType: z.enum(SCHEDULE_LINE_TYPES).default("instalment"),
  isRetention: z.boolean().default(false),
  isContingency: z.boolean().default(false),
  description: z.string().trim().max(400).nullish(),
});
export type ScheduleLineInput = z.infer<typeof scheduleLineSchema>;

export const scheduleVersionSchema = z.object({
  commitmentId: uuid,
  effectiveFrom: isoDate,
  scheduleType: z.enum(SCHEDULE_TYPES).default("custom"),
  reason: z.string().trim().max(400).nullish(),
  notes: z.string().trim().max(1000).nullish(),
  lines: z.array(scheduleLineSchema).min(1, "A schedule needs at least one line"),
});

export const activateVersionSchema = z.object({
  versionId: uuid,
  reason: z.string().trim().max(400).nullish(),
});

export const approveVarianceSchema = z.object({
  versionId: uuid,
  reason: z.string().trim().min(3, "A variance reason is required"),
});

export const drawdownSchema = z.object({
  commitmentId: uuid,
  documentId: uuid,
  amount: z.coerce.number().positive("A drawdown amount must be positive"),
  scheduleLineId: uuid.nullish(),
  drawdownDate: isoDate.nullish(),
  kind: z.enum(DRAWDOWN_KINDS).default("allocation"),
  notes: z.string().trim().max(1000).nullish(),
});

export const reverseDrawdownSchema = z.object({
  drawdownId: uuid,
  reason: z.string().trim().min(3, "A reversal reason is required"),
});

export const maintenanceJobSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "A title is required"),
  description: z.string().trim().max(2000).nullish(),
  priority: z.enum(MAINTENANCE_PRIORITIES).default("medium"),
  targetDate: isoDate.nullish(),
  responsibleName: z.string().trim().max(120).nullish(),
  counterpartyId: uuid.nullish(),
  commitmentId: uuid.nullish(),
  notes: z.string().trim().max(2000).nullish(),
});

export const maintenanceUpdateSchema = maintenanceJobSchema
  .omit({ companyId: true })
  .partial()
  .extend({
    jobId: uuid,
    status: z.enum(MAINTENANCE_STATUSES).optional(),
    completionDate: isoDate.nullish(),
    cancellationReason: z.string().trim().max(1000).nullish(),
  });

/* ------------------------------------------------------------- helpers */

/** Builds evenly spread monthly lines; the remainder lands on the last line. */
export function monthlyLines(
  start: string,
  months: number,
  total: number,
): ScheduleLineInput[] {
  const count = Math.max(1, Math.floor(months));
  const per = Math.round((total / count) * 100) / 100;
  const [y, m, d] = start.split("-").map(Number);
  const lines: ScheduleLineInput[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(y!, (m ?? 1) - 1 + i, d ?? 1));
    const last = i === count - 1;
    const amount = last ? Math.round((total - allocated) * 100) / 100 : per;
    allocated += amount;
    lines.push({
      lineNo: i + 1,
      expectedDate: date.toISOString().slice(0, 10),
      amount,
      lineType: "instalment",
      isRetention: false,
      isContingency: false,
      description: null,
    });
  }
  return lines;
}

export function scheduleTotal(lines: { amount: number | string }[]) {
  return Math.round(lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0) * 100) / 100;
}
