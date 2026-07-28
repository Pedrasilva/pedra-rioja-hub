/** Presentation-only vocabularies for the property register. Not schema. */

export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "building", label: "Building" },
  { value: "house", label: "House" },
  { value: "retail", label: "Retail" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "land", label: "Land" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "other", label: "Other" },
] as const;

export const PROPERTY_STATUSES = [
  { value: "prospect", label: "Prospect" },
  { value: "under_offer", label: "Under offer" },
  { value: "owned", label: "Owned" },
  { value: "renovation", label: "In renovation" },
  { value: "for_rent", label: "Available to let" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
] as const;

/** Statuses hidden from the register by default. */
export const ARCHIVED_STATUSES = ["archived", "sold"];

export const UNIT_STATUSES = [
  { value: "vacant", label: "Vacant" },
  { value: "rented", label: "Rented" },
  { value: "renovation", label: "In renovation" },
  { value: "owner_use", label: "Owner use" },
  { value: "unavailable", label: "Unavailable" },
] as const;

export const MANUAL_EVENT_TYPES = [
  { value: "note", label: "Note" },
  { value: "inspection", label: "Inspection" },
  { value: "works", label: "Works" },
  { value: "meeting", label: "Meeting" },
  { value: "legal", label: "Legal" },
  { value: "other", label: "Other" },
] as const;

export function statusTone(status: string | null | undefined) {
  switch (status) {
    case "owned":
    case "active":
    case "rented":
    case "for_rent":
      return "success" as const;
    case "renovation":
    case "under_offer":
    case "prospect":
    case "pending":
      return "warning" as const;
    case "archived":
    case "sold":
    case "ended":
    case "terminated":
      return "muted" as const;
    default:
      return "default" as const;
  }
}
