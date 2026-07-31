/**
 * Phase 8F.4 — closing & handover server functions.
 *
 * Thin wrappers over the SECURITY DEFINER contract. Both completion gates —
 * blocking conditions and the Phase 8F.3 diligence recommendation — live in
 * the database and fail closed there.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  archiveClosingSchema,
  cancelClosingSchema,
  closingDraftSchema,
  closingIdSchema,
  closingUpdateSchema,
  completeClosingSchema,
  conditionSchema,
  conditionStatusSchema,
  handoverStatusSchema,
  handoverTaskSchema,
  propertyFromClosingSchema,
} from "@/modules/closings/schemas";

const nn = <T,>(v: T | null | undefined) => (v === null || v === "" ? undefined : (v ?? undefined));

export const createClosingCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => closingDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_closing_case", {
      _opportunity_id: data.opportunityId,
      _title: nn(data.title),
      _due_diligence_case_id: nn(data.dueDiligenceCaseId),
      _target_completion_date: nn(data.targetCompletionDate),
      _agreed_price: nn(data.agreedPrice),
      _reference: nn(data.reference),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateClosingCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => closingUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_closing_case", {
      _closing_id: data.closingId,
      _title: nn(data.title),
      _notary_name: nn(data.notaryName),
      _notary_reference: nn(data.notaryReference),
      _deed_date: nn(data.deedDate),
      _target_completion_date: nn(data.targetCompletionDate),
      _possession_date: nn(data.possessionDate),
      _agreed_price: nn(data.agreedPrice),
      _commitment_id: nn(data.commitmentId),
      _due_diligence_case_id: nn(data.dueDiligenceCaseId),
      _notes: nn(data.notes),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addClosingCondition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => conditionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("add_closing_condition", {
      _closing_id: data.closingId,
      _title: data.title,
      _category: data.category,
      _responsible_party: data.responsibleParty,
      _description: nn(data.description),
      _is_blocking: data.isBlocking,
      _owner_id: nn(data.ownerId),
      _due_date: nn(data.dueDate),
      _sort_order: nn(data.sortOrder),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const setClosingConditionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => conditionStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_closing_condition_status", {
      _condition_id: data.conditionId,
      _status: data.status,
      _notes: nn(data.notes),
      _waiver_reason: nn(data.waiverReason),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addHandoverTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => handoverTaskSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("add_closing_handover_task", {
      _closing_id: data.closingId,
      _title: data.title,
      _category: data.category,
      _description: nn(data.description),
      _owner_id: nn(data.ownerId),
      _due_date: nn(data.dueDate),
      _sort_order: nn(data.sortOrder),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const setHandoverTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => handoverStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_closing_handover_task_status", {
      _task_id: data.taskId,
      _status: data.status,
      _notes: nn(data.notes),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markClosingReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => closingIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("mark_closing_ready", {
      _closing_id: data.closingId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeClosingCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => completeClosingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("complete_closing_case", {
      _closing_id: data.closingId,
      _actual_completion_date: nn(data.actualCompletionDate),
      _deed_date: nn(data.deedDate),
      _possession_date: nn(data.possessionDate),
      _notes: nn(data.notes),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelClosingCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => cancelClosingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_closing_case", {
      _closing_id: data.closingId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveClosingCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveClosingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_closing_case", {
      _closing_id: data.closingId,
      _reason: nn(data.reason),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreClosingCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => closingIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("restore_closing_case", {
      _closing_id: data.closingId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Creates the managed property from a completed closing. The database
 * enforces "completed, and only once"; this wrapper adds nothing.
 */
export const createPropertyFromClosing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => propertyFromClosingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_property_from_closing", {
      _closing_id: data.closingId,
      _name: data.name,
      _code: nn(data.code),
      _property_type: data.propertyType,
      _status: data.status,
      _address_line1: nn(data.addressLine1),
      _postal_code: nn(data.postalCode),
      _city: nn(data.city),
      _district: nn(data.district),
      _area_m2: nn(data.areaM2),
      _notes: nn(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });
