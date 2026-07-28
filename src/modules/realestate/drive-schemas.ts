import { z } from "zod";

/** Entities a document can be attached to. Kept generic so bookkeeping can reuse it. */
export const DOCUMENT_ENTITY_TYPES = [
  "properties",
  "property_acquisition_costs",
  "financing_agreements",
  "tenancy_agreements",
  "capex_projects",
  "suppliers",
  "transactions",
] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

export const DOCUMENT_ENTITY_LABELS: Record<DocumentEntityType, string> = {
  properties: "Property",
  property_acquisition_costs: "Acquisition",
  financing_agreements: "Financing agreement",
  tenancy_agreements: "Tenancy",
  capex_projects: "Project",
  suppliers: "Supplier",
  transactions: "Transaction",
};

export const DOCUMENT_CATEGORIES = [
  "acquisition",
  "legal",
  "tax",
  "plans",
  "insurance",
  "valuations",
  "financing",
  "tenancies",
  "projects",
  "invoices",
  "photos",
  "other",
] as const;

export const driveStatusSchema = z.object({ companyId: z.string().uuid() });

export const connectDriveRootSchema = z.object({
  companyId: z.string().uuid(),
  /** A Drive folder id or any Drive folder URL. Omit to create a new root folder. */
  rootFolderRef: z.string().trim().min(1).optional(),
  rootFolderName: z.string().trim().min(1).max(120).optional(),
});

export const syncDriveFoldersSchema = z.object({
  companyId: z.string().uuid(),
  propertyId: z.string().uuid().optional(),
});

export const attachDocumentSchema = z.object({
  companyId: z.string().uuid(),
  entityType: z.enum(DOCUMENT_ENTITY_TYPES),
  entityId: z.string().uuid(),
  /** Subfolder within the property folder, e.g. "legal". Ignored for non-property entities. */
  folderKind: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).optional(),
  docType: z.string().trim().min(1).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  relation: z.string().trim().min(1).optional(),
  /** Upload payload — omit when linking an existing Drive file. */
  file: z
    .object({
      name: z.string().trim().min(1),
      mimeType: z.string().trim().min(1),
      contentBase64: z.string().min(1),
    })
    .optional(),
  /** Existing Drive file id or URL — omit when uploading. */
  driveFileRef: z.string().trim().min(1).optional(),
});

export const listDocumentsSchema = z.object({
  companyId: z.string().uuid(),
  entityType: z.enum(DOCUMENT_ENTITY_TYPES),
  entityId: z.string().uuid(),
});
