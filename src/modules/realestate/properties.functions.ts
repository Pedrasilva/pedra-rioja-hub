import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  planChildFolder,
  planPropertyFolders,
  type PlannedFolder,
} from "@/modules/realestate/drive-template";

const createPropertySchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  propertyType: z.string().default("apartment"),
  status: z.string().default("owned"),
  addressLine1: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  areaM2: z.number().optional(),
  acquisitionDate: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Creates a property and records the Google Drive folder plan for it.
 *
 * Folder rows are written with sync_status = 'pending'; the Drive integration
 * (Phase 2.5) turns them into real folders and fills in drive_folder_id/url.
 */
export const createProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createPropertySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: property, error } = await context.supabase
      .from("properties")
      .insert({
        company_id: data.companyId,
        name: data.name,
        property_type: data.propertyType,
        status: data.status,
        address_line1: data.addressLine1 ?? null,
        postal_code: data.postalCode ?? null,
        city: data.city ?? null,
        district: data.district ?? null,
        area_m2: data.areaM2 ?? null,
        acquisition_date: data.acquisitionDate ?? null,
        notes: data.notes ?? null,
      })
      .select("id, code, name, company_id")
      .single();

    if (error) throw new Error(error.message);

    const folders: PlannedFolder[] = planPropertyFolders(property.id, property.code ?? property.id);
    const { error: folderError } = await context.supabase.from("drive_folders").insert(
      folders.map((f) => ({
        company_id: property.company_id,
        entity_type: f.entity_type,
        entity_id: f.entity_id,
        folder_kind: f.folder_kind,
        path: f.path,
        sync_status: "pending",
      })),
    );
    if (folderError) throw new Error(folderError.message);

    return property;
  });

const childFolderSchema = z.object({
  companyId: z.string().uuid(),
  entityType: z.enum(["financing_agreements", "tenancy_agreements", "capex_projects"]),
  entityId: z.string().uuid(),
  propertyCode: z.string().min(1),
  label: z.string().min(1),
});

/** Queues the Drive folder for a financing agreement, tenancy or project. */
export const planEntityDriveFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => childFolderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const planned = planChildFolder(data.entityType, data.entityId, data.propertyCode, data.label);
    if (!planned) return null;

    const { error } = await context.supabase.from("drive_folders").upsert(
      {
        company_id: data.companyId,
        entity_type: planned.entity_type,
        entity_id: planned.entity_id,
        folder_kind: planned.folder_kind,
        path: planned.path,
        sync_status: "pending",
      },
      { onConflict: "company_id,entity_type,entity_id,folder_kind" },
    );
    if (error) throw new Error(error.message);
    return planned;
  });
