/**
 * Phase 8C — approval server functions.
 *
 * Thin wrappers only. Every privileged mutation lands on the SECURITY DEFINER
 * approval contract, which owns workflow publication, approver resolution,
 * decision recording, step advancement and callback execution. The client
 * never writes an approval column, never resolves an approver and never
 * touches a domain table.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  archiveWorkflowSchema,
  createVersionSchema,
  createWorkflowSchema,
  deleteStepSchema,
  maintenanceSchema,
  publishVersionSchema,
  recordDecisionSchema,
  retryCallbackSchema,
  stepAssignmentSchema,
  submitRequestSchema,
  upsertStepSchema,
  withdrawRequestSchema,
} from "@/modules/approvals/schemas";

export const createApprovalWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createWorkflowSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_approval_workflow", {
      _company_id: data.companyId,
      _code: data.code,
      _name: data.name,
      _target_type: data.targetType,
      _description: data.description ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const archiveApprovalWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveWorkflowSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_approval_workflow", {
      _workflow_id: data.workflowId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.workflowId };
  });

export const createApprovalWorkflowVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createVersionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_approval_workflow_version", {
      _workflow_id: data.workflowId,
      _copy_from: data.copyFrom ?? undefined,
      _notes: data.notes ?? undefined,
      _expiry_hours: data.expiryHours ?? undefined,
      _reminder_hours: data.reminderHours ?? undefined,
      _escalation_hours: data.escalationHours ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const upsertApprovalWorkflowStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertStepSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("upsert_approval_workflow_step", {
      _version_id: data.versionId,
      _step_no: data.stepNo,
      _name: data.name,
      _rule: data.rule,
      _quorum_count: data.quorumCount ?? undefined,
      _min_amount: data.minAmount ?? undefined,
      _max_amount: data.maxAmount ?? undefined,
      _allow_self_approval: data.allowSelfApproval,
      _restrict_creator: data.restrictCreator,
      _incompatible_with_step_no: data.incompatibleWithStepNo ?? undefined,
      _step_id: data.stepId ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const deleteApprovalWorkflowStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteStepSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("delete_approval_workflow_step", {
      _step_id: data.stepId,
    });
    if (error) throw new Error(error.message);
    return { id: data.stepId };
  });

export const setApprovalStepAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => stepAssignmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("set_approval_step_assignment", {
      _step_id: data.stepId,
      _assignee_type: data.assigneeType,
      _user_id: data.userId ?? undefined,
      _role: data.role ?? undefined,
      _capability: data.capability ?? undefined,
      _candidate_source: data.candidateSource ?? undefined,
      _remove_id: data.removeId ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: (id as string) ?? data.stepId };
  });

export const publishApprovalWorkflowVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => publishVersionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("publish_approval_workflow_version", {
      _version_id: data.versionId,
    });
    if (error) throw new Error(error.message);
    return { id: (id as string) ?? data.versionId };
  });

export const submitApprovalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("submit_approval_request", {
      _company_id: data.companyId,
      _target_type: data.targetType,
      _target_id: data.targetId,
      _reason: data.reason ?? undefined,
      _amount: data.amount ?? undefined,
      _snapshot: data.snapshot as never,
      _target_label: data.targetLabel ?? undefined,
      _workflow_id: data.workflowId ?? undefined,
      _candidates: data.candidates as never,
      _threshold_amount: data.thresholdAmount ?? undefined,
      _rule_reference: data.ruleReference ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const recordApprovalDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => recordDecisionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("record_approval_decision", {
      _request_id: data.requestId,
      _decision: data.decision,
      _reason: data.reason ?? undefined,
      _override_reason: data.overrideReason ?? undefined,
      _delegate_to: data.delegateTo ?? undefined,
      _step_id: data.stepId ?? undefined,
      _evidence_document_id: data.evidenceDocumentId ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const withdrawApprovalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => withdrawRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("withdraw_approval_request", {
      _request_id: data.requestId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.requestId };
  });

export const retryApprovalCallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => retryCallbackSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: status, error } = await context.supabase.rpc("retry_approval_callback", {
      _request_id: data.requestId,
    });
    if (error) throw new Error(error.message);
    if (status === "failed") throw new Error("The domain callback failed again");
    return { id: data.requestId, status: status as string };
  });

export const runApprovalMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => maintenanceSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("run_approval_maintenance", {
      _company_id: data.companyId,
    });
    if (error) throw new Error(error.message);
    return (result ?? {}) as Record<string, number>;
  });
