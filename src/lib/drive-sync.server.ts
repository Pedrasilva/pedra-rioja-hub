/**
 * Drive folder reconciliation (server-only).
 *
 * The database holds the folder *plan* (`drive_folders`, sync_status = pending);
 * this module turns that plan into real Drive folders and records the ids back.
 * Every step is claim-or-create, so running a sync twice never duplicates a folder.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureFolder, folderUrl, getFile } from "@/lib/drive.server";
import { DRIVE_ROOT_SETTING_KEY, DRIVE_TOP_LEVEL } from "@/modules/realestate/drive-template";

type Db = SupabaseClient<any, "public", any>;

export const DRIVE_ROOT_URL_SETTING_KEY = "drive_root_folder_url";

/** Company-level fallback folder for entities that do not hang off a property. */
const ENTITY_FALLBACK_PATH: Record<string, string> = {
  suppliers: "02 Suppliers",
  transactions: "06 Accounting",
  tenants: "03 Tenants",
};

export async function readSetting(db: Db, companyId: string, key: string) {
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("company_id", companyId)
    .eq("key", key)
    .maybeSingle();
  const value = data?.value;
  return typeof value === "string" ? value : value == null ? null : String(value);
}

export async function writeSetting(db: Db, companyId: string, key: string, value: string, description?: string) {
  const { data: existing } = await db
    .from("settings")
    .select("id")
    .eq("company_id", companyId)
    .eq("key", key)
    .maybeSingle();
  const row = { company_id: companyId, key, value: value as unknown as never, description: description ?? null };
  const { error } = existing
    ? await db.from("settings").update(row).eq("id", existing.id)
    : await db.from("settings").insert(row);
  if (error) throw new Error(error.message);
}

export async function getRootFolderId(db: Db, companyId: string) {
  const id = await readSetting(db, companyId, DRIVE_ROOT_SETTING_KEY);
  if (!id) throw new Error("No Drive root folder is configured for this company yet.");
  return id;
}

type Cache = Map<string, string>;

/**
 * Resolves `path` (relative to the company root) to a Drive folder id, creating
 * any missing segment and writing the id back onto every matching plan row.
 */
export async function ensurePath(
  db: Db,
  companyId: string,
  rootId: string,
  path: string,
  cache: Cache,
): Promise<string> {
  const segments = path.split("/").filter(Boolean);
  let parentId = rootId;
  let acc = "";

  for (const segment of segments) {
    acc = acc ? `${acc}/${segment}` : segment;
    const cached = cache.get(acc);
    if (cached) {
      parentId = cached;
      continue;
    }

    const { data: known } = await db
      .from("drive_folders")
      .select("id, drive_folder_id")
      .eq("company_id", companyId)
      .eq("path", acc)
      .not("drive_folder_id", "is", null)
      .limit(1)
      .maybeSingle();

    let driveId = known?.drive_folder_id as string | undefined;

    if (!driveId) {
      const folder = await ensureFolder(parentId, segment);
      driveId = folder.id;

      const synced = {
        drive_folder_id: folder.id,
        drive_url: folder.webViewLink ?? folderUrl(folder.id),
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      };

      const { data: planned } = await db
        .from("drive_folders")
        .select("id")
        .eq("company_id", companyId)
        .eq("path", acc);

      if (planned?.length) {
        const { error } = await db
          .from("drive_folders")
          .update(synced)
          .in("id", planned.map((r: { id: string }) => r.id));
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("drive_folders").insert({
          company_id: companyId,
          entity_type: "folder",
          entity_id: null,
          folder_kind: acc,
          path: acc,
          ...synced,
        });
        if (error) throw new Error(error.message);
      }
    }

    cache.set(acc, driveId);
    parentId = driveId;
  }

  return parentId;
}

/** Creates the standard top-level taxonomy beneath the root. */
export async function ensureTopLevel(db: Db, companyId: string, rootId: string) {
  const cache: Cache = new Map();
  for (const name of DRIVE_TOP_LEVEL) {
    await ensurePath(db, companyId, rootId, name, cache);
  }
  return cache;
}

/** Materialises every pending folder plan row (optionally for one property). */
export async function syncPlannedFolders(db: Db, companyId: string, propertyId?: string) {
  const rootId = await getRootFolderId(db, companyId);
  const cache = await ensureTopLevel(db, companyId, rootId);

  let query = db
    .from("drive_folders")
    .select("id, path, entity_type, entity_id")
    .eq("company_id", companyId)
    .is("drive_folder_id", null);
  if (propertyId) query = query.eq("entity_id", propertyId);

  const { data: pending, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (pending ?? []).slice().sort((a, b) => a.path.split("/").length - b.path.split("/").length);
  for (const row of rows) {
    await ensurePath(db, companyId, rootId, row.path, cache);
  }
  return { created: rows.length };
}

/** Drive folder id a document for this entity should live in. */
export async function resolveEntityFolder(
  db: Db,
  companyId: string,
  entityType: string,
  entityId: string,
  folderKind?: string,
): Promise<string> {
  const rootId = await getRootFolderId(db, companyId);
  const cache: Cache = new Map();

  const attempts: Array<{ entity_type: string; entity_id: string; folder_kind: string }> = [];
  if (folderKind) attempts.push({ entity_type: entityType, entity_id: entityId, folder_kind: folderKind });
  attempts.push({ entity_type: entityType, entity_id: entityId, folder_kind: "root" });

  for (const attempt of attempts) {
    const { data } = await db
      .from("drive_folders")
      .select("path")
      .eq("company_id", companyId)
      .eq("entity_type", attempt.entity_type)
      .eq("entity_id", attempt.entity_id)
      .eq("folder_kind", attempt.folder_kind)
      .maybeSingle();
    if (data?.path) return ensurePath(db, companyId, rootId, data.path, cache);
  }

  const fallback = ENTITY_FALLBACK_PATH[entityType];
  if (fallback) return ensurePath(db, companyId, rootId, fallback, cache);
  return ensurePath(db, companyId, rootId, "99 Archive", cache);
}

/** Verifies a user-supplied root folder reference is a real, reachable folder. */
export async function verifyFolder(driveId: string) {
  const file = await getFile(driveId);
  if (file.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("That Drive link points to a file, not a folder.");
  }
  if (file.trashed) throw new Error("That Drive folder is in the trash.");
  return file;
}
