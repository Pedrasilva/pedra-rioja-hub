/**
 * Phase 8C — generic approval module component tests.
 *
 * Same boundary discipline as the earlier suites: the only ways out of the
 * module are the Supabase read client and the approval server functions, both
 * mocked here. The tests assert the properties the frozen contract cares
 * about: fail-closed affordances, reason enforcement, self-approval blocking,
 * append-only presentation, callback separation and published-version
 * immutability.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("./mocks")).supabaseProxy,
}));
vi.mock("@tanstack/react-router", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  Link: ({ children, ...rest }: { children?: unknown }) => {
    const { to: _to, params: _params, ...attrs } = rest as Record<string, unknown>;
    return <a {...attrs}>{children as never}</a>;
  },
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/modules/bookkeeping/bookkeeping.functions", async () =>
  (await import("./mocks")).serverFnModule(),
);
vi.mock("@/modules/approvals/approvals.functions", async () =>
  (await import("./mocks")).approvalFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./mocks")).toastMock }));

import { defaultApprovalDomains, domainAdapterFor, domainLinkFor } from "@/modules/approvals/adapters";
import { approvalCapabilities, isSelfRequest } from "@/modules/approvals/capabilities";
import { ApprovalInbox } from "@/modules/approvals/components/approval-inbox";
import { CallbackPanel } from "@/modules/approvals/components/callback-panel";
import { DecisionControls } from "@/modules/approvals/components/decision-controls";
import { EventTimeline } from "@/modules/approvals/components/event-timeline";
import { RequestViewer } from "@/modules/approvals/components/request-viewer";
import { WorkflowDesigner } from "@/modules/approvals/components/workflow-designer";
import { buildInbox, matchesSearch } from "@/modules/approvals/queries";
import { decisionInputError, recordDecisionSchema } from "@/modules/approvals/schemas";
import { useApprovalActions } from "@/modules/approvals/server";
import type {
  ApprovalCandidateRow,
  ApprovalEventRow,
  ApprovalHistoryRow,
  ApprovalInboxRow,
  ApprovalMemberRow,
  ApprovalRequestDetailRow,
  ApprovalStepAssignmentRow,
  ApprovalWorkflowOverviewRow,
  ApprovalWorkflowStepRow,
  ApprovalWorkflowVersionRow,
} from "@/modules/approvals/types";

import {
  approvalFns,
  COMPANY,
  lastApprovalPayload,
  renderWithProviders,
  resetCalls,
  seed,
  toasts,
} from "./harness";

const ME = "user-me";
const OTHER = "user-other";

function request(over: Partial<ApprovalRequestDetailRow> = {}): ApprovalRequestDetailRow {
  return {
    request_id: "req-1",
    company_id: COMPANY,
    target_type: "commitment",
    target_id: "com-1",
    target_label: "Roof replacement",
    reason: "Contract signed",
    requested_amount: 25000,
    threshold_amount: 10000,
    rule_reference: null,
    requested_by: OTHER,
    requested_at: "2026-02-01T10:00:00Z",
    decision: "pending",
    decided_by: null,
    decided_at: null,
    decision_reason: null,
    current_step_no: 1,
    snapshot: { title: "Roof replacement", currency: "EUR", authorised_amount: 25000 },
    expires_at: null,
    completed_at: null,
    callback_status: "not_required",
    callback_attempts: 0,
    callback_error: null,
    callback_at: null,
    last_reminder_at: null,
    escalated_at: null,
    workflow_id: "wf-1",
    workflow_name: "Commitment authorisation",
    workflow_code: "COMMIT",
    is_system: true,
    workflow_version_id: "ver-1",
    workflow_version_no: 2,
    target_type_label: "Commitment",
    decision_count: 0,
    event_count: 1,
    current_step_name: "Manager review",
    ...over,
  };
}

const MEMBERS: ApprovalMemberRow[] = [
  { user_id: ME, role: "manager", full_name: "Ana Manager", email: "ana@example.com" },
  { user_id: OTHER, role: "approver", full_name: "Rui Approver", email: "rui@example.com" },
];

function Harness({
  render: renderFn,
}: {
  render: (actions: ReturnType<typeof useApprovalActions>) => React.ReactNode;
}) {
  const actions = useApprovalActions();
  return <>{renderFn(actions)}</>;
}

beforeEach(() => {
  seed({});
  resetCalls();
  toasts.length = 0;
  for (const fn of Object.values(approvalFns)) fn.mockClear();
});

/* ------------------------------------------------------------ pure logic */

