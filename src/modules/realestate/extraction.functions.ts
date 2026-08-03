import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  applyExtractionSchema,
  getExtractionSchema,
  requestExtractionSchema,
} from "@/modules/realestate/extraction-schemas";

/** Whether extraction is available at all in this deployment. */
export const getExtractionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isClaudeConfigured } = await import("@/lib/claude-extraction.server");
  return { configured: isClaudeConfigured() };
});

/**
 * Downloads the document's file from Drive, sends it to Claude, and stores
 * the structured result. Nothing on the `documents` row changes yet — this
 * only produces something to review.
 */
export const requestDocumentExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => requestExtractionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { runDocumentExtraction } = await import("@/modules/realestate/extraction-core");
    return runDocumentExtraction(context.supabase, { ...data, userId: context.userId });
  });

/** Latest extraction attempt for a document, if any. */
export const getLatestExtraction = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => getExtractionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("document_extractions")
      .select("*")
      .eq("company_id", data.companyId)
      .eq("document_id", data.documentId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

/**
 * Writes the human-reviewed core fields onto the document row and marks the
 * extraction as applied. Only the four core fields ever touch the document —
 * kind-specific details (transactions, instalments, loan terms) stay in
 * `document_extractions` for now as reference, not auto-posted into
 * banking/financing records.
 */
export const applyDocumentExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => applyExtractionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: extraction, error: exError } = await context.supabase
      .from("document_extractions")
      .select("id, raw_text, summary")
      .eq("id", data.extractionId)
      .eq("company_id", data.companyId)
      .single();
    if (exError || !extraction) throw new Error(exError?.message ?? "Extraction not found");

    const { error: docError } = await context.supabase
      .from("documents")
      .update({
        ...(data.coreFields.title ? { title: data.coreFields.title } : {}),
        ...(data.coreFields.issueDate ? { issue_date: data.coreFields.issueDate } : {}),
        ...(data.coreFields.expiryDate ? { expiry_date: data.coreFields.expiryDate } : {}),
        ...(data.coreFields.amount != null ? { amount: data.coreFields.amount } : {}),
        ...(data.coreFields.currency ? { currency: data.coreFields.currency } : {}),
        ocr_text: extraction.raw_text,
        ai_summary: extraction.summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.documentId)
      .eq("company_id", data.companyId);
    if (docError) throw new Error(docError.message);

    const { error: markError } = await context.supabase
      .from("document_extractions")
      .update({
        status: "applied",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.extractionId);
    if (markError) throw new Error(markError.message);

    return { ok: true };
  });
