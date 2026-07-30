/**
 * Phase 8F.1 — payment execution contracts.
 *
 * Payment runs orchestrate *execution* only. Nothing in this file carries an
 * accounting amount: every figure a payment screen shows is read from the
 * financial document behind the instruction (§5C, §5D). The schemas here
 * describe intent — which documents to pay, when, through which channel.
 */

import { z } from "zod";

export const PAYMENT_RUN_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "exported", label: "Exported" },
  { value: "executed", label: "Executed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const PAYMENT_INSTRUCTION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "ready", label: "Ready" },
  { value: "exported", label: "Exported" },
  { value: "executed", label: "Executed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const PAYMENT_METHODS = [
  { value: "transfer", label: "Bank transfer" },
  { value: "direct_debit", label: "Direct debit" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;

export const EXPORT_FORMATS = [
  { value: "sepa_xml", label: "SEPA credit transfer (XML)" },
  { value: "csv", label: "Bank CSV" },
  { value: "api", label: "Banking provider API" },
] as const;

export type PaymentRunStatus = (typeof PAYMENT_RUN_STATUSES)[number]["value"];
export type PaymentInstructionStatus = (typeof PAYMENT_INSTRUCTION_STATUSES)[number]["value"];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];
export type ExportFormat = (typeof EXPORT_FORMATS)[number]["value"];

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
  fallback = "—",
) {
  if (!value) return fallback;
  return options.find((o) => o.value === value)?.label ?? value;
}

/** The lifecycle, in order. Used by the UI to render progress, never to enforce. */
export const PAYMENT_RUN_LIFECYCLE: PaymentRunStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "exported",
  "executed",
  "completed",
];

const uuid = z.string().uuid();
const optionalText = z.string().trim().min(1).max(2000).optional().nullable();

export const paymentRunDraftSchema = z.object({
  companyId: uuid,
  title: z.string().trim().min(2, "Give the payment run a title").max(200),
  reference: z.string().trim().max(60).optional().nullable(),
  description: optionalText,
  scheduledExecutionDate: z.string().trim().min(1).optional().nullable(),
});

export const paymentRunUpdateSchema = z.object({
  runId: uuid,
  title: z.string().trim().min(2).max(200).optional().nullable(),
  description: optionalText,
  scheduledExecutionDate: z.string().trim().min(1).optional().nullable(),
  notes: optionalText,
});

export const addInstructionSchema = z.object({
  runId: uuid,
  documentId: uuid,
  paymentMethod: z.enum(["transfer", "direct_debit", "cheque", "card", "cash", "other"]).default("transfer"),
  paymentReference: z.string().trim().max(140).optional().nullable(),
  bankAccountId: uuid.optional().nullable(),
});

export const updateInstructionSchema = z.object({
  instructionId: uuid,
  paymentMethod: z
    .enum(["transfer", "direct_debit", "cheque", "card", "cash", "other"])
    .optional()
    .nullable(),
  paymentReference: z.string().trim().max(140).optional().nullable(),
  bankAccountId: uuid.optional().nullable(),
  notes: optionalText,
});

export const instructionIdSchema = z.object({ instructionId: uuid });

export const failInstructionSchema = z.object({
  instructionId: uuid,
  reason: z.string().trim().min(3, "Say why the payment failed").max(500),
});

export const runIdSchema = z.object({ runId: uuid });

export const requestRunApprovalSchema = z.object({
  runId: uuid,
  reason: optionalText,
});

export const exportRunSchema = z.object({
  runId: uuid,
  format: z.enum(["sepa_xml", "csv", "api"]),
  fileName: z.string().trim().max(200).optional().nullable(),
  contentHash: z.string().trim().max(128).optional().nullable(),
  provider: z.string().trim().max(80).optional().nullable(),
  batchId: uuid.optional().nullable(),
  notes: optionalText,
});

export const executeRunSchema = z.object({
  runId: uuid,
  executionDate: z.string().trim().min(1).optional().nullable(),
});

export const completeRunSchema = z.object({
  runId: uuid,
  notes: optionalText,
});

export const reasonedRunSchema = z.object({
  runId: uuid,
  reason: z.string().trim().min(3, "A reason is required").max(500),
});

export const archiveRunSchema = z.object({
  runId: uuid,
  reason: optionalText,
});

export type PaymentRunDraftInput = z.infer<typeof paymentRunDraftSchema>;
export type AddInstructionInput = z.infer<typeof addInstructionSchema>;
export type ExportRunInput = z.infer<typeof exportRunSchema>;
