/**
 * Phase 8F.1 — payment execution server functions.
 *
 * Thin wrappers. Every privileged mutation lands on the SECURITY DEFINER
 * database contract, which owns the lifecycle, the approval hand-off and the
 * export record. The client never writes a lifecycle field, never posts a
 * journal, never creates a bank transaction and never touches a cash-flow row.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addInstructionSchema,
  archiveRunSchema,
  completeRunSchema,
  executeRunSchema,
  exportRunSchema,
  failInstructionSchema,
  instructionIdSchema,
  paymentRunDraftSchema,
  paymentRunUpdateSchema,
  reasonedRunSchema,
  requestRunApprovalSchema,
  updateInstructionSchema,
} from "@/modules/payments/schemas";

export const createPaymentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => paymentRunDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_payment_run", {
      _company_id: data.companyId,
      _title: data.title,
      _description: data.description ?? undefined,
      _scheduled_execution_date: data.scheduledExecutionDate ?? undefined,
      _reference: data.reference ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updatePaymentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => paymentRunUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_payment_run", {
      _run_id: data.runId,
      _title: data.title ?? undefined,
      _description: data.description ?? undefined,
      _scheduled_execution_date: data.scheduledExecutionDate ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.runId };
  });

export const addPaymentInstruction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addInstructionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("add_payment_instruction", {
      _run_id: data.runId,
      _document_id: data.documentId,
      _payment_method: data.paymentMethod,
      _payment_reference: data.paymentReference ?? undefined,
      _bank_account_id: data.bankAccountId ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updatePaymentInstruction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateInstructionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_payment_instruction", {
      _instruction_id: data.instructionId,
      _payment_method: data.paymentMethod ?? undefined,
      _payment_reference: data.paymentReference ?? undefined,
      _bank_account_id: data.bankAccountId ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.instructionId };
  });

export const removePaymentInstruction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => instructionIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("remove_payment_instruction", {
      _instruction_id: data.instructionId,
    });
    if (error) throw new Error(error.message);
    return { id: data.instructionId };
  });

export const failPaymentInstruction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => failInstructionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("fail_payment_instruction", {
      _instruction_id: data.instructionId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { id: data.instructionId };
  });

export const requestPaymentRunApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => requestRunApprovalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("request_payment_run_approval", {
      _run_id: data.runId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const exportPaymentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => exportRunSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("export_payment_run", {
      _run_id: data.runId,
      _format: data.format,
      _file_name: data.fileName ?? undefined,
      _content_hash: data.contentHash ?? undefined,
      _provider: data.provider ?? undefined,
      _batch_id: data.batchId ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const executePaymentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => executeRunSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("execute_payment_run", {
      _run_id: data.runId,
      _execution_date: data.executionDate ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.runId };
  });

export const completePaymentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => completeRunSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("complete_payment_run", {
      _run_id: data.runId,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.runId };
  });

export const cancelPaymentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reasonedRunSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_payment_run", {
      _run_id: data.runId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { id: data.runId };
  });

export const archivePaymentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveRunSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_payment_run", {
      _run_id: data.runId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: data.runId };
  });
