/**
 * Phase 8F.2 — acquisition pipeline server functions.
 *
 * Thin wrappers over the SECURITY DEFINER contract. The client never writes a
 * stage, never sets a decision and never creates a commitment implicitly: the
 * only commitment path is `createAcquisitionCommitment`, which a person has to
 * invoke, and which delegates to the Phase 8A commitment contract.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  activitySchema,
  archiveOpportunitySchema,
  createCommitmentSchema,
  linkCommitmentSchema,
  moveStageSchema,
  offerDecisionSchema,
  offerSchema,
  opportunityDraftSchema,
  opportunityIdSchema,
  opportunityUpdateSchema,
  taskSchema,
  taskStatusSchema,
  unlinkCommitmentSchema,
  valuationSchema,
} from "@/modules/acquisitions/schemas";

const nn = <T,>(v: T | null | undefined) => (v === null || v === "" ? undefined : (v ?? undefined));

export const createOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => opportunityDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_acquisition_opportunity", {
      _company_id: data.companyId,
      _title: data.title,
      _opportunity_type: data.opportunityType,
      _property_name: nn(data.propertyName),
      _address: nn(data.address),
      _location: nn(data.location),
      _source: nn(data.source),
      _broker_id: nn(data.brokerId),
      _seller_id: nn(data.sellerId),
      _contact_name: nn(data.contactName),
      _contact_email: nn(data.contactEmail),
      _contact_phone: nn(data.contactPhone),
      _assigned_to: nn(data.assignedTo),
      _probability: nn(data.probability),
      _link_kind: data.linkKind,
      _property_id: nn(data.propertyId),
      _asking_price: nn(data.askingPrice),
      _indicative_offer: nn(data.indicativeOffer),
      _valuation_amount: nn(data.valuationAmount),
      _target_acquisition_date: nn(data.targetAcquisitionDate),
      _expected_closing_date: nn(data.expectedClosingDate),
      _notes: nn(data.notes),
      _reference: nn(data.reference),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => opportunityUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_acquisition_opportunity", {
      _opportunity_id: data.opportunityId,
      _title: nn(data.title),
      _opportunity_type: nn(data.opportunityType),
      _property_name: nn(data.propertyName),
      _address: nn(data.address),
      _location: nn(data.location),
      _source: nn(data.source),
      _broker_id: nn(data.brokerId),
      _seller_id: nn(data.sellerId),
      _contact_name: nn(data.contactName),
      _contact_email: nn(data.contactEmail),
      _contact_phone: nn(data.contactPhone),
      _assigned_to: nn(data.assignedTo),
      _probability: nn(data.probability),
      _link_kind: nn(data.linkKind),
      _property_id: nn(data.propertyId),
      _asking_price: nn(data.askingPrice),
      _indicative_offer: nn(data.indicativeOffer),
      _valuation_amount: nn(data.valuationAmount),
      _target_acquisition_date: nn(data.targetAcquisitionDate),
      _expected_closing_date: nn(data.expectedClosingDate),
      _notes: nn(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: data.opportunityId };
  });

export const moveOpportunityStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => moveStageSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("move_acquisition_stage", {
      _opportunity_id: data.opportunityId,
      _stage: data.stage,
      _reason: nn(data.reason),
      _probability: nn(data.probability),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const archiveOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveOpportunitySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("archive_acquisition_opportunity", {
      _opportunity_id: data.opportunityId,
      _reason: nn(data.reason),
    });
    if (error) throw new Error(error.message);
    return { id: data.opportunityId };
  });

export const restoreOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => opportunityIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("restore_acquisition_opportunity", {
      _opportunity_id: data.opportunityId,
    });
    if (error) throw new Error(error.message);
    return { id: data.opportunityId };
  });

export const recordAcquisitionActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => activitySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("record_acquisition_activity", {
      _opportunity_id: data.opportunityId,
      _activity_type: data.activityType,
      _summary: data.summary,
      _body: nn(data.body),
      _occurred_at: nn(data.occurredAt),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const createAcquisitionTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taskSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_acquisition_task", {
      _opportunity_id: data.opportunityId,
      _description: data.description,
      _assignee_id: nn(data.assigneeId),
      _due_date: nn(data.dueDate),
      _priority: data.priority,
      _reminder_at: nn(data.reminderAt),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const setAcquisitionTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taskStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_acquisition_task_status", {
      _task_id: data.taskId,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { id: data.taskId };
  });

export const recordAcquisitionValuation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => valuationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("record_acquisition_valuation", {
      _opportunity_id: data.opportunityId,
      _estimated_value: data.estimatedValue,
      _method: data.method,
      _valued_on: nn(data.valuedOn),
      _comments: nn(data.comments),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const recordAcquisitionOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => offerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("record_acquisition_offer", {
      _opportunity_id: data.opportunityId,
      _amount: data.amount,
      _submitted_on: nn(data.submittedOn),
      _expires_on: nn(data.expiresOn),
      _negotiation_notes: nn(data.negotiationNotes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const decideAcquisitionOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => offerDecisionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("decide_acquisition_offer", {
      _offer_id: data.offerId,
      _decision: data.decision,
      _notes: nn(data.notes),
      _decided_on: nn(data.decidedOn),
    });
    if (error) throw new Error(error.message);
    return { id: data.offerId };
  });

export const linkAcquisitionCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => linkCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("link_acquisition_commitment", {
      _opportunity_id: data.opportunityId,
      _commitment_id: data.commitmentId,
      _reason: nn(data.reason),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const unlinkAcquisitionCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => unlinkCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("unlink_acquisition_commitment", {
      _link_id: data.linkId,
    });
    if (error) throw new Error(error.message);
    return { id: data.linkId };
  });

/**
 * The one commitment-creating path, and it is explicit: a person fills in a
 * form and presses a button. No trigger, stage move or offer acceptance calls
 * this. The database function delegates to `create_commitment_draft`.
 */
export const createAcquisitionCommitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createCommitmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_acquisition_commitment", {
      _opportunity_id: data.opportunityId,
      _title: data.title,
      _authorised_amount: data.authorisedAmount,
      _commitment_type: data.commitmentType,
      _counterparty_id: nn(data.counterpartyId),
      _start_date: nn(data.startDate),
      _end_date: nn(data.endDate),
      _notes: nn(data.notes),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });
