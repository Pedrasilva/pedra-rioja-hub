/**
 * Phase 8C — approval module contracts.
 *
 * Pure data: the vocabularies mirror the frozen database check constraints,
 * and every privileged mutation is validated here before it reaches a server
 * function. No component invents a status, rule or decision outside these
 * lists.
 */

import { z } from "zod";

const uuid = z.string().uuid();
const reason = z.string().trim().min(3, "Give a reason of at least three characters");

/* ------------------------------------------------------------ vocabulary */

export const WORKFLOW_STATUSES = ["draft", "published", "archived"] as const;
export const VERSION_STATUSES = ["draft", "published", "archived"] as const;
export const STEP_RULES = ["any_one", "unanimous", "quorum"] as const;
export const ASSIGNEE_TYPES = [
  "user",
  "role",
  "capability",
  "hierarchy",
  "domain_candidate",
] as const;
export const CANDIDATE_SOURCES = [
  "domain",
  "dimension_owner",
  "project_responsible",
  "delegation",
  "escalation",
] as const;
export const COMPANY_ROLES = [
  "owner",
  "manager",
  "bookkeeper",
  "assistant",
  "approver",
  "viewer",
] as const;
export const STEP_CAPABILITIES = ["view", "record", "manage", "approve"] as const;
export const REQUEST_DECISIONS = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
  "returned",
  "expired",
  "cancelled",
] as const;
export const CALLBACK_STATUSES = ["not_required", "pending", "succeeded", "failed"] as const;
export const DECISION_ACTIONS = [
  "approve",
  "reject",
  "return",
  "withdraw",
  "delegate",
  "override_approve",
  "override_reject",
  "expire",
  "cancel",
  "abstain",
] as const;

/** Decisions that must carry a written reason (mirrors the database guard). */
export const REASON_REQUIRED: readonly string[] = ["reject", "override_reject", "return"];
/** Decisions that must carry a written override reason. */
export const OVERRIDE_REASON_REQUIRED: readonly string[] = ["override_approve", "override_reject"];

const LABELS: Record<string, string> = {
  any_one: "Any one approver",
  unanimous: "Unanimous",
  quorum: "Quorum",
  user: "Named user",
  role: "Company role",
  capability: "Capability",
  hierarchy: "Management hierarchy",
  domain_candidate: "Domain-provided candidates",
  domain: "Domain",
  dimension_owner: "Dimension owner",
  project_responsible: "Project responsibility",
  delegation: "Delegation",
  escalation: "Escalation",
  not_required: "Not required",
  succeeded: "Succeeded",
  failed: "Failed",
  override_approve: "Override approve",
  override_reject: "Override reject",
  approve: "Approve",
  reject: "Reject",
  return: "Return for changes",
  withdraw: "Withdraw",
  cancel: "Cancel",
  abstain: "Abstain",
  delegate: "Delegate",
  expire: "Expire",
};

