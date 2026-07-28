/**
 * Pedra Rioja host — role → capability mapping for the bookkeeping module.
 *
 * Mirrors the canonical database predicates:
 *   can_view_company   → owner, manager, bookkeeper, assistant, approver, viewer
 *   can_record_company → owner, manager, bookkeeper, assistant
 *   can_manage_company → owner, manager
 *
 * This is a *presentation* adapter only: it decides which affordances to show.
 * Enforcement always stays in RLS, triggers and server functions.
 */

export type BookkeepingRole =
  | "owner"
  | "manager"
  | "bookkeeper"
  | "assistant"
  | "approver"
  | "viewer";

export const MANAGE_ROLES: BookkeepingRole[] = ["owner", "manager"];
export const RECORD_ROLES: BookkeepingRole[] = ["owner", "manager", "bookkeeper", "assistant"];
export const VIEW_ROLES: BookkeepingRole[] = [
  "owner",
  "manager",
  "bookkeeper",
  "assistant",
  "approver",
  "viewer",
];

import {
  capabilitiesFromAccess,
  type BookkeepingCapabilities,
} from "@/packages/bookkeeping-core/capabilities";

/** Pedra Rioja's role model expressed as the three canonical access flags. */
export function accessForRoles(roles: readonly (BookkeepingRole | string)[] | undefined) {
  const has = (allowed: BookkeepingRole[]) =>
    (roles ?? []).some((r) => allowed.includes(r as BookkeepingRole));
  return {
    canView: has(VIEW_ROLES),
    canRecord: has(RECORD_ROLES),
    canManage: has(MANAGE_ROLES),
  };
}

export function capabilitiesFor(
  roles: readonly (BookkeepingRole | string)[] | undefined,
): BookkeepingCapabilities {
  return capabilitiesFromAccess(accessForRoles(roles));
}

export type { BookkeepingCapabilities };
