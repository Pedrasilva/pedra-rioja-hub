import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  attachDocumentSchema,
  connectDriveRootSchema,
  driveStatusSchema,
  listDocumentsSchema,
  syncDriveFoldersSchema,
} from "@/modules/realestate/drive-schemas";

/** Whether Drive is connected, and where this company's root folder lives. */
export const getDriveStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => driveStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { isDriveConfigured } = await import("@/lib/drive.server");
    const { readSetting, DRIVE_ROOT_URL_SETTING_KEY } = await import("@/lib/drive-sync.server");
    const { DRIVE_ROOT_SETTING_KEY } = await import("@/modules/realestate/drive-template");

    const [rootFolderId, rootFolderUrl] = await Promise.all([
      readSetting(context.supabase, data.companyId, DRIVE_ROOT_SETTING_KEY),
      readSetting(context.supabase, data.companyId, DRIVE_ROOT_URL_SETTING_KEY),
    ]);

    const { count: pending } = await context.supabase
      .from("drive_folders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .is("drive_folder_id", null);

    const { count: synced } = await context.supabase
      .from("drive_folders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId)
      .not("drive_folder_id", "is", null);

    return {
      connected: isDriveConfigured(),
      rootFolderId,
      rootFolderUrl,
      pendingFolders: pending ?? 0,
      syncedFolders: synced ?? 0,
    };
  });

/**
 * Claims an existing Drive folder as the company root (or creates one), then
 * provisions the standard top-level taxonomy inside it.
 */
export const connectDriveRoot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => connectDriveRootSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { createFolder, folderUrl, parseDriveId } = await import("@/lib/drive.server");
    const { DRIVE_ROOT_URL_SETTING_KEY, ensureTopLevel, verifyFolder, writeSetting } = await import(
      "@/lib/drive-sync.server"
    );
    const { DRIVE_ROOT_SETTING_KEY } = await import("@/modules/realestate/drive-template");

    let folderId: string;
    let url: string;

    if (data.rootFolderRef) {
      const parsed = parseDriveId(data.rootFolderRef);
      if (!parsed) throw new Error("That does not look like a Drive folder id or link.");
      const folder = await verifyFolder(parsed);
      folderId = folder.id;
      url = folder.webViewLink ?? folderUrl(folder.id);
    } else {
      const folder = await createFolder(null, data.rootFolderName ?? "Pedra Rioja");
      folderId = folder.id;
      url = folder.webViewLink ?? folderUrl(folder.id);
    }

    await writeSetting(
      context.supabase,
      data.companyId,
      DRIVE_ROOT_SETTING_KEY,
      folderId,
      "Google Drive root folder for this company",
    );
    await writeSetting(context.supabase, data.companyId, DRIVE_ROOT_URL_SETTING_KEY, url);
    await ensureTopLevel(context.supabase, data.companyId, folderId);

    return { rootFolderId: folderId, rootFolderUrl: url };
  });

/** Materialises pending folder plans in Drive. Safe to run repeatedly. */
export const syncDriveFolders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => syncDriveFoldersSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { syncPlannedFolders } = await import("@/lib/drive-sync.server");
    return syncPlannedFolders(context.supabase, data.companyId, data.propertyId);
  });

/**
 * Uploads a file to Drive (or links one that already exists there) and records
 * it as a document with metadata plus a link row to the owning entity.
 * The file itself stays in Drive — the database only keeps metadata.
 */
export const attachDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => attachDocumentSchema.parse(data))
  .handler(async ({ data, context }) => {
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
        context.supabase,
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

    const { data: document, error } = await context.supabase
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
        sync_status: "synced",
        status: "active",
        last_synced_at: new Date().toISOString(),
      })
      .select("id, title, drive_url")
      .single();
    if (error) throw new Error(error.message);

    const { error: linkError } = await context.supabase.from("document_links").insert({
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
  });

/** Documents attached to any entity, newest first. */
export const listEntityDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listDocumentsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: links, error } = await context.supabase
      .from("document_links")
      .select("document_id")
      .eq("company_id", data.companyId)
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId);
    if (error) throw new Error(error.message);

    const ids = (links ?? []).map((l: { document_id: string }) => l.document_id);
    if (!ids.length) return [];

    const { data: docs, error: dErr } = await context.supabase
      .from("documents")
      .select(
        "id, title, category, doc_type, status, issue_date, expiry_date, amount, currency, notes, version, sync_status, original_filename, drive_url, tags",
      )
      .in("id", ids)
      .is("deleted_at", null)
      .order("issue_date", { ascending: false });
    if (dErr) throw new Error(dErr.message);
    return docs ?? [];
  });
