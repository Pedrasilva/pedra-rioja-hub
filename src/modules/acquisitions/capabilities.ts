/**
 * Phase 8F.2 — role → capability mapping for the acquisition pipeline.
 *
 * Mirrors the database predicates:
 *   can_view_company   → see opportunities
 *   can_record_company → create, edit, activities, tasks, valuations, offers,
 *                        link or create a commitment, ordinary stage moves
 *   can_manage_company → archive/restore, accept an offer, accepting and
 *                        withdrawing stage decisions, reopening
 *
 * Presentation only. RLS and the SECURITY DEFINER functions decide, and they
 * fail closed.
 */

import { accessForRoles } from "@/modules/bookkeeping/host/roles";

export type AcquisitionCapabilities = {
  canView: boolean;
  canRecord: boolean;
  canManage: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canManageActivities: boolean;
  canManageOffers: boolean;
  canManageValuations: boolean;
  canAcceptOffer: boolean;
  canLinkCommitment: boolean;
  canCreateCommitment: boolean;
};

export function acquisitionCapabilities(
  roles: readonly string[] | undefined,
): AcquisitionCapabilities {
  const access = accessForRoles(roles);
  return {
    ...access,
    canCreate: access.canRecord,
    canEdit: access.canRecord,
    canArchive: access.canManage,
    canManageActivities: access.canRecord,
    canManageOffers: access.canRecord,
    canManageValuations: access.canRecord,
    canAcceptOffer: access.canManage,
    canLinkCommitment: access.canRecord,
    canCreateCommitment: access.canRecord,
  };
}
