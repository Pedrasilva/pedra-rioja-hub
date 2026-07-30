/**
 * Phase 8D — preventive maintenance contracts.
 *
 * A schedule plans work. It never carries money: cost still enters through
 * quotation → commitment → approval → cash flow (§5D).
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

export const scheduleKinds = ["preventive", "inspection"] as const;
export const scheduleFrequencies = [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "custom_days",
] as const;
export const inspectionOutcomes = ["pass", "fail", "observation", "action_required"] as const;

export const maintenanceScheduleSchema = z.object({
  companyId: uuid,
  scheduleId: optionalUuid,
  title: z.string().trim().min(2).max(160),
  scheduleKind: z.enum(scheduleKinds).default("preventive"),
  description: optionalText,
  propertyId: optionalUuid,
  unitId: optionalUuid,
  assetLabel: optionalText,
  counterpartyId: optionalUuid,
  responsibleName: optionalText,
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  frequency: z.enum(scheduleFrequencies).default("annual"),
  intervalDays: z.coerce.number().int().min(1).nullish().transform((v) => v ?? undefined),
  startDate: z.string().trim().min(4).optional(),
  endDate: z.string().trim().min(4).nullish().transform((v) => (v ? v : undefined)),
  leadTimeDays: z.coerce.number().int().min(0).default(14),
  isActive: z.boolean().default(true),
  notes: optionalText,
});
export type MaintenanceScheduleInput = z.input<typeof maintenanceScheduleSchema>;

export const maintenanceScheduleArchiveSchema = z.object({
  scheduleId: uuid,
  reason: optionalText,
});

export const generateMaintenanceJobsSchema = z.object({
  companyId: uuid,
  horizonMonths: z.coerce.number().int().min(1).max(60).default(12),
});

export const inspectionEvidenceSchema = z.object({
  jobId: uuid,
  finding: z.string().trim().min(2).max(2000),
  outcome: z.enum(inspectionOutcomes).default("observation"),
  documentId: optionalUuid,
  notes: optionalText,
});
