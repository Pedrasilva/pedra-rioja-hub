/**
 * Phase 8D — preventive maintenance server functions.
 *
 * Thin wrappers over SECURITY DEFINER database functions. The generator is
 * idempotent, company scoped and retry safe; none of these handlers create a
 * commitment, cash-flow entry or bookkeeping record.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateMaintenanceJobsSchema,
  inspectionEvidenceSchema,
  maintenanceScheduleArchiveSchema,
  maintenanceScheduleSchema,
} from "@/modules/maintenance/schemas";

const opt = <T>(value: T | null | undefined) => (value ?? undefined) as T | undefined;

export const upsertMaintenanceSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => maintenanceScheduleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("upsert_maintenance_schedule", {
      _company_id: data.companyId,
      _title: data.title,
      _schedule_id: opt(data.scheduleId),
      _schedule_kind: data.scheduleKind,
      _description: opt(data.description),
      _property_id: opt(data.propertyId),
      _unit_id: opt(data.unitId),
      _asset_label: opt(data.assetLabel),
      _counterparty_id: opt(data.counterpartyId),
      _responsible_name: opt(data.responsibleName),
      _priority: data.priority,
      _frequency: data.frequency,
      _interval_days: opt(data.intervalDays),
      _start_date: opt(data.startDate),
      _end_date: opt(data.endDate),
      _lead_time_days: data.leadTimeDays,
      _is_active: data.isActive,
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const archiveMaintenanceSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => maintenanceScheduleArchiveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_maintenance_schedule", {
      _schedule_id: data.scheduleId,
      _reason: opt(data.reason),
    });
    if (error) throw new Error(error.message);
    return { id: data.scheduleId };
  });

export const generateMaintenanceJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateMaintenanceJobsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase.rpc("generate_maintenance_jobs", {
      _company_id: data.companyId,
      _horizon_months: data.horizonMonths,
    });
    if (error) throw new Error(error.message);
    return { created: Number(created ?? 0) };
  });

export const recordInspectionEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inspectionEvidenceSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("record_inspection_evidence", {
      _job_id: data.jobId,
      _finding: data.finding,
      _outcome: data.outcome,
      _document_id: opt(data.documentId),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });
