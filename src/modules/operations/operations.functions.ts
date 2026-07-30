/**
 * Phase 8B — operational server functions.
 *
 * Thin wrappers only. Every privileged write lands on a SECURITY DEFINER
 * database function which owns the permission check, the company-isolation
 * check and the archive rules. No handler below writes to cash_flow_entries,
 * bookkeeping or banking: an operational record can only ever *point at* a
 * commitment, and the commitment owns the money.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  archiveOperationalSchema,
  generateRemindersSchema,
  insurancePolicyCreateSchema,
  insurancePolicyUpdateSchema,
  linkCommitmentSchema,
  obligationCreateSchema,
  obligationUpdateSchema,
  operationalCommitmentSchema,
  reminderResolveSchema,
  reminderUpsertSchema,
  serviceContractCreateSchema,
  serviceContractUpdateSchema,
  taxScheduleCreateSchema,
  taxScheduleDateSchema,
  taxScheduleUpdateSchema,
  utilityContractCreateSchema,
  utilityContractUpdateSchema,
} from "@/modules/operations/schemas";

const opt = <T>(value: T | null | undefined) => (value ?? undefined) as T | undefined;

/* ---------------------------------------------------------- obligations */

export const createObligation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => obligationCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_operational_obligation", {
      _company_id: data.companyId,
      _obligation_type: data.obligationType,
      _title: data.title,
      _description: opt(data.description),
      _priority: data.priority,
      _due_date: opt(data.dueDate),
      _responsible_name: opt(data.responsibleName),
      _counterparty_id: opt(data.counterpartyId),
      _property_id: opt(data.propertyId),
      _reminder_lead_days: data.reminderLeadDays,
      _recurrence_frequency: data.recurrenceFrequency,
      _recurrence_interval: data.recurrenceInterval,
      _recurrence_end_date: opt(data.recurrenceEndDate),
      _commitment_id: opt(data.commitmentId),
      _code: opt(data.code),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateObligation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => obligationUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_operational_obligation", {
      _obligation_id: data.obligationId,
      _title: opt(data.title),
      _description: opt(data.description),
      _obligation_type: opt(data.obligationType),
      _status: opt(data.status),
      _priority: opt(data.priority),
      _due_date: opt(data.dueDate),
      _responsible_name: opt(data.responsibleName),
      _counterparty_id: opt(data.counterpartyId),
      _property_id: opt(data.propertyId),
      _reminder_lead_days: opt(data.reminderLeadDays),
      _recurrence_frequency: opt(data.recurrenceFrequency),
      _recurrence_interval: opt(data.recurrenceInterval),
      _recurrence_end_date: opt(data.recurrenceEndDate),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: data.obligationId };
  });

/* ----------------------------------------------------- service contracts */

export const createServiceContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => serviceContractCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_service_contract", {
      _company_id: data.companyId,
      _title: data.title,
      _service_type: data.serviceType,
      _counterparty_id: opt(data.counterpartyId),
      _contract_number: opt(data.contractNumber),
      _start_date: opt(data.startDate),
      _end_date: opt(data.endDate),
      _renewal_terms: opt(data.renewalTerms),
      _notice_period_days: opt(data.noticePeriodDays),
      _auto_renew: data.autoRenew,
      _obligation_id: opt(data.obligationId),
      _commitment_id: opt(data.commitmentId),
      _property_id: opt(data.propertyId),
      _reminder_lead_days: data.reminderLeadDays,
      _code: opt(data.code),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateServiceContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => serviceContractUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_service_contract", {
      _contract_id: data.contractId,
      _title: opt(data.title),
      _service_type: opt(data.serviceType),
      _counterparty_id: opt(data.counterpartyId),
      _contract_number: opt(data.contractNumber),
      _start_date: opt(data.startDate),
      _end_date: opt(data.endDate),
      _renewal_terms: opt(data.renewalTerms),
      _notice_period_days: opt(data.noticePeriodDays),
      _auto_renew: opt(data.autoRenew),
      _status: opt(data.status),
      _obligation_id: opt(data.obligationId),
      _reminder_lead_days: opt(data.reminderLeadDays),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: data.contractId };
  });

/* ------------------------------------------------------------ insurance */

export const createInsurancePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => insurancePolicyCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_insurance_policy", {
      _company_id: data.companyId,
      _title: data.title,
      _policy_type: data.policyType,
      _insurer_counterparty_id: opt(data.insurerCounterpartyId),
      _insurer_name: opt(data.insurerName),
      _broker_counterparty_id: opt(data.brokerCounterpartyId),
      _broker_name: opt(data.brokerName),
      _policy_number: opt(data.policyNumber),
      _insured_assets: opt(data.insuredAssets),
      _property_id: opt(data.propertyId),
      _effective_date: opt(data.effectiveDate),
      _expiry_date: opt(data.expiryDate),
      _excess_amount: opt(data.excessAmount),
      _obligation_id: opt(data.obligationId),
      _commitment_id: opt(data.commitmentId),
      _reminder_lead_days: data.reminderLeadDays,
      _code: opt(data.code),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateInsurancePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => insurancePolicyUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_insurance_policy", {
      _policy_id: data.policyId,
      _title: opt(data.title),
      _policy_type: opt(data.policyType),
      _insurer_counterparty_id: opt(data.insurerCounterpartyId),
      _insurer_name: opt(data.insurerName),
      _broker_counterparty_id: opt(data.brokerCounterpartyId),
      _broker_name: opt(data.brokerName),
      _policy_number: opt(data.policyNumber),
      _insured_assets: opt(data.insuredAssets),
      _property_id: opt(data.propertyId),
      _effective_date: opt(data.effectiveDate),
      _expiry_date: opt(data.expiryDate),
      _excess_amount: opt(data.excessAmount),
      _status: opt(data.status),
      _obligation_id: opt(data.obligationId),
      _reminder_lead_days: opt(data.reminderLeadDays),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: data.policyId };
  });

