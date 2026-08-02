/**
 * Server-side core of the Gmail → Drive → extraction pipeline. Kept out of
 * the *.functions.ts wrapper so that file stays a thin server-function
 * module.
 *
 * Extraction failures for one attachment do not stop the batch; every
 * attempt is reported back in `items` so nothing silently disappears.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { DOCUMENT_ENTITY_LABELS } from "@/modules/realestate/drive-schemas";
import type {
  syncGmailInvoicesSchema,
  SyncGmailInvoicesResult,
} from "@/modules/realestate/gmail-sync-schemas";

export async function syncInvoicesFromGmailCore(
  supabase: SupabaseClient,
  data: z.infer<typeof syncGmailInvoicesSchema>,
): Promise<SyncGmailInvoicesResult> {
  const { searchMessages, getMessage, getAttachment } = await import("@/lib/gmail.server");
  const { attachDocumentCore } = await import("@/modules/realestate/drive-core");
  const { runDocumentExtraction } = await import("@/modules/realestate/extraction-core");

  const result: SyncGmailInvoicesResult = {
    messagesScanned: 0,
    attachmentsFound: 0,
    skippedDuplicates: 0,
    documentsCreated: 0,
    extractionsQueued: 0,
    items: [],
  };

  const messages = await searchMessages(data.query, data.maxMessages);
  result.messagesScanned = messages.length;

  for (const summary of messages) {
    const message = await getMessage(summary.id);
    const pdfAttachments = message.attachments.filter(
      (a) => a.mimeType === "application/pdf" || a.filename.toLowerCase().endsWith(".pdf"),
    );

    for (const attachment of pdfAttachments) {
      result.attachmentsFound += 1;

      const { data: existing } = await supabase
        .from("gmail_sync_state")
        .select("id, document_id")
        .eq("company_id", data.companyId)
        .eq("gmail_message_id", message.id)
        .eq("gmail_attachment_id", attachment.attachmentId)
        .maybeSingle();

      if (existing) {
        result.skippedDuplicates += 1;
        result.items.push({
          filename: attachment.filename,
          subject: message.subject,
          documentId: existing.document_id ?? undefined,
          status: "skipped_duplicate",
        });
        continue;
      }

      try {
        const { contentBase64 } = await getAttachment(message.id, attachment.attachmentId);

        const document = await attachDocumentCore(supabase, {
          companyId: data.companyId,
          entityType: data.entityType,
          entityId: data.entityId,
          title: message.subject || attachment.filename,
          category: "invoices",
          notes: `Synced from Gmail${message.from ? ` (${message.from})` : ""}${
            message.date ? ` — ${message.date}` : ""
          }`,
          relation: `Attached to ${DOCUMENT_ENTITY_LABELS[data.entityType]} via Gmail sync`,
          file: {
            name: attachment.filename,
            mimeType: attachment.mimeType,
            contentBase64,
          },
        });

        await supabase.from("gmail_sync_state").insert({
          company_id: data.companyId,
          gmail_message_id: message.id,
          gmail_attachment_id: attachment.attachmentId,
          document_id: document.id,
          entity_type: data.entityType,
          entity_id: data.entityId,
        });

        result.documentsCreated += 1;
        const item: SyncGmailInvoicesResult["items"][number] = {
          filename: attachment.filename,
          subject: message.subject,
          documentId: document.id,
          status: "created",
        };
        result.items.push(item);

        if (data.autoExtract) {
          try {
            const extraction = await runDocumentExtraction(supabase, {
              companyId: data.companyId,
              documentId: document.id,
            });
            item.extractionId = extraction.extractionId;
            result.extractionsQueued += 1;
          } catch (err) {
            item.status = "extraction_failed";
            item.error = err instanceof Error ? err.message : "Extraction failed";
          }
        }
      } catch (err) {
        result.items.push({
          filename: attachment.filename,
          subject: message.subject,
          status: "attach_failed",
          error: err instanceof Error ? err.message : "Could not attach this file",
        });
      }
    }
  }

  return result;
}