describe("approval capabilities", () => {
  it("mirrors the database predicates for every role", () => {
    expect(approvalCapabilities(["viewer"]).canDecide).toBe(false);
    expect(approvalCapabilities(["viewer"]).canView).toBe(true);
    expect(approvalCapabilities(["approver"]).canDecide).toBe(true);
    expect(approvalCapabilities(["approver"]).canOverride).toBe(false);
    expect(approvalCapabilities(["manager"]).canOverride).toBe(true);
    expect(approvalCapabilities(["owner"]).canConfigure).toBe(true);
    expect(approvalCapabilities(["bookkeeper"]).canConfigure).toBe(false);
  });

  it("fails closed for an unknown or missing role set", () => {
    const none = approvalCapabilities(undefined);
    expect(Object.values(none).some(Boolean)).toBe(false);
    expect(approvalCapabilities(["stranger"]).canView).toBe(false);
  });

  it("detects a self request", () => {
    expect(isSelfRequest(ME, ME)).toBe(true);
    expect(isSelfRequest(OTHER, ME)).toBe(false);
    expect(isSelfRequest(null, ME)).toBe(false);
  });
});

describe("decision input rules", () => {
  it("requires a reason to reject or return", () => {
    expect(decisionInputError("reject", { reason: "" })).toBeTruthy();
    expect(decisionInputError("return", { reason: "no" })).toBeTruthy();
    expect(decisionInputError("reject", { reason: "over budget" })).toBeNull();
  });

  it("requires an override reason for overrides", () => {
    expect(decisionInputError("override_approve", { overrideReason: "" })).toBeTruthy();
    expect(
      decisionInputError("override_approve", { overrideReason: "board mandate" }),
    ).toBeNull();
  });

  it("requires a delegate for delegation", () => {
    expect(decisionInputError("delegate", { delegateTo: null })).toBeTruthy();
    expect(decisionInputError("delegate", { delegateTo: OTHER })).toBeNull();
  });

  it("rejects an invalid decision payload at the schema boundary", () => {
    expect(
      recordDecisionSchema.safeParse({
        requestId: "00000000-0000-4000-8000-000000000001",
        decision: "reject",
        reason: null,
      }).success,
    ).toBe(false);
    expect(
      recordDecisionSchema.safeParse({
        requestId: "00000000-0000-4000-8000-000000000001",
        decision: "approve",
      }).success,
    ).toBe(true);
  });
});

describe("domain adapters", () => {
  it("links a commitment back to its own screen", () => {
    const link = domainLinkFor(defaultApprovalDomains, "commitment", "com-1");
    expect(link?.to).toBe("/commitments/$commitmentId");
    expect(link?.params).toEqual({ commitmentId: "com-1" });
  });

  it("fails closed for an unregistered target type", () => {
    expect(domainAdapterFor(defaultApprovalDomains, "unknown_thing")).toBeNull();
    expect(domainLinkFor(defaultApprovalDomains, "unknown_thing", "x")).toBeNull();
  });
});

