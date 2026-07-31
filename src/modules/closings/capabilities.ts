/**
 * Phase 8F.4 — role → capability mapping for closing & handover.
 *
 * Mirrors the database predicates:
 *   can_view_company   → read closings, conditions and handover tasks
 *   can_record_company → open a closing, add conditions and tasks, update
 *                        their status
 *   can_manage_company → waive a condition, mark ready, complete, cancel,
 *                        archive, restore, create the managed property
 *
 * Presentation only. RLS and the SECURITY DEFINER functions decide, and they
 * fail closed.
 */

import { accessForRoles } from "@/modules/bookkeeping/host/roles";

export type ClosingCapabilities = {
  canView: boolean;
  canRecord: boolean;
  canManage: boolean;
  canOpen: boolean;
  canEdit: boolean;
  canWaive: boolean;
  canMarkReady: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canArchive: boolean;
  canCreateProperty: boolean;
};

export function closingCapabilities(roles: readonly string[] | undefined): ClosingCapabilities {
  const access = accessForRoles(roles);
  return {
    ...access,
    canOpen: access.canRecord,
    canEdit: access.canRecord,
    canWaive: access.canManage,
    canMarkReady: access.canManage,
    canComplete: access.canManage,
    canCancel: access.canManage,
    canArchive: access.canManage,
    canCreateProperty: access.canManage,
  };
}