export function labelOf(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  if (LABELS[value]) return LABELS[value];
  return value
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** A decision is only offerable when the engine would accept its inputs. */
export function decisionInputError(
  action: string,
  input: { reason?: string; overrideReason?: string; delegateTo?: string | null },
): string | null {
  if (REASON_REQUIRED.includes(action) && (input.reason ?? "").trim().length < 3) {
    return "A written reason of at least three characters is required";
  }
  if (
    OVERRIDE_REASON_REQUIRED.includes(action) &&
    (input.overrideReason ?? "").trim().length < 3
  ) {
    return "An override reason is required";
  }
  if (action === "delegate" && !input.delegateTo) {
    return "Select the person you are delegating to";
  }
  return null;
}

/* --------------------------------------------------------------- schemas */

export const createWorkflowSchema = z.object({
  companyId: uuid,
  code: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(160),
  targetType: z.string().trim().min(2),
  description: z.string().trim().max(2000).nullish(),
});

export const archiveWorkflowSchema = z.object({
  workflowId: uuid,
  reason: z.string().trim().max(2000).nullish(),
});

export const createVersionSchema = z.object({
  workflowId: uuid,
  copyFrom: uuid.nullish(),
  notes: z.string().trim().max(2000).nullish(),
  expiryHours: z.number().int().positive().nullish(),
  reminderHours: z.number().int().positive().nullish(),
  escalationHours: z.number().int().positive().nullish(),
});

export const upsertStepSchema = z
  .object({
    versionId: uuid,
    stepId: uuid.nullish(),
    stepNo: z.number().int().min(1),
    name: z.string().trim().min(2).max(120),
    rule: z.enum(STEP_RULES),
    quorumCount: z.number().int().min(1).nullish(),
    minAmount: z.number().nullish(),
    maxAmount: z.number().nullish(),
    allowSelfApproval: z.boolean().default(false),
    restrictCreator: z.boolean().default(true),
    incompatibleWithStepNo: z.number().int().min(1).nullish(),
  })
  .refine((v) => v.rule !== "quorum" || (v.quorumCount ?? 0) >= 1, {
    message: "A quorum step needs a quorum size",
    path: ["quorumCount"],
  })
  .refine((v) => v.minAmount == null || v.maxAmount == null || v.maxAmount >= v.minAmount, {
    message: "The upper threshold must be at least the lower threshold",
    path: ["maxAmount"],
  });

export const deleteStepSchema = z.object({ stepId: uuid });

export const stepAssignmentSchema = z
  .object({
    stepId: uuid,
    assigneeType: z.enum(ASSIGNEE_TYPES),
    userId: uuid.nullish(),
    role: z.enum(COMPANY_ROLES).nullish(),
    capability: z.enum(STEP_CAPABILITIES).nullish(),
    candidateSource: z.enum(CANDIDATE_SOURCES).nullish(),
    removeId: uuid.nullish(),
  })
  .refine(
    (v) =>
      v.removeId != null ||
      (v.assigneeType === "user" && !!v.userId) ||
      (v.assigneeType === "role" && !!v.role) ||
      (v.assigneeType === "capability" && !!v.capability) ||
      v.assigneeType === "hierarchy" ||
      v.assigneeType === "domain_candidate",
    { message: "Complete the assignment before saving it" },
  );

export const publishVersionSchema = z.object({ versionId: uuid });

export const submitRequestSchema = z.object({
  companyId: uuid,
  targetType: z.string().trim().min(2),
  targetId: uuid,
  reason: z.string().trim().max(2000).nullish(),
  amount: z.number().nullish(),
  snapshot: z.record(z.string(), z.unknown()).default({}),
  targetLabel: z.string().trim().max(240).nullish(),
  workflowId: uuid.nullish(),
  candidates: z
    .array(z.object({ user_id: uuid, source: z.enum(CANDIDATE_SOURCES).default("domain") }))
    .default([]),
  thresholdAmount: z.number().nullish(),
  ruleReference: z.string().trim().max(240).nullish(),
});

export const recordDecisionSchema = z
  .object({
    requestId: uuid,
    decision: z.enum(DECISION_ACTIONS),
    reason: z.string().trim().max(2000).nullish(),
    overrideReason: z.string().trim().max(2000).nullish(),
    delegateTo: uuid.nullish(),
    stepId: uuid.nullish(),
    evidenceDocumentId: uuid.nullish(),
  })
  .refine(
    (v) =>
      decisionInputError(v.decision, {
        reason: v.reason ?? undefined,
        overrideReason: v.overrideReason ?? undefined,
        delegateTo: v.delegateTo ?? null,
      }) === null,
    { message: "This decision is missing a required reason or delegate" },
  );

export const withdrawRequestSchema = z.object({
  requestId: uuid,
  reason: z.string().trim().max(2000).nullish(),
});

export const retryCallbackSchema = z.object({ requestId: uuid });

export const maintenanceSchema = z.object({ companyId: uuid });

export const reasonSchema = reason;

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type UpsertStepInput = z.input<typeof upsertStepSchema>;
export type StepAssignmentInput = z.infer<typeof stepAssignmentSchema>;
export type SubmitRequestInput = z.input<typeof submitRequestSchema>;
export type RecordDecisionInput = z.infer<typeof recordDecisionSchema>;
