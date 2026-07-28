/**
 * Extractable core — permission adapter for the bookkeeping module.
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

export type BookkeepingCapabilities = {
  canView: boolean;
  canRecord: boolean;
  canManage: boolean;
  /** Draft bookkeeping documents — recording roles may create and edit. */
  canCreateDraft: boolean;
  canEditDraft: boolean;
  /** Lifecycle transitions are manage-level. */
  canPost: boolean;
  canCancel: boolean;
  /** Settlement against an existing document is a recording right. */
  canRecordPayment: boolean;
  /** Privileged corrections stay manage-level. */
  canReversePayment: boolean;
  canManageClassifications: boolean;
  canManageRules: boolean;
  canRecomputePeriods: boolean;
  /**
   * Standalone manual cash-flow ledger items change the ledger without an
   * accounting source document — deliberately manage-level.
   */
  canCreateLedgerItem: boolean;
};

export function capabilitiesFor(
  roles: readonly (BookkeepingRole | string)[] | undefined,
): BookkeepingCapabilities {
  const has = (allowed: BookkeepingRole[]) =>
    (roles ?? []).some((r) => allowed.includes(r as BookkeepingRole));

  const canView = has(VIEW_ROLES);
  const canRecord = has(RECORD_ROLES);
  const canManage = has(MANAGE_ROLES);

  return {
    canView,
    canRecord,
    canManage,
    canCreateDraft: canRecord,
    canEditDraft: canRecord,
    canPost: canManage,
    canCancel: canManage,
    canRecordPayment: canRecord,
    canReversePayment: canManage,
    canManageClassifications: canManage,
    canManageRules: canManage,
    canRecomputePeriods: canManage,
    canCreateLedgerItem: canManage,
  };
}
