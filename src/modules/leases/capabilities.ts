/**
 * Phase 8E — role → capability mapping for leases, tenants and occupancy.
 *
 * Presentation only; enforcement stays in RLS and the SECURITY DEFINER
 * contract.
 */

import { accessForRoles } from "@/modules/bookkeeping/host/roles";

export type LeaseCapabilities = {
  canView: boolean;
  canRecord: boolean;
  canManage: boolean;
};

export function leaseCapabilities(roles: readonly string[] | undefined): LeaseCapabilities {
  const access = accessForRoles(roles);
  return { canView: access.canView, canRecord: access.canRecord, canManage: access.canManage };
}