/* ------------------------------------------------------------ utilities */

export const createUtilityContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => utilityContractCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_utility_contract", {
      _company_id: data.companyId,
      _title: data.title,
      _utility_type: data.utilityType,
      _counterparty_id: opt(data.counterpartyId),
      _account_number: opt(data.accountNumber),
      _meter_identifier: opt(data.meterIdentifier),
      _service_address: opt(data.serviceAddress),
      _property_id: opt(data.propertyId),
      _unit_id: opt(data.unitId),
      _activation_date: opt(data.activationDate),
      _termination_date: opt(data.terminationDate),
      _obligation_id: opt(data.obligationId),
      _commitment_id: opt(data.commitmentId),
      _reminder_lead_days: data.reminderLeadDays,
      _code: opt(data.code),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateUtilityContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => utilityContractUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_utility_contract", {
      _contract_id: data.contractId,
      _title: opt(data.title),
      _utility_type: opt(data.utilityType),
      _counterparty_id: opt(data.counterpartyId),
      _account_number: opt(data.accountNumber),
      _meter_identifier: opt(data.meterIdentifier),
      _service_address: opt(data.serviceAddress),
      _property_id: opt(data.propertyId),
      _unit_id: opt(data.unitId),
      _activation_date: opt(data.activationDate),
      _termination_date: opt(data.terminationDate),
      _status: opt(data.status),
      _obligation_id: opt(data.obligationId),
      _reminder_lead_days: opt(data.reminderLeadDays),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: data.contractId };
  });

/* -------------------------------------------------------- tax schedules */

export const createTaxSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taxScheduleCreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_tax_schedule", {
      _company_id: data.companyId,
      _title: data.title,
      _tax_type: data.taxType,
      _jurisdiction: opt(data.jurisdiction),
      _reference: opt(data.reference),
      _tax_year: opt(data.taxYear),
      _property_id: opt(data.propertyId),
      _obligation_id: opt(data.obligationId),
      _commitment_id: opt(data.commitmentId),
      _reminder_lead_days: data.reminderLeadDays,
      _code: opt(data.code),
      _notes: opt(data.notes),
      _due_dates: data.dueDates.length > 0 ? data.dueDates : undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateTaxSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taxScheduleUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_tax_schedule", {
      _schedule_id: data.scheduleId,
      _title: opt(data.title),
      _tax_type: opt(data.taxType),
      _jurisdiction: opt(data.jurisdiction),
      _reference: opt(data.reference),
      _tax_year: opt(data.taxYear),
      _property_id: opt(data.propertyId),
      _status: opt(data.status),
      _obligation_id: opt(data.obligationId),
      _reminder_lead_days: opt(data.reminderLeadDays),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: data.scheduleId };
  });

export const addTaxScheduleDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taxScheduleDateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("add_tax_schedule_date", {
      _schedule_id: data.scheduleId,
      _due_date: data.dueDate,
      _label: opt(data.label),
      _reminder_date: opt(data.reminderDate),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

/* ------------------------------------------------------------- lifecycle */

/** Archiving never deletes: the row is retained and the audit trail keeps it. */
export const archiveOperationalRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveOperationalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_operational_record", {
      _entity_type: data.entityType,
      _entity_id: data.entityId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { id: data.entityId };
  });

export const linkOperationalCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => linkCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("link_operational_commitment", {
      _entity_type: data.entityType,
      _entity_id: data.entityId,
      // Passing null is how the UI unlinks a commitment from a record.
      _commitment_id: data.commitmentId as string,

    });
    if (error) throw new Error(error.message);
    return { id: data.entityId };
  });

/**
 * Creates a DRAFT commitment from an operational record and links it. The
 * commitment then owns the amount, the schedule and the approval; the
 * operational record only keeps the reference.
 */
export const createOperationalCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => operationalCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_operational_commitment", {
      _entity_type: data.entityType,
      _entity_id: data.entityId,
      _title: data.title,
      _commitment_type: data.commitmentType,
      _authorised_amount: data.authorisedAmount,
      _currency: data.currency,
      _counterparty_id: opt(data.counterpartyId),
      _start_date: opt(data.startDate),
      _end_date: opt(data.endDate),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

/* ------------------------------------------------------------- reminders */

export const upsertOperationalReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reminderUpsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("upsert_operational_reminder", {
      _company_id: data.companyId,
      _entity_type: data.entityType,
      _entity_id: data.entityId,
      _reason: data.reason,
      _remind_on: data.remindOn,
      _due_on: opt(data.dueOn),
      _severity: data.severity,
      _title: opt(data.title),
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const resolveOperationalReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reminderResolveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("resolve_operational_reminder", {
      _reminder_id: data.reminderId,
      _status: data.status,
      _notes: opt(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: data.reminderId };
  });

/** Idempotent: re-deriving the reminder set never duplicates a reminder. */
export const generateOperationalReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateRemindersSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: count, error } = await context.supabase.rpc("generate_operational_reminders", {
      _company_id: data.companyId,
    });
    if (error) throw new Error(error.message);
    return { created: Number(count ?? 0) };
  });
