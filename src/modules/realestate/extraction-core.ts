/**
 * Core extraction logic, kept out of the *.functions.ts wrapper so that file
 * stays a thin server-function module. Reusable outside the HTTP server-fn
 * boundary (the Gmail sync pipeline calls this directly per attachment
 * without a round trip per file).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Json } from "@/integrations/supabase/types";

export async function runDocumentExtraction(
  supabase: SupabaseClient,
  data: { companyId: string; documentId: string },
) {
  const { downloadFile } = await import("@/lib/drive.server");
  const { extractDocumentFields, isExtractableMimeType } = await import(
    "@/lib/claude-extraction.server"
  );

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, company_id, drive_file_id, mime_type, original_filename")
    .eq("id", data.documentId)
    .eq("company_id", data.companyId)
    .single();
  if (docError || !doc) throw new Error(docError?.message ?? "Document not found");
  if (!doc.drive_file_id) throw new Error("This document has no linked Drive file to read.");

  const { data: row, error: insertError } = await supabase
    .from("document_extractions")
    .insert({ company_id: data.companyId, document_id: data.documentId, status: "pending" })
    .select("id")
    .single();
  if (insertError || !row) throw new Error(insertError?.message ?? "Could not start extraction");

  try {
    const file = await downloadFile(doc.drive_file_id);
    if (!isExtractableMimeType(file.mimeType)) {
      throw new Error(
        `Cannot extract from ${file.mimeType || "this file type"}. Supported: PDF, PNG, JPEG, WEBP.`,
      );
    }

    // The company's own taxonomy goes along for the ride so invoices come
    // back with a suggested code — a prefill for the review queue, never
    // an auto-applied classification.
    const { data: classifications } = await supabase
      .from("financial_classifications")
      .select("code, name_en, nature")
      .eq("company_id", data.companyId)
      .eq("is_active", true)
      .order("sort_order");

    const result = await extractDocumentFields({
      contentBase64: file.contentBase64,
      mimeType: file.mimeType,
      fileName: doc.original_filename ?? file.name,
      classifications: (classifications ?? []).map(
        (c: { code: string; name_en: string; nature: string }) => ({
          code: c.code,
          label: c.name_en,
          nature: c.nature,
        }),
      ),
    });

    const { error: updateError } = await supabase
      .from("document_extractions")
      .update({
        status: "completed",
        document_kind: result.document_kind,
        extracted_json: result as unknown as Json,
        summary: result.summary,
        raw_text: result.raw_text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);

    return { extractionId: row.id as string, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    await supabase
      .from("document_extractions")
      .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    throw new Error(message);
  }
}
