/**
 * Phase 8C — generic approval engine row contracts.
 *
 * These mirror the database tables and the compatibility views exactly. They
 * are deliberately domain-free: the engine owns workflow state only, never a
 * commitment, a cash-flow entry, a bookkeeping document or a payment. Domain
 * meaning is supplied by an adapter (see `adapters.ts`) and by the immutable
 * request snapshot the submitting domain wrote.
 */

export type ApprovalWorkflowStatus = "draft" | "published" | "archived";
export type ApprovalVersionStatus = "draft" | "published" | "archived";
export type ApprovalStepRule = "any_one" | "unanimous" | "quorum";
export type ApprovalAssigneeType =
  | "user"
  | "role"
  | "capability"
  | "hierarchy"
  | "domain_candidate";
export type ApprovalRequestDecision =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "returned"
  | "expired"
  | "cancelled";
export type ApprovalCallbackStatus = "not_required" | "pending" | "succeeded" | "failed";
export type ApprovalDecisionAction =
  | "approve"
  | "reject"
  | "return"
  | "withdraw"
  | "delegate"
  | "override_approve"
  | "override_reject"
  | "expire"
  | "cancel"
  | "abstain";

export type ApprovalTargetTypeRow = {
  target_type: string;
  label: string;
  description: string | null;
  is_system: boolean;
};

export type ApprovalWorkflowRow = {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  target_type: string;
  status: ApprovalWorkflowStatus;
  is_system: boolean;
  published_version_id: string | null;
  archived_at: string | null;
  created_at: string;
};

export type ApprovalWorkflowOverviewRow = ApprovalWorkflowRow & {
  workflow_id: string;
  published_version_no: number | null;
  published_at: string | null;
  version_count: number;
  step_count: number;
  request_count: number;
  pending_count: number;
};

export type ApprovalWorkflowVersionRow = {
  id: string;
  company_id: string;
  workflow_id: string;
  version_no: number;
  status: ApprovalVersionStatus;
  expiry_hours: number | null;
  reminder_hours: number | null;
  escalation_hours: number | null;
  notes: string | null;
  published_at: string | null;
  published_by: string | null;
  archived_at: string | null;
  created_at: string;
};

export type ApprovalWorkflowStepRow = {
  id: string;
  company_id: string;
  version_id: string;
  step_no: number;
  name: string;
  rule: ApprovalStepRule;
  quorum_count: number | null;
  min_amount: number | null;
  max_amount: number | null;
  allow_self_approval: boolean;
  restrict_creator: boolean;
  incompatible_with_step_no: number | null;
  reminder_after_hours: number | null;
  escalate_after_hours: number | null;
};

export type ApprovalStepAssignmentRow = {
  id: string;
  company_id: string;
  step_id: string;
  assignee_type: ApprovalAssigneeType;
  user_id: string | null;
  role: string | null;
  capability: string | null;
  candidate_source: string | null;
  created_at: string;
};

export type ApprovalRequestDetailRow = {
  request_id: string;
  company_id: string;
  target_type: string;
  target_id: string;
  target_label: string | null;
  reason: string | null;
  requested_amount: number | null;
  threshold_amount: number | null;
  rule_reference: string | null;
  requested_by: string | null;
  requested_at: string;
  decision: ApprovalRequestDecision;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  current_step_no: number | null;
  snapshot: Record<string, unknown> | null;
  expires_at: string | null;
  completed_at: string | null;
  callback_status: ApprovalCallbackStatus | null;
  callback_attempts: number | null;
  callback_error: string | null;
  callback_at: string | null;
  last_reminder_at: string | null;
  escalated_at: string | null;
  workflow_id: string | null;
  workflow_name: string | null;
  workflow_code: string | null;
  is_system: boolean | null;
  workflow_version_id: string | null;
  workflow_version_no: number | null;
  target_type_label: string | null;
  decision_count: number;
  event_count: number;
  current_step_name: string | null;
};

export type ApprovalInboxRow = {
  request_id: string;
  company_id: string;
  target_type: string;
  target_id: string;
  target_label: string | null;
  requested_amount: number | null;
  requested_by: string | null;
  requested_at: string;
  expires_at: string | null;
  current_step_no: number | null;
  step_id: string | null;
  step_name: string | null;
  rule: ApprovalStepRule | null;
  approver_id: string;
};

export type ApprovalHistoryRow = {
  history_id: string;
  request_id: string;
  company_id: string;
  target_type: string;
  target_id: string;
  step_no: number | null;
  decision: string;
  actor_id: string | null;
  reason: string | null;
  override_reason: string | null;
  delegated_to: string | null;
  created_at: string;
  /** `decision` for the generic engine, `legacy` for preserved Phase 8A rows. */
  source: string;
};

export type ApprovalEventRow = {
  id: string;
  company_id: string;
  request_id: string;
  event: string;
  actor_id: string | null;
  comment: string | null;
  step_no: number | null;
  decision_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type ApprovalCandidateRow = {
  id: string;
  company_id: string;
  request_id: string;
  user_id: string;
  source: string;
  created_at: string;
};

export type ApprovalMemberRow = {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
};

/** A request row enriched only with *why it is in this list*, never with money. */
export type ApprovalInboxItem = ApprovalRequestDetailRow & {
  assignedToMe: boolean;
  delegatedToMe: boolean;
  escalatedToMe: boolean;
  overdue: boolean;
};
