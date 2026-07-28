/**
 * Google Drive folder taxonomy for Pedra Rioja.
 *
 * Drive is the file source of truth; the database only stores metadata and the
 * folder mapping (`drive_folders`). This template is config, not schema: it can
 * evolve without a migration, because every folder we ever create is recorded
 * in `drive_folders` with its Drive id.
 */

export const DRIVE_ROOT_SETTING_KEY = "drive_root_folder_id";

/** Top-level folders beneath the user-provided root. */
export const DRIVE_TOP_LEVEL = [
  "00 Company",
  "01 Properties",
  "02 Suppliers",
  "03 Tenants",
  "04 Bank Statements",
  "05 VAT",
  "06 Accounting",
  "99 Archive",
] as const;

/** Standard subfolders created inside every property folder. */
export const PROPERTY_SUBFOLDERS = [
  "Acquisition",
  "Legal",
  "Tax",
  "Plans",
  "Insurance",
  "Valuations",
  "Financing",
  "Tenancies",
  "Projects",
  "Invoices",
  "Photos",
] as const;

export type PropertySubfolder = (typeof PROPERTY_SUBFOLDERS)[number];

/** Where a child object's folder lives inside its property folder. */
export const CHILD_FOLDER_PARENT: Record<string, PropertySubfolder> = {
  financing_agreements: "Financing",
  tenancy_agreements: "Tenancies",
  capex_projects: "Projects",
  property_valuations: "Valuations",
  property_insurance_policies: "Insurance",
};

export type PlannedFolder = {
  entity_type: string;
  entity_id: string | null;
  folder_kind: string;
  path: string;
};

export function propertyFolderPath(propertyCode: string) {
  return `01 Properties/${propertyCode}`;
}

/** Full folder set to provision when a property is created. */
export function planPropertyFolders(propertyId: string, propertyCode: string): PlannedFolder[] {
  const base = propertyFolderPath(propertyCode);
  return [
    { entity_type: "properties", entity_id: propertyId, folder_kind: "root", path: base },
    ...PROPERTY_SUBFOLDERS.map((sub) => ({
      entity_type: "properties",
      entity_id: propertyId,
      folder_kind: sub.toLowerCase(),
      path: `${base}/${sub}`,
    })),
  ];
}

/** Folder to provision when a financing agreement / tenancy / project is created. */
export function planChildFolder(
  entityType: keyof typeof CHILD_FOLDER_PARENT | string,
  entityId: string,
  propertyCode: string,
  label: string,
): PlannedFolder | null {
  const parent = CHILD_FOLDER_PARENT[entityType];
  if (!parent) return null;
  return {
    entity_type: entityType,
    entity_id: entityId,
    folder_kind: "root",
    path: `${propertyFolderPath(propertyCode)}/${parent}/${sanitiseFolderName(label)}`,
  };
}

export function sanitiseFolderName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 120) || "Untitled";
}
