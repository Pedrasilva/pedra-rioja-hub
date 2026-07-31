import { z } from "zod";

export const requestExtractionSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export const getExtractionSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export const applyExtractionSchema = z.object({
  companyId: z.string().uuid(),
  extractionId: z.string().uuid(),
  documentId: z.string().uuid(),
  // Human-reviewed/edited core fields — never trust the model's values
  // straight through without this round-trip.
  coreFields: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().length(3).optional(),
  }),
});
