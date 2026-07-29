/**
 * Shared bookkeeping core — capability contract.
 *
 * The core consumes capabilities only. It never knows host role names; the
 * host supplies the role → capability mapping (see the permission adapter).
 * Enforcement always stays in RLS, triggers and server functions: these flags
 * decide which affordances are rendered, nothing more.
 */

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
  /** Closing and reopening a period is a manage-level control. */
  canClosePeriods: boolean;
  /**
   * Standalone manual cash-flow ledger items change the ledger without an
   * accounting source document — deliberately manage-level.
   */
  canCreateLedgerItem: boolean;
};

/** Fail-closed default: used whenever no permission adapter is supplied. */
export const NO_CAPABILITIES: BookkeepingCapabilities = Object.freeze({
  canView: false,
  canRecord: false,
  canManage: false,
  canCreateDraft: false,
  canEditDraft: false,
  canPost: false,
  canCancel: false,
  canRecordPayment: false,
  canReversePayment: false,
  canManageClassifications: false,
  canManageRules: false,
  canRecomputePeriods: false,
  canClosePeriods: false,
  canCreateLedgerItem: false,
});

/**
 * Canonical expansion of the three database predicates
 * (`can_view_company` / `can_record_company` / `can_manage_company`) into the
 * capability set. Hosts map their own roles onto these three flags.
 */
export function capabilitiesFromAccess(access: {
  canView?: boolean;
  canRecord?: boolean;
  canManage?: boolean;
}): BookkeepingCapabilities {
  const canManage = access.canManage === true;
  const canRecord = canManage || access.canRecord === true;
  const canView = canRecord || access.canView === true;

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
    canClosePeriods: canManage,
    canCreateLedgerItem: canManage,
  };
}
