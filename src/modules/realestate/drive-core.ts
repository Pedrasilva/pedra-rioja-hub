/**
 * Core "attach a document" logic, kept out of the *.functions.ts wrapper so
 * that file stays a thin server-function module. Reusable outside the HTTP
 * server-fn boundary (the Gmail sync pipeline calls this directly per
 * attachment). The file itself stays in Drive — the database only keeps
 * metadata.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type { attachDocumentSchema } from "@/modules/realestate/drive-schemas";

export async function attachDocumentCore(
  supabase: SupabaseClient,
  data: z.infer<typeof attachDocumentSchema>,
) {
  const { folderUrl, getFile, parseDriveId, uploadFile } = await import("@/lib/drive.server");
  const { resolveEntityFolder } = await import("@/lib/drive-sync.server");

  if (!data.file && !data.driveFileRef) {
    throw new Error("Provide a file to upload or a Drive link to attach.");
  }

  let driveFileId: string;
  let filename: string;
  let mimeType: string | null = null;
  let sizeBytes: number | null = null;
  let webViewLink: string | null = null;
  let parentFolderId: string | null = null;

  if (data.file) {
    parentFolderId = await resolveEntityFolder(
      supabase,
      data.companyId,
      data.entityType,
      data.entityId,
      data.folderKind,
    );
    const uploaded = await uploadFile({
      parentId: parentFolderId,
      name: data.file.name,
      mimeType: data.file.mimeType,
      contentBase64: data.file.contentBase64,
    });
    driveFileId = uploaded.id;
    filename = uploaded.name;
    mimeType = data.file.mimeType;
    sizeBytes = uploaded.size ? Number(uploaded.size) : null;
    webViewLink = uploaded.webViewLink ?? null;
  } else {
    const parsed = parseDriveId(data.driveFileRef!);
    if (!parsed) throw new Error("That does not look like a Drive file id or link.");
    const file = await getFile(parsed);
    driveFileId = file.id;
    filename = file.name;
    mimeType = file.mimeType ?? null;
    webViewLink = file.webViewLink ?? null;
    parentFolderId = file.parents?.[0] ?? null;
  }

  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      company_id: data.companyId,
      title: data.title,
      category: data.category ?? null,
      doc_type: data.docType ?? null,
      issue_date: data.issueDate || null,
      expiry_date: data.expiryDate || null,
      amount: typeof data.amount === "number" ? data.amount : null,
      currency: data.currency ?? null,
      notes: data.notes || null,
      tags: data.tags ?? [],
      original_filename: filename,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      drive_file_id: driveFileId,
      drive_folder_id: parentFolderId,
      drive_url: webViewLink ?? `https://drive.google.com/file/d/${driveFileId}/view`,
      drive_web_view_link: webViewLink,
      sync_status: "linked",
      status: "active",
      last_synced_at: new Date().toISOString(),
    })
    .select("id, title, drive_url")
    .single();
  if (error) throw new Error(error.message);

  const { error: linkError } = await supabase.from("document_links").insert({
    company_id: data.companyId,
    document_id: document.id,
    entity_type: data.entityType,
    entity_id: data.entityId,
    relation: data.relation ?? null,
  });
  if (linkError) throw new Error(linkError.message);

  return {
    ...document,
    folderUrl: parentFolderId ? folderUrl(parentFolderId) : null,
  };
}
