import { z } from "zod";
import { DOCUMENT_ENTITY_TYPES } from "@/modules/realestate/drive-schemas";

export const syncGmailInvoicesSchema = z.object({
  companyId: z.string().uuid(),
  /** Which record the pulled invoices get attached to, e.g. one financing agreement. */
  entityType: z.enum(DOCUMENT_ENTITY_TYPES),
  entityId: z.string().uuid(),
  /** Plain Gmail search syntax, e.g. `from:millenniumbcp.pt has:attachment filename:pdf 450016454` */
  query: z.string().trim().min(1),
  /** Whether to queue a Claude extraction for each newly-attached PDF right away. */
  autoExtract: z.boolean().default(true),
  maxMessages: z.number().int().min(1).max(50).default(25),
});
export type SyncGmailInvoicesInput = z.infer<typeof syncGmailInvoicesSchema>;

export type SyncGmailInvoicesResult = {
  messagesScanned: number;
  attachmentsFound: number;
  skippedDuplicates: number;
  documentsCreated: number;
  extractionsQueued: number;
  items: Array<{
    filename: string;
    subject: string | null;
    documentId?: string;
    extractionId?: string;
    status: "created" | "skipped_duplicate" | "extraction_failed" | "attach_failed";
    error?: string;
  }>;
};
