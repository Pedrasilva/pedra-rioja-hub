/**
 * Phase 8F.3 — due-diligence server functions.
 *
 * Thin wrappers over the SECURITY DEFINER contract. Every gate — waivers,
 * blocking items, the recommendation — is decided in the database and fails
 * closed there; this file only carries the call.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  caseArchiveSchema,
  caseDraftSchema,
  caseIdSchema,
  caseItemSchema,
  caseStatusSchema,
  caseUpdateSchema,
  completeCaseSchema,
  itemStatusSchema,
  templateDraftSchema,
  templateIdSchema,
  templateItemSchema,
} from "@/modules/diligence/schemas";

const nn = <T,>(v: T | null | undefined) => (v === null || v === "" ? undefined : (v ?? undefined));

export const createDiligenceTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => templateDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_due_diligence_template", {
      _company_id: data.companyId,
      _name: data.name,
      _code: nn(data.code),
      _description: nn(data.description),
      _deal_type: data.dealType,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const addDiligenceTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => templateItemSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("add_due_diligence_template_item", {
      _template_id: data.templateId,
      _title: data.title,
      _section: data.section,
      _description: nn(data.description),
      _is_blocking: data.isBlocking,
      _sort_order: nn(data.sortOrder),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const archiveDiligenceTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => templateIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_due_diligence_template", {
      _template_id: data.templateId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createDiligenceCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_due_diligence_case", {
      _opportunity_id: data.opportunityId,
      _title: nn(data.title),
      _template_id: nn(data.templateId),
      _assigned_to: nn(data.assignedTo),
      _target_date: nn(data.targetDate),
      _reference: nn(data.reference),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateDiligenceCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_due_diligence_case", {
      _case_id: data.caseId,
      _title: nn(data.title),
      _assigned_to: nn(data.assignedTo),
      _target_date: nn(data.targetDate),
      _summary: nn(data.summary),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addDiligenceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseItemSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("add_due_diligence_item", {
      _case_id: data.caseId,
      _title: data.title,
      _section: data.section,
      _description: nn(data.description),
      _is_blocking: data.isBlocking,
      _assignee_id: nn(data.assigneeId),
      _due_date: nn(data.dueDate),
      _sort_order: nn(data.sortOrder),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const setDiligenceItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => itemStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_due_diligence_item_status", {
      _item_id: data.itemId,
      _status: data.status,
      _findings: nn(data.findings),
      _risk_level: nn(data.riskLevel),
      _waiver_reason: nn(data.waiverReason),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDiligenceCaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_due_diligence_case_status", {
      _case_id: data.caseId,
      _status: data.status,
      _reason: nn(data.reason),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeDiligenceCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => completeCaseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("complete_due_diligence_case", {
      _case_id: data.caseId,
      _recommendation: data.recommendation,
      _summary: nn(data.summary),
      _recommendation_notes: nn(data.recommendationNotes),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveDiligenceCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseArchiveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_due_diligence_case", {
      _case_id: data.caseId,
      _reason: nn(data.reason),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreDiligenceCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("restore_due_diligence_case", {
      _case_id: data.caseId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
