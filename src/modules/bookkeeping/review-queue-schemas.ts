import { z } from "zod";

/**
 * Two-checkpoint review workflow. Confirming the supplier and confirming the
 * classification are separate decisions and are recorded separately — a
 * document is only fileable once both are true.
 */

export const confirmCounterpartySchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
  /** Null means "no counterparty" — allowed, but it must be a deliberate choice. */
  counterpartyId: z.string().uuid().nullable(),
  /** Optional override of the name shown on the document. */
  counterpartyName: z.string().trim().min(1).max(200).optional(),
  /** Direction can be corrected at the same time when it wasn't auto-confirmed. */
  direction: z.enum(["inbound", "outbound"]).optional(),
});

export const confirmClassificationSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
  classificationId: z.string().uuid(),
  propertyId: z.string().uuid().nullable().optional(),
});

export const rejectDocumentSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

export const ignoreDocumentSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export const fileDocumentSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export const reopenReviewSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
});