describe("inbox projection", () => {
  const assignments: ApprovalInboxRow[] = [
    {
      request_id: "req-1",
      company_id: COMPANY,
      target_type: "commitment",
      target_id: "com-1",
      target_label: "Roof replacement",
      requested_amount: 25000,
      requested_by: OTHER,
      requested_at: "2026-02-01T10:00:00Z",
      expires_at: null,
      current_step_no: 1,
      step_id: "step-1",
      step_name: "Manager review",
      rule: "any_one",
      approver_id: ME,
    },
  ];
  const candidates: ApprovalCandidateRow[] = [
    {
      id: "cand-1",
      company_id: COMPANY,
      request_id: "req-2",
      user_id: ME,
      source: "delegation",
      created_at: "2026-02-02T10:00:00Z",
    },
  ];

  it("marks assignment, delegation and lateness without inventing status", () => {
    const items = buildInbox(
      [request(), request({ request_id: "req-2", target_label: "Boiler service" })],
      assignments,
      candidates,
      ME,
      new Date("2026-03-01T00:00:00Z"),
    );
    expect(items[0].assignedToMe).toBe(true);
    expect(items[0].delegatedToMe).toBe(false);
    expect(items[1].delegatedToMe).toBe(true);
    expect(items.every((i) => i.overdue === false)).toBe(true);
  });

  it("flags an expired pending request as overdue", () => {
    const items = buildInbox(
      [request({ expires_at: "2026-02-10T00:00:00Z" })],
      assignments,
      [],
      ME,
      new Date("2026-03-01T00:00:00Z"),
    );
    expect(items[0].overdue).toBe(true);
  });

  it("never marks a settled request overdue", () => {
    const items = buildInbox(
      [request({ decision: "approved", expires_at: "2026-02-10T00:00:00Z" })],
      [],
      [],
      ME,
      new Date("2026-03-01T00:00:00Z"),
    );
    expect(items[0].overdue).toBe(false);
  });

  it("searches across record, workflow and reason", () => {
    const [item] = buildInbox([request()], [], [], ME);
    expect(matchesSearch(item, "roof")).toBe(true);
    expect(matchesSearch(item, "authorisation")).toBe(true);
    expect(matchesSearch(item, "nonsense")).toBe(false);
    expect(matchesSearch(item, "")).toBe(true);
  });
});

/* ------------------------------------------------------------ components */

describe("approval inbox", () => {
  const props = {
    requests: [request()],
    assignments: [] as ApprovalInboxRow[],
    candidates: [] as ApprovalCandidateRow[],
    userId: ME,
    selectedId: null,
    onSelect: () => {},
  };

  it("refuses to render the queue without view permission", () => {
    renderWithProviders(
      <ApprovalInbox
        {...props}
        capabilities={approvalCapabilities([])}
        actions={undefined}
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(/do not have permission/i);
  });

  it("lists pending requests of any target type", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ApprovalInbox
        {...props}
        capabilities={approvalCapabilities(["manager"])}
        actions={undefined}
      />,
    );
    // Default scope is "awaiting me"; this request is not assigned to me.
    expect(screen.getByText(/Nothing is waiting/i)).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Scope" }));
    await user.click(screen.getByRole("option", { name: "All pending" }));
    expect(within(screen.getByRole("list", { name: "Approval requests" })).getByText(
      "Roof replacement",
    )).toBeInTheDocument();
  });

  it("offers maintenance only to roles allowed to escalate", () => {
    const { unmount } = renderWithProviders(
      <Harness
        render={(actions) => (
          <ApprovalInbox
            {...props}
            capabilities={approvalCapabilities(["approver"])}
            actions={actions}
          />
        )}
      />,
    );
    expect(screen.queryByRole("button", { name: /Run reminders/i })).toBeNull();
    unmount();
    renderWithProviders(
      <Harness
        render={(actions) => (
          <ApprovalInbox
            {...props}
            capabilities={approvalCapabilities(["manager"])}
            actions={actions}
          />
        )}
      />,
    );
    expect(screen.getByRole("button", { name: /Run reminders/i })).toBeInTheDocument();
  });
});

