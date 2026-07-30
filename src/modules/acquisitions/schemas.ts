/**
 * Phase 8F.2 — acquisition pipeline contracts.
 *
 * An opportunity is an operational record. Every figure below is an indicative
 * estimate used to run a deal conversation — never an accounting value. Nothing
 * in this module posts a journal, creates a commitment on its own, writes a
 * cash-flow entry, records a payment or touches a bank transaction (§5C, §5D).
 */

import { z } from "zod";

export const ACQUISITION_STAGES = [
  { value: "lead", label: "Lead" },
  { value: "initial_review", label: "Initial review" },
  { value: "under_analysis", label: "Under analysis" },
  { value: "offer_preparation", label: "Offer preparation" },
  { value: "offer_submitted", label: "Offer submitted" },
  { value: "negotiation", label: "Negotiation" },
  { value: "offer_accepted", label: "Offer accepted" },
  { value: "offer_rejected", label: "Offer rejected" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

/** The columns the board renders, in pipeline order. */
export const BOARD_STAGES = ACQUISITION_STAGES.map((s) => s.value);

export const OPPORTUNITY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "retail", label: "Retail" },
  { value: "office", label: "Office" },
  { value: "industrial", label: "Industrial" },
  { value: "land", label: "Land" },
  { value: "building", label: "Building" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "portfolio", label: "Portfolio" },
  { value: "other", label: "Other" },
] as const;

export const LINK_KINDS = [
  { value: "existing_property", label: "Existing property" },
  { value: "prospective_property", label: "Prospective property" },
  { value: "land", label: "Land" },
  { value: "building", label: "Building" },
  { value: "portfolio", label: "Portfolio acquisition" },
] as const;

export const ACTIVITY_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "phone_call", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "valuation", label: "Valuation" },
  { value: "broker_discussion", label: "Broker discussion" },
  { value: "internal_review", label: "Internal review" },
  { value: "site_visit", label: "Site visit" },
  { value: "decision", label: "Decision" },
  { value: "note", label: "Note" },
] as const;

export const TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const VALUATION_METHODS = [
  { value: "comparable", label: "Comparable evidence" },
  { value: "income", label: "Income capitalisation" },
  { value: "cost", label: "Depreciated cost" },
  { value: "broker_opinion", label: "Broker opinion" },
  { value: "desktop", label: "Desktop estimate" },
  { value: "formal_appraisal", label: "Formal appraisal" },
  { value: "other", label: "Other" },
] as const;

export const OFFER_DECISIONS = [
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "expired", label: "Expired" },
] as const;

export type AcquisitionStage = (typeof ACQUISITION_STAGES)[number]["value"];

/**
 * The permitted moves, mirroring `acquisition_stage_transitions`. Presentation
 * only — the database decides, and refuses anything not listed there.
 */
export const STAGE_TRANSITIONS: Record<
  AcquisitionStage,
  { to: AcquisitionStage; reopen?: boolean; requiresManage?: boolean }[]
> = {
  lead: [{ to: "initial_review" }, { to: "withdrawn" }],
  initial_review: [{ to: "under_analysis" }, { to: "offer_rejected" }, { to: "withdrawn" }],
  under_analysis: [{ to: "offer_preparation" }, { to: "offer_rejected" }, { to: "withdrawn" }],
  offer_preparation: [{ to: "offer_submitted" }, { to: "under_analysis" }, { to: "withdrawn" }],
  offer_submitted: [
    { to: "negotiation" },
    { to: "offer_accepted", requiresManage: true },
    { to: "offer_rejected" },
    { to: "withdrawn" },
  ],
  negotiation: [
    { to: "offer_submitted" },
    { to: "offer_accepted", requiresManage: true },
    { to: "offer_rejected" },
    { to: "withdrawn" },
  ],
  offer_accepted: [{ to: "withdrawn", requiresManage: true }],
  offer_rejected: [
    { to: "under_analysis", reopen: true, requiresManage: true },
    { to: "negotiation", reopen: true, requiresManage: true },
  ],
  withdrawn: [{ to: "lead", reopen: true, requiresManage: true }],
};

export function permittedMoves(
  stage: string | null | undefined,
  canManage: boolean,
): AcquisitionStage[] {
  const moves = STAGE_TRANSITIONS[(stage ?? "lead") as AcquisitionStage] ?? [];
  return moves.filter((m) => canManage || !m.requiresManage).map((m) => m.to);
}

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
  fallback = "—",
) {
  if (!value) return fallback;
  return options.find((o) => o.value === value)?.label ?? value;
}

