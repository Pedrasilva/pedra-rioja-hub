import { z } from "zod";

export const applyInvoiceSchema = z.object({
  companyId: z.string().uuid(),
  extractionId: z.string().uuid(),
  propertyId: z.string().uuid().optional(),
});

export const applyBankStatementSchema = z.object({
  companyId: z.string().uuid(),
  extractionId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
});
