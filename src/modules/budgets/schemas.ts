/**
 * Phase 8D — budget contracts.
 *
 * Budgets are planning records (§5F). Nothing in this file accepts a
 * committed, invoiced, paid, remaining or variance figure: those are derived
 * by `v_budget_line_performance` from commitments, which remain the only owner
 * of expected expenditure.
 */

import { z } from "zod";

const uuid = z.string().uuid();
const optionalUuid = uuid.nullish().transform((v) => v ?? undefined);
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((v) => (v ? v : undefined));

export const budgetDirections = ["outflow", "inflow"] as const;
export type BudgetDirection = (typeof budgetDirections)[number];

export const budgetStatuses = ["open", "closed", "archived"] as const;
export const budgetVersionStatuses = [
  "draft",
  "pending_approval",
  "published",
  "superseded",
  "archived",
] as const;

export const budgetCreateSchema = z.object({
  companyId: uuid,
  name: z.string().trim().min(2).max(160),
  fiscalYear: z.coerce.number().int().min(1900).max(2200),
  currency: z.string().trim().length(3).default("EUR"),
  code: optionalText,
  propertyId: optionalUuid,
  unitId: optionalUuid,
  projectId: optionalUuid,
  notes: optionalText,
});
export type BudgetCreateInput = z.input<typeof budgetCreateSchema>;

export const budgetUpdateSchema = z.object({
  budgetId: uuid,
  name: z.string().trim().min(2).max(160).optional(),
  code: optionalText,
  fiscalYear: z.coerce.number().int().min(1900).max(2200).optional(),
  currency: z.string().trim().length(3).optional(),
  propertyId: optionalUuid,
  unitId: optionalUuid,
  projectId: optionalUuid,
  status: z.enum(budgetStatuses).optional(),
  notes: optionalText,
});

export const budgetVersionCreateSchema = z.object({
  budgetId: uuid,
  reason: optionalText,
  copyFromVersionId: optionalUuid,
});

export const budgetLineSchema = z.object({
  versionId: uuid,
  lineId: optionalUuid,
  label: z.string().trim().min(1).max(160),
  plannedAmount: z.coerce.number().finite(),
  direction: z.enum(budgetDirections).default("outflow"),
  lineNo: z.coerce.number().int().min(1).optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).nullish().transform((v) => v ?? undefined),
  dimensionId: optionalUuid,
  dimensionValueId: optionalUuid,
  propertyId: optionalUuid,
  unitId: optionalUuid,
  projectId: optionalUuid,
  notes: optionalText,
});
export type BudgetLineInput = z.input<typeof budgetLineSchema>;

export const budgetLineDeleteSchema = z.object({ lineId: uuid });
export const budgetVersionIdSchema = z.object({ versionId: uuid });
export const budgetVersionArchiveSchema = z.object({ versionId: uuid, reason: optionalText });
export const budgetArchiveSchema = z.object({ budgetId: uuid, reason: optionalText });
export const budgetApprovalSchema = z.object({ versionId: uuid, reason: optionalText });

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthLabel(month: number | null | undefined) {
  if (!month) return "Full year";
  return MONTH_LABELS[month - 1] ?? "Full year";
}