describe("decision controls", () => {
  const renderControls = (
    over: Partial<ApprovalRequestDetailRow> = {},
    roles: string[] = ["approver"],
    userId: string | undefined = ME,
  ) =>
    renderWithProviders(
      <Harness
        render={(actions) => (
          <DecisionControls
            request={request(over)}
            capabilities={approvalCapabilities(roles)}
            userId={userId}
            members={MEMBERS}
            actions={actions}
          />
        )}
      />,
    );

  it("fails closed when no action context is supplied", () => {
    renderWithProviders(
      <DecisionControls
        request={request()}
        capabilities={approvalCapabilities(["approver"])}
        userId={ME}
        members={MEMBERS}
        actions={undefined}
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(/no approval action context/i);
  });

  it("hides every decision action from a viewer", () => {
    renderControls({}, ["viewer"]);
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
  });

  it("offers approve, reject, return and abstain to an approver", () => {
    renderControls();
    for (const label of ["Approve", "Reject", "Return for changes", "Abstain"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Override approve" })).toBeNull();
  });

  it("keeps reject disabled until a reason is written", async () => {
    const user = userEvent.setup();
    renderControls();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    await user.type(screen.getByLabelText(/Comment or reason/i), "over budget");
    expect(screen.getByRole("button", { name: "Reject" })).toBeEnabled();
  });

  it("blocks self-approval until an override reason is written", async () => {
    const user = userEvent.setup();
    renderControls({ requested_by: ME }, ["manager"]);
    expect(screen.getByRole("note")).toHaveTextContent(/Self-approval requires/i);
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    await user.type(screen.getByLabelText(/Override reason/i), "sole director");
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  it("sends the decision through the server function with its reason", async () => {
    const user = userEvent.setup();
    renderControls();
    await user.type(screen.getByLabelText(/Comment or reason/i), "scope reduced");
    await user.click(screen.getByRole("button", { name: "Return for changes" }));
    expect(approvalFns.recordApprovalDecision).toHaveBeenCalledTimes(1);
    expect(lastApprovalPayload("recordApprovalDecision")).toMatchObject({
      requestId: "req-1",
      decision: "return",
      reason: "scope reduced",
    });
  });

  it("requires a delegate before delegating", async () => {
    const user = userEvent.setup();
    renderControls();
    expect(screen.getByRole("button", { name: "Delegate" })).toBeDisabled();
    await user.click(screen.getByRole("combobox", { name: /Delegate to/i }));
    await user.click(screen.getByRole("option", { name: /Rui Approver/ }));
    expect(screen.getByRole("button", { name: "Delegate" })).toBeEnabled();
  });

  it("shows no decision affordance once the request is settled", () => {
    renderControls({ decision: "approved" });
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.getByText(/can no longer be decided/i)).toBeInTheDocument();
  });
});

describe("callback panel", () => {
  it("keeps the decision and reports the callback failure separately", () => {
    renderWithProviders(
      <Harness
        render={(actions) => (
          <CallbackPanel
            request={request({
              decision: "approved",
              callback_status: "failed",
              callback_attempts: 2,
              callback_error: "commitment already active",
            })}
            capabilities={approvalCapabilities(["manager"])}
            actions={actions}
          />
        )}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/callback failed/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/decision remains recorded/i);
    expect(screen.getByText(/2 attempts/)).toBeInTheDocument();
  });

  it("offers retry only to roles allowed to retry", async () => {
    const user = userEvent.setup();
    const failed = request({ decision: "approved", callback_status: "failed" });
    const { unmount } = renderWithProviders(
      <Harness
        render={(actions) => (
          <CallbackPanel
            request={failed}
            capabilities={approvalCapabilities(["approver"])}
            actions={actions}
          />
        )}
      />,
    );
    expect(screen.queryByRole("button", { name: /Retry callback/i })).toBeNull();
    unmount();

    renderWithProviders(
      <Harness
        render={(actions) => (
          <CallbackPanel
            request={failed}
            capabilities={approvalCapabilities(["owner"])}
            actions={actions}
          />
        )}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Retry callback/i }));
    expect(lastApprovalPayload("retryApprovalCallback")).toMatchObject({ requestId: "req-1" });
  });

  it("shows no retry when no callback is required", () => {
    renderWithProviders(
      <CallbackPanel
        request={request()}
        capabilities={approvalCapabilities(["owner"])}
        actions={undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: /Retry callback/i })).toBeNull();
  });
});

describe("event timeline", () => {
  const events: ApprovalEventRow[] = [
    {
      id: "ev-1",
      company_id: COMPANY,
      request_id: "req-1",
      event: "submitted",
      actor_id: OTHER,
      comment: null,
      step_no: 1,
      decision_id: null,
      payload: null,
      created_at: "2026-02-01T10:00:00Z",
    },
    {
      id: "ev-2",
      company_id: COMPANY,
      request_id: "req-1",
      event: "callback_failed",
      actor_id: null,
      comment: "commitment already active",
      step_no: null,
      decision_id: null,
      payload: null,
      created_at: "2026-02-02T10:00:00Z",
    },
  ];

  it("renders events in recorded order and offers no way to change one", () => {
    renderWithProviders(<EventTimeline events={events} />);
    const items = within(screen.getByRole("list", { name: "Event timeline" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Submitted");
    expect(items[1]).toHaveTextContent("Callback failed");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says plainly when nothing has happened yet", () => {
    renderWithProviders(<EventTimeline events={[]} />);
    expect(screen.getByText(/No events have been recorded/i)).toBeInTheDocument();
  });
});

describe("request viewer", () => {
  const decisions: ApprovalHistoryRow[] = [
    {
      history_id: "leg-1",
      request_id: "req-1",
      company_id: COMPANY,
      target_type: "commitment",
      target_id: "com-1",
      step_no: null,
      decision: "approved",
      actor_id: OTHER,
      reason: "historical approval",
      override_reason: null,
      delegated_to: null,
      created_at: "2025-12-01T10:00:00Z",
      source: "legacy",
    },
  ];

  it("shows the immutable snapshot, the workflow version and the domain link", () => {
    renderWithProviders(
      <RequestViewer
        request={request()}
        decisions={decisions}
        events={[]}
        candidates={[]}
        members={MEMBERS}
        capabilities={approvalCapabilities(["manager"])}
        userId={ME}
        actions={undefined}
      />,
    );
    expect(screen.getAllByText("Roof replacement").length).toBeGreaterThan(0);
    expect(screen.getByText(/Snapshot at submission/i)).toBeInTheDocument();
    expect(screen.getByText("Authorised amount")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open the commitment record/i })).toBeInTheDocument();
  });

  it("keeps historical Phase 8A decisions visible and labelled", () => {
    renderWithProviders(
      <RequestViewer
        request={request()}
        decisions={decisions}
        events={[]}
        candidates={[]}
        members={MEMBERS}
        capabilities={approvalCapabilities(["manager"])}
        userId={ME}
        actions={undefined}
      />,
    );
    expect(screen.getByText("(historical)")).toBeInTheDocument();
    expect(screen.getByText("historical approval")).toBeInTheDocument();
  });

  it("offers no domain link for an unregistered target type", () => {
    renderWithProviders(
      <RequestViewer
        request={request({ target_type: "mystery", target_type_label: "Mystery" })}
        decisions={[]}
        events={[]}
        candidates={[]}
        members={MEMBERS}
        capabilities={approvalCapabilities(["manager"])}
        userId={ME}
        actions={undefined}
      />,
    );
    expect(screen.getByText(/no linked screen/i)).toBeInTheDocument();
  });

  it("refuses to show anything without view permission", () => {
    renderWithProviders(
      <RequestViewer
        request={request()}
        decisions={[]}
        events={[]}
        candidates={[]}
        members={MEMBERS}
        capabilities={approvalCapabilities([])}
        userId={ME}
        actions={undefined}
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(/do not have permission/i);
  });
});

describe("workflow designer", () => {
  const workflow = {
    id: "wf-1",
    workflow_id: "wf-1",
    company_id: COMPANY,
    code: "COMMIT",
    name: "Commitment authorisation",
    description: null,
    target_type: "commitment",
    status: "published",
    is_system: true,
    published_version_id: "ver-2",
    archived_at: null,
    created_at: "2026-01-01T10:00:00Z",
    published_version_no: 2,
    published_at: "2026-01-10T10:00:00Z",
    version_count: 2,
    step_count: 1,
    request_count: 3,
    pending_count: 1,
  } as ApprovalWorkflowOverviewRow;

  const publishedVersion = {
    id: "ver-2",
    company_id: COMPANY,
    workflow_id: "wf-1",
    version_no: 2,
    status: "published",
    expiry_hours: 72,
    reminder_hours: 24,
    escalation_hours: 48,
    notes: null,
    published_at: "2026-01-10T10:00:00Z",
    published_by: ME,
    archived_at: null,
    created_at: "2026-01-05T10:00:00Z",
  } as ApprovalWorkflowVersionRow;

  const draftVersion = { ...publishedVersion, id: "ver-3", version_no: 3, status: "draft", published_at: null } as ApprovalWorkflowVersionRow;

  const step = {
    id: "step-1",
    company_id: COMPANY,
    version_id: "ver-2",
    step_no: 1,
    name: "Manager review",
    rule: "any_one",
    quorum_count: null,
    min_amount: null,
    max_amount: null,
    allow_self_approval: false,
    restrict_creator: true,
    incompatible_with_step_no: null,
    reminder_after_hours: null,
    escalate_after_hours: null,
  } as ApprovalWorkflowStepRow;

  const assignment = {
    id: "asg-1",
    company_id: COMPANY,
    step_id: "step-1",
    assignee_type: "role",
    user_id: null,
    role: "approver",
    capability: null,
    candidate_source: null,
    created_at: "2026-01-05T10:00:00Z",
  } as ApprovalStepAssignmentRow;

  const base = {
    workflows: [workflow],
    versions: [publishedVersion],
    steps: [step],
    assignments: [assignment],
    members: MEMBERS,
    onSelectWorkflow: () => {},
    onSelectVersion: () => {},
  };

  it("refuses to render for a role without view permission", () => {
    renderWithProviders(
      <WorkflowDesigner
        {...base}
        selectedWorkflowId={null}
        selectedVersionId={null}
        capabilities={approvalCapabilities([])}
        actions={undefined}
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(/do not have permission/i);
  });

  it("treats a published version as read-only", () => {
    renderWithProviders(
      <Harness
        render={(actions) => (
          <WorkflowDesigner
            {...base}
            selectedWorkflowId="wf-1"
            selectedVersionId="ver-2"
            capabilities={approvalCapabilities(["owner"])}
            actions={actions}
          />
        )}
      />,
    );
    expect(screen.getByText(/steps are frozen/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add step" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("allows editing only inside a draft version", () => {
    renderWithProviders(
      <Harness
        render={(actions) => (
          <WorkflowDesigner
            {...base}
            versions={[draftVersion]}
            steps={[{ ...step, version_id: "ver-3" }]}
            selectedWorkflowId="wf-1"
            selectedVersionId="ver-3"
            capabilities={approvalCapabilities(["owner"])}
            actions={actions}
          />
        )}
      />,
    );
    expect(screen.getByText(/steps and approvers can still be changed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add step" })).toBeInTheDocument();
  });

  it("never offers publishing to a role that cannot configure", () => {
    renderWithProviders(
      <Harness
        render={(actions) => (
          <WorkflowDesigner
            {...base}
            versions={[draftVersion]}
            selectedWorkflowId="wf-1"
            selectedVersionId="ver-3"
            capabilities={approvalCapabilities(["bookkeeper"])}
            actions={actions}
          />
        )}
      />,
    );
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    expect(screen.queryByRole("button", { name: /New draft version/i })).toBeNull();
  });

  it("publishes a draft version through the server function", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness
        render={(actions) => (
          <WorkflowDesigner
            {...base}
            versions={[draftVersion]}
            selectedWorkflowId="wf-1"
            selectedVersionId="ver-3"
            capabilities={approvalCapabilities(["owner"])}
            actions={actions}
          />
        )}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(lastApprovalPayload("publishApprovalWorkflowVersion")).toMatchObject({
      versionId: "ver-3",
    });
  });

  it("warns when a step has no approver, because resolution fails closed", () => {
    renderWithProviders(
      <WorkflowDesigner
        {...base}
        assignments={[]}
        selectedWorkflowId="wf-1"
        selectedVersionId="ver-2"
        capabilities={approvalCapabilities(["owner"])}
        actions={undefined}
      />,
    );
    expect(screen.getByText(/will fail closed/i)).toBeInTheDocument();
  });
});
