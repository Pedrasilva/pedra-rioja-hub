/**
 * Phase 8D — budget server functions.
 *
 * Thin wrappers over SECURITY DEFINER database functions, which own the
 * permission checks, company isolation, published-version immutability and
 * archive-only semantics. No handler here writes to commitments, cash flow,
 * bookkeeping or banking: a budget is a plan and never an obligation.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  budgetApprovalSchema,
  budgetArchiveSchema,
  budgetCreateSchema,
  budgetLineDeleteSchema,
  budgetLineSchema,
  budgetUpdateSchema,
  budgetVersionArchiveSchema,
  budgetVersionCreateSchema,
  budgetVersionIdSchema,
} from "@/modules/budgets/schemas";

const opt = <T>(value: T | null | undefined) => (value ?? undefined) as T | undefined;

export const createBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_budget", {
      _company_id: data.companyId,
      _name: data.name,
      _fiscal_year: data.fiscalYear,
      _currency: data.currency,
      _code: opt(data.code),
      _property_id: opt(data.propertyId),
      _unit_id: opt(data.unitId),
      _project_id: opt(data.projectId),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_budget", {
      _budget_id: data.budgetId,
      _name: opt(data.name),
      _code: opt(data.code),
      _fiscal_year: opt(data.fiscalYear),
      _currency: opt(data.currency),
      _property_id: opt(data.propertyId),
      _unit_id: opt(data.unitId),
      _project_id: opt(data.projectId),
      _status: opt(data.status),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: data.budgetId };
  });

export const createBudgetVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetVersionCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_budget_version", {
      _budget_id: data.budgetId,
      _reason: opt(data.reason),
      _copy_from_version_id: opt(data.copyFromVersionId),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const upsertBudgetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetLineSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("upsert_budget_line", {
      _version_id: data.versionId,
      _label: data.label,
      _planned_amount: data.plannedAmount,
      _line_id: opt(data.lineId),
      _direction: data.direction,
      _line_no: opt(data.lineNo),
      _period_month: opt(data.periodMonth),
      _dimension_id: opt(data.dimensionId),
      _dimension_value_id: opt(data.dimensionValueId),
      _property_id: opt(data.propertyId),
      _unit_id: opt(data.unitId),
      _project_id: opt(data.projectId),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const deleteBudgetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetLineDeleteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("delete_budget_line", { _line_id: data.lineId });
    if (error) throw new Error(error.message);
    return { id: data.lineId };
  });

export const publishBudgetVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetVersionIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("publish_budget_version", {
      _version_id: data.versionId,
    });
    if (error) throw new Error(error.message);
    return { id: data.versionId };
  });

export const archiveBudgetVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetVersionArchiveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_budget_version", {
      _version_id: data.versionId,
      _reason: opt(data.reason),
    });
    if (error) throw new Error(error.message);
    return { id: data.versionId };
  });

export const archiveBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetArchiveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_budget", {
      _budget_id: data.budgetId,
      _reason: opt(data.reason),
    });
    if (error) throw new Error(error.message);
    return { id: data.budgetId };
  });

export const requestBudgetVersionApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => budgetApprovalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("request_budget_version_approval", {
      _version_id: data.versionId,
      _reason: opt(data.reason),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });
