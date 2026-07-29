/**
 * Phase 8A — role → capability mapping for commitments, approvals,
 * drawdowns and maintenance.
 *
 * Mirrors the canonical database predicates:
 *   can_view_company    → owner, manager, bookkeeper, assistant, approver, viewer
 *   can_record_company  → owner, manager, bookkeeper, assistant
 *   can_manage_company  → owner, manager
 *   can_approve_company → owner, manager, approver
 *
 * Presentation only. Enforcement stays in RLS, triggers and the SECURITY
 * DEFINER contract; this file just decides which affordances to render.
 */

import { accessForRoles } from "@/modules/bookkeeping/host/roles";

export type CommitmentCapabilities = {
  /** See commitments, schedules, drawdowns and maintenance. */
  canView: boolean;
  /** Create and edit drafts, record drawdowns, run maintenance jobs. */
  canRecord: boolean;
  /** Activate, complete, archive, version schedules, reverse drawdowns. */
  canManage: boolean;
  /** Approve or reject commitments and schedule variances. */
  canApprove: boolean;
};

const APPROVE_ROLES = ["owner", "manager", "approver"];

export function commitmentCapabilities(
  roles: readonly string[] | undefined,
): CommitmentCapabilities {
  const access = accessForRoles(roles);
  return {
    ...access,
    canApprove: (roles ?? []).some((r) => APPROVE_ROLES.includes(r)),
  };
}

/**
 * Self-approval is refused by the database unless an explicit override reason
 * is supplied. The UI reflects that rather than inventing its own rule.
 */
export function isSelfApproval(requestedBy: string | null | undefined, userId: string | undefined) {
  return Boolean(requestedBy && userId && requestedBy === userId);
}
