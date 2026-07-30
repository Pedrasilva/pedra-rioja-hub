/**
 * Phase 8F.1 — role → capability mapping for payment execution.
 *
 * Mirrors the database predicates:
 *   can_view_company    → everyone in the company
 *   can_record_company  → build a run, add documents, generate the bank file
 *   can_manage_company  → execute, complete, cancel, archive
 *   can_approve_company → authority to pay (through the approval engine)
 *
 * Presentation only. RLS, triggers and the SECURITY DEFINER functions decide.
 */

import { accessForRoles } from "@/modules/bookkeeping/host/roles";

export type PaymentCapabilities = {
  canView: boolean;
  canRecord: boolean;
  canManage: boolean;
  canApprove: boolean;
};

const APPROVE_ROLES = ["owner", "manager", "approver"];

export function paymentCapabilities(roles: readonly string[] | undefined): PaymentCapabilities {
  const access = accessForRoles(roles);
  return {
    ...access,
    canApprove: (roles ?? []).some((r) => APPROVE_ROLES.includes(r)),
  };
}