const uuid = z.string().uuid();
const optionalText = z.string().trim().max(4000).optional().nullable();
const optionalDate = z.string().trim().min(1).optional().nullable();
const optionalMoney = z.coerce.number().min(0).optional().nullable();

export const opportunityDraftSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "Give the opportunity a title").max(200),
  reference: z.string().trim().max(60).optional().nullable(),
  opportunityType: z.string().trim().min(1).default("other"),
  propertyName: optionalText,
  address: optionalText,
  location: optionalText,
  source: optionalText,
  brokerId: uuid.optional().nullable(),
  sellerId: uuid.optional().nullable(),
  contactName: optionalText,
  contactEmail: z.string().trim().email("Enter a valid email").optional().nullable().or(z.literal("")),
  contactPhone: optionalText,
  assignedTo: uuid.optional().nullable(),
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  linkKind: z.string().trim().min(1).default("prospective_property"),
  propertyId: uuid.optional().nullable(),
  askingPrice: optionalMoney,
  indicativeOffer: optionalMoney,
  valuationAmount: optionalMoney,
  targetAcquisitionDate: optionalDate,
  expectedClosingDate: optionalDate,
  notes: optionalText,
});

export const opportunityUpdateSchema = opportunityDraftSchema
  .omit({ companyId: true, reference: true })
  .partial()
  .extend({ opportunityId: uuid });

export const moveStageSchema = z.object({
  opportunityId: uuid,
  stage: z.enum([
    "lead",
    "initial_review",
    "under_analysis",
    "offer_preparation",
    "offer_submitted",
    "negotiation",
    "offer_accepted",
    "offer_rejected",
    "withdrawn",
  ]),
  reason: optionalText,
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
});

export const archiveOpportunitySchema = z.object({
  opportunityId: uuid,
  reason: optionalText,
});

export const opportunityIdSchema = z.object({ opportunityId: uuid });

export const activitySchema = z.object({
  opportunityId: uuid,
  activityType: z.string().trim().min(1).default("note"),
  summary: z.string().trim().min(2, "Say what happened").max(300),
  body: optionalText,
  occurredAt: z.string().trim().min(1).optional().nullable(),
});

export const taskSchema = z.object({
  opportunityId: uuid,
  description: z.string().trim().min(2, "Describe the task").max(300),
  assigneeId: uuid.optional().nullable(),
  dueDate: optionalDate,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  reminderAt: z.string().trim().min(1).optional().nullable(),
});

export const taskStatusSchema = z.object({
  taskId: uuid,
  status: z.enum(["open", "completed", "cancelled"]),
});

export const valuationSchema = z.object({
  opportunityId: uuid,
  estimatedValue: z.coerce.number().min(0, "A valuation needs an estimated value"),
  method: z.string().trim().min(1).default("other"),
  valuedOn: optionalDate,
  comments: optionalText,
});

export const offerSchema = z.object({
  opportunityId: uuid,
  amount: z.coerce.number().min(0, "An offer needs an amount"),
  submittedOn: optionalDate,
  expiresOn: optionalDate,
  negotiationNotes: optionalText,
});

export const offerDecisionSchema = z.object({
  offerId: uuid,
  decision: z.enum(["accepted", "rejected", "withdrawn", "expired"]),
  notes: optionalText,
  decidedOn: optionalDate,
});

export const linkCommitmentSchema = z.object({
  opportunityId: uuid,
  commitmentId: uuid,
  reason: optionalText,
});

export const unlinkCommitmentSchema = z.object({ linkId: uuid });

export const createCommitmentSchema = z.object({
  opportunityId: uuid,
  title: z.string().trim().min(2, "Give the commitment a title").max(200),
  authorisedAmount: z.coerce.number().min(0).default(0),
  commitmentType: z.string().trim().min(1).default("purchase_order"),
  counterpartyId: uuid.optional().nullable(),
  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalText,
});

export type OpportunityDraftInput = z.infer<typeof opportunityDraftSchema>;
export type MoveStageInput = z.infer<typeof moveStageSchema>;
export type OfferInput = z.infer<typeof offerSchema>;
export type ValuationInput = z.infer<typeof valuationSchema>;
