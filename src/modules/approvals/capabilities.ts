/**
 * Phase 8C — role → capability mapping for the generic approval engine.
 *
 * Mirrors the database predicates exactly; enforcement stays in RLS and in the
 * SECURITY DEFINER contract. This file only decides which affordances render.
 *
 *   can_view_company      → owner, manager, bookkeeper, assistant, approver, viewer
 *   can_approve_company   → owner, manager, approver
 *   can_manage_company    → owner, manager
 *   can_override_approval → owner, manager
 */

export type ApprovalCapabilities = {
  /** See workflows, requests, decisions and events. */
  canView: boolean;
  /** Create and edit draft workflows and their steps. */
  canConfigure: boolean;
  /** Publish a draft workflow version, archive a workflow. */
  canPublish: boolean;
  /** Submit an approval request through a domain screen. */
  canSubmit: boolean;
  /** Approve, reject, return or abstain. */
  canDecide: boolean;
  /** Hand a decision to another approver of equivalent authority. */
  canDelegate: boolean;
  /** Escalate and run reminder/expiry maintenance. */
  canEscalate: boolean;
  /** Approve against a segregation rule, with a written reason. */
  canOverride: boolean;
  /** Retry a domain callback that failed after a decision. */
  canRetryCallback: boolean;
  /** Inspect the full decision and event history. */
  canInspectAudit: boolean;
};

const VIEW_ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"];
const RECORD_ROLES = ["owner", "manager", "bookkeeper", "assistant"];
const MANAGE_ROLES = ["owner", "manager"];
const APPROVE_ROLES = ["owner", "manager", "approver"];

const has = (roles: readonly string[] | undefined, allowed: string[]) =>
  (roles ?? []).some((r) => allowed.includes(r));

export function approvalCapabilities(roles: readonly string[] | undefined): ApprovalCapabilities {
  const view = has(roles, VIEW_ROLES);
  const manage = has(roles, MANAGE_ROLES);
  const approve = has(roles, APPROVE_ROLES);
  return {
    canView: view,
    canConfigure: manage,
    canPublish: manage,
    canSubmit: has(roles, RECORD_ROLES) || approve,
    canDecide: approve,
    canDelegate: approve,
    canEscalate: manage,
    canOverride: manage,
    canRetryCallback: manage,
    canInspectAudit: view,
  };
}

/** The database refuses self-approval unless the step allows it or an override reason is given. */
export function isSelfRequest(requestedBy: string | null | undefined, userId: string | undefined) {
  return Boolean(requestedBy && userId && requestedBy === userId);
}
