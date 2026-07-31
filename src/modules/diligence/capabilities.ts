/**
 * Phase 8F.3 / 8F.4 — role → capability mapping for diligence and closing.
 *
 * Mirrors the database predicates:
 *   can_view_company   → read cases, checklists, closings
 *   can_record_company → open a case, edit items, add conditions and tasks
 *   can_manage_company → waive, complete, mark ready, cancel, archive,
 *                        maintain templates, create the managed property
 *
 * Presentation only. RLS and the SECURITY DEFINER functions decide, and they
 * fail closed.
 */

import { accessForRoles } from "@/modules/bookkeeping/host/roles";

export type DiligenceCapabilities = {
  canView: boolean;
  canRecord: boolean;
  canManage: boolean;
  canOpenCase: boolean;
  canEditItems: boolean;
  canWaive: boolean;
  canComplete: boolean;
  canArchive: boolean;
  canManageTemplates: boolean;
};

export function diligenceCapabilities(
  roles: readonly string[] | undefined,
): DiligenceCapabilities {
  const access = accessForRoles(roles);
  return {
    ...access,
    canOpenCase: access.canRecord,
    canEditItems: access.canRecord,
    canWaive: access.canManage,
    canComplete: access.canManage,
    canArchive: access.canManage,
    canManageTemplates: access.canManage,
  };
}
