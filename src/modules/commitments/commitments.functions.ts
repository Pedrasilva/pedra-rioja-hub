/**
 * Phase 8A — commitment server functions.
 *
 * Thin wrappers only. Every privileged mutation lands on the SECURITY DEFINER
 * database contract, which owns lifecycle transitions, approval rules,
 * schedule versioning, drawdown capacity and cash-flow projection. The client
 * never writes a lifecycle field, never inserts a cash-flow entry and never
 * touches a bookkeeping amount.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  activateVersionSchema,
  approveCommitmentSchema,
  approveVarianceSchema,
  commitmentDraftSchema,
  commitmentIdSchema,
  commitmentUpdateSchema,
  completeCommitmentSchema,
  drawdownSchema,
  maintenanceJobSchema,
  maintenanceUpdateSchema,
  reasonedCommitmentSchema,
  requestApprovalSchema,
  reverseDrawdownSchema,
  scheduleVersionSchema,
} from "@/modules/commitments/schemas";

export const createCommitmentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => commitmentDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_commitment_draft", {
      _company_id: data.companyId,
      _title: data.title,
      _commitment_type: data.commitmentType,
      _counterparty_id: data.counterpartyId ?? undefined,
      _authorised_amount: data.authorisedAmount,
      _currency: data.currency,
      _description: data.description ?? undefined,
      _start_date: data.startDate ?? undefined,
      _end_date: data.endDate ?? undefined,
      _code: data.code ?? undefined,
      _source_type: data.sourceType ?? undefined,
      _source_id: data.sourceId ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateCommitmentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => commitmentUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_commitment_draft", {
      _commitment_id: data.commitmentId,
      _title: data.title ?? undefined,
      _commitment_type: data.commitmentType ?? undefined,
      _counterparty_id: data.counterpartyId ?? undefined,
      _authorised_amount: data.authorisedAmount ?? undefined,
      _description: data.description ?? undefined,
      _start_date: data.startDate ?? undefined,
      _end_date: data.endDate ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.commitmentId };
  });

export const requestCommitmentApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => requestApprovalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("request_commitment_approval", {
      _commitment_id: data.commitmentId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const approveCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => approveCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("approve_commitment", {
      _commitment_id: data.commitmentId,
      _comment: data.comment ?? undefined,
      _override_reason: data.overrideReason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.commitmentId };
  });

export const rejectCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reasonedCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("reject_commitment", {
      _commitment_id: data.commitmentId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { id: data.commitmentId };
  });

export const activateCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => commitmentIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("activate_commitment", {
      _commitment_id: data.commitmentId,
    });
    if (error) throw new Error(error.message);
    return { id: data.commitmentId };
  });

/** Archiving is a cancellation event: the row is never removed. */
export const archiveCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reasonedCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_commitment", {
      _commitment_id: data.commitmentId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { id: data.commitmentId };
  });

export const completeCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => completeCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("complete_commitment", {
      _commitment_id: data.commitmentId,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.commitmentId };
  });

export const createScheduleVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scheduleVersionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_commitment_schedule_version", {
      _commitment_id: data.commitmentId,
      _effective_from: data.effectiveFrom,
      _schedule_type: data.scheduleType,
      _reason: data.reason ?? undefined,
      _notes: data.notes ?? undefined,
      _lines: data.lines.map((l) => ({
        line_no: l.lineNo,
        expected_date: l.expectedDate,
        amount: l.amount,
        line_type: l.lineType,
        is_retention: l.isRetention,
        is_contingency: l.isContingency,
        description: l.description ?? null,
      })),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const activateScheduleVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => activateVersionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: synced, error } = await context.supabase.rpc(
      "activate_commitment_schedule_version",
      { _version_id: data.versionId, _reason: data.reason ?? undefined },
    );
    if (error) throw new Error(error.message);
    return { versionId: data.versionId, projections: Number(synced ?? 0) };
  });

export const approveScheduleVariance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => approveVarianceSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("approve_commitment_variance", {
      _version_id: data.versionId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { versionId: data.versionId };
  });

export const createDrawdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => drawdownSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_commitment_drawdown", {
      _commitment_id: data.commitmentId,
      _document_id: data.documentId,
      _amount: data.amount,
      _schedule_line_id: data.scheduleLineId ?? undefined,
      _drawdown_date: data.drawdownDate ?? undefined,
      _kind: data.kind,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const reverseDrawdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reverseDrawdownSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("reverse_commitment_drawdown", {
      _drawdown_id: data.drawdownId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const createMaintenanceJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => maintenanceJobSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_maintenance_job", {
      _company_id: data.companyId,
      _title: data.title,
      _description: data.description ?? undefined,
      _priority: data.priority,
      _target_date: data.targetDate ?? undefined,
      _responsible_name: data.responsibleName ?? undefined,
      _counterparty_id: data.counterpartyId ?? undefined,
      _commitment_id: data.commitmentId ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateMaintenanceJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => maintenanceUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_maintenance_job", {
      _job_id: data.jobId,
      _title: data.title ?? undefined,
      _description: data.description ?? undefined,
      _priority: data.priority ?? undefined,
      _status: data.status ?? undefined,
      _target_date: data.targetDate ?? undefined,
      _completion_date: data.completionDate ?? undefined,
      _responsible_name: data.responsibleName ?? undefined,
      _counterparty_id: data.counterpartyId ?? undefined,
      _commitment_id: data.commitmentId ?? undefined,
      _cancellation_reason: data.cancellationReason ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.jobId };
  });
