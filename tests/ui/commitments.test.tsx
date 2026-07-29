/**
 * Phase 8A — commitment, approval, schedule, drawdown, maintenance and capex
 * component tests.
 *
 * Same boundary discipline as the bookkeeping suites: the only ways out of the
 * module are the Supabase read client and the commitment server functions,
 * both mocked here. Anything else would fail to render.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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
vi.mock("@/modules/commitments/commitments.functions", async () =>
  (await import("./mocks")).commitmentFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./mocks")).toastMock }));

import { ApprovalPanel } from "@/modules/commitments/components/approval-panel";
import { CapexPanel } from "@/modules/commitments/components/capex-panel";
import { CommitmentList } from "@/modules/commitments/components/commitment-list";
import { DrawdownPanel } from "@/modules/commitments/components/drawdown-panel";
import { MaintenancePanel } from "@/modules/commitments/components/maintenance-panel";
import { SchedulePanel } from "@/modules/commitments/components/schedule-panel";
import { commitmentCapabilities, isSelfApproval } from "@/modules/commitments/capabilities";
import { monthlyLines, scheduleTotal } from "@/modules/commitments/schemas";
import { useCommitmentActions } from "@/modules/commitments/server";
import type {
  ApprovalRequestRow,
  CapexSummaryRow,
  CommitmentRow,
  CommitmentSummary,
  DocumentOption,
  DrawdownRow,
  MaintenanceJobRow,
  ScheduleLineRow,
  ScheduleVersionRow,
} from "@/modules/commitments/queries";

import {
  COMPANY,
  commitmentFns,
  lastCommitmentPayload,
  renderWithProviders,
  resetCalls,
  seed,
  toasts,
} from "./harness";

/* ------------------------------------------------------------- fixtures */

const OWNER = "user-owner";
const APPROVER = "user-approver";

const owner = commitmentCapabilities(["owner"]);
const approver = commitmentCapabilities(["approver"]);
const assistant = commitmentCapabilities(["assistant"]);
const viewer = commitmentCapabilities(["viewer"]);

function commitment(overrides: Partial<CommitmentRow> = {}): CommitmentRow {
  return {
    id: "aaaaaaaa-1111-4111-8111-111111111111",
    company_id: COMPANY,
    title: "Roof replacement — Block A",
    code: "COM-001",
    description: "Full roof strip and re-tile",
    notes: null,
    commitment_type: "capex_contract",
    counterparty_id: "ffffffff-1111-4111-8111-111111111111",
    currency: "EUR",
    authorised_amount: 100000,
    status: "draft",
    approval_status: "not_requested",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    approval_override_reason: null,
    cancellation_reason: null,
    completion_notes: null,
    source_type: null,
    source_id: null,
    archived_at: null,
    ...overrides,
  };
}

function summary(overrides: Partial<CommitmentSummary> = {}): CommitmentSummary {
  return {
    commitment_id: "aaaaaaaa-1111-4111-8111-111111111111",
    company_id: COMPANY,
    code: "COM-001",
    title: "Roof replacement — Block A",
    commitment_type: "capex_contract",
    status: "active",
    approval_status: "approved",
    currency: "EUR",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    counterparty_id: "ffffffff-1111-4111-8111-111111111111",
    counterparty_name: "Rioja Manutenção Lda",
    authorised_amount: 100000,
    scheduled_amount: 100000,
    approved_committed_amount: 60000,
    overdue_scheduled_amount: 0,
    retained_amount: 5000,
    invoiced_amount: 40000,
    paid_amount: 25000,
    remaining_commitment: 60000,
    available_drawdown: 60000,
    approved_variance: 0,
    unapproved_variance: 0,
    property_id: null,
    unit_id: null,
    project_id: "ffffffff-2222-4222-8222-222222222222",
    archived_at: null,
    ...overrides,
  };
}

function version(overrides: Partial<ScheduleVersionRow> = {}): ScheduleVersionRow {
  return {
    id: "cccccccc-1111-4111-8111-111111111111",
    commitment_id: "aaaaaaaa-1111-4111-8111-111111111111",
    version_no: 1,
    schedule_type: "milestone",
    effective_from: "2026-01-01",
    status: "active",
    is_current: true,
    total_amount: 100000,
    variance_amount: 0,
    variance_approved: false,
    variance_reason: null,
    requires_approval: false,
    reason: null,
    notes: null,
    activated_at: "2026-01-01",
    superseded_at: null,
    ...overrides,
  };
}

function line(overrides: Partial<ScheduleLineRow> = {}): ScheduleLineRow {
  return {
    id: "dddddddd-1111-4111-8111-111111111111",
    commitment_id: "aaaaaaaa-1111-4111-8111-111111111111",
    version_id: "cccccccc-1111-4111-8111-111111111111",
    line_no: 1,
    expected_date: "2026-03-01",
    amount: 40000,
    line_type: "milestone",
    status: "scheduled",
    is_retention: false,
    is_contingency: false,
    description: "Strip and scaffold",
    ...overrides,
  };
}

const DOCUMENTS: DocumentOption[] = [
  {
    id: "11111111-1111-4111-8111-111111111aaa",
    document_number: "2026/17",
    counterparty_name: "Rioja Manutenção Lda",
    issue_date: "2026-03-05",
    gross_amount: 24600,
    payable_amount: 24600,
    currency: "EUR",
    status: "posted",
  },
];

beforeEach(() => {
  resetCalls();
  toasts.length = 0;
  seed({});
  for (const fn of Object.values(commitmentFns)) fn.mockClear();
});

/** Bridges the action hook into a test component. */
function WithActions({ render }: { render: (a: ReturnType<typeof useCommitmentActions>) => JSX.Element }) {
  const actions = useCommitmentActions();
  return render(actions);
}

/* -------------------------------------------------------------- register */

describe("commitment register", () => {
  const rows = [
    summary(),
    summary({
      commitment_id: "aaaaaaaa-2222-4222-8222-222222222222",
      title: "Lift servicing contract",
      commitment_type: "service_contract",
      status: "draft",
      approval_status: "not_requested",
      counterparty_name: "Duarte & Filhos",
      authorised_amount: 12000,
      approved_committed_amount: 0,
      invoiced_amount: 0,
      remaining_commitment: 12000,
      unapproved_variance: 1500,
    }),
  ];

  it("lists every commitment with its derived figures", () => {
    renderWithProviders(<CommitmentList rows={rows} />);
    expect(screen.getByText("Roof replacement — Block A")).toBeInTheDocument();
    expect(screen.getByText("Lift servicing contract")).toBeInTheDocument();
    expect(screen.getByText("€100,000.00")).toBeInTheDocument();
    expect(screen.getByText("€60,000.00")).toBeInTheDocument();
  });

  it("totals only the visible rows", () => {
    renderWithProviders(<CommitmentList rows={rows} />);
    expect(screen.getByText("Total (2)")).toBeInTheDocument();
    expect(screen.getByText("€112,000.00")).toBeInTheDocument();
  });

  it("filters by free-text search", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentList rows={rows} />);
    await user.type(screen.getByLabelText("Search commitments"), "lift");
    expect(screen.queryByText("Roof replacement — Block A")).not.toBeInTheDocument();
    expect(screen.getByText("Lift servicing contract")).toBeInTheDocument();
    expect(screen.getByText("Total (1)")).toBeInTheDocument();
  });

  it("matches the counterparty as well as the title", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentList rows={rows} />);
    await user.type(screen.getByLabelText("Search commitments"), "duarte");
    expect(screen.getByText("Total (1)")).toBeInTheDocument();
  });

  it("shows an unapproved variance as a warning figure", () => {
    renderWithProviders(<CommitmentList rows={rows} />);
    expect(screen.getByText("€1,500.00")).toHaveClass("text-destructive");
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentList rows={rows} />);
    await user.type(screen.getByLabelText("Search commitments"), "nothing here");
    expect(screen.getByText("No commitments match these filters.")).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------- approval */

describe("approval", () => {
  const pendingRequest: ApprovalRequestRow = {
    id: "req-1",
    target_type: "commitment",
    target_id: "aaaaaaaa-1111-4111-8111-111111111111",
    reason: "Board approved the works",
    requested_amount: 100000,
    requested_by: OWNER,
    requested_at: "2026-02-01T10:00:00Z",
    decision: "pending",
    decided_by: null,
    decided_at: null,
    decision_reason: null,
  };

  function renderApproval(props: {
    row?: CommitmentRow;
    requests?: ApprovalRequestRow[];
    capabilities?: typeof owner;
    userId?: string;
  }) {
    return renderWithProviders(
      <WithActions
        render={(actions) => (
          <ApprovalPanel
            commitment={props.row ?? commitment()}
            requests={props.requests ?? []}
            capabilities={props.capabilities ?? owner}
            userId={props.userId}
            actions={actions}
          />
        )}
      />,
    );
  }

  it("lets a recorder request approval on a draft", async () => {
    const user = userEvent.setup();
    renderApproval({ capabilities: assistant });
    await user.type(screen.getByLabelText("Reason for approval request"), "Board approved");
    await user.click(screen.getByRole("button", { name: "Request approval" }));
    await waitFor(() => expect(commitmentFns.requestCommitmentApproval).toHaveBeenCalled());
    expect(lastCommitmentPayload("requestCommitmentApproval")).toMatchObject({
      commitmentId: "aaaaaaaa-1111-4111-8111-111111111111",
      reason: "Board approved",
    });
  });

  it("hides the request action from a viewer", () => {
    renderApproval({ capabilities: viewer });
    expect(screen.queryByRole("button", { name: "Request approval" })).not.toBeInTheDocument();
  });

  it("hides the request action once a request is pending", () => {
    renderApproval({
      row: commitment({ status: "pending_approval", approval_status: "pending" }),
      requests: [pendingRequest],
    });
    expect(screen.queryByRole("button", { name: "Request approval" })).not.toBeInTheDocument();
  });

  it("offers approve and reject to an approver", () => {
    renderApproval({
      row: commitment({ status: "pending_approval", approval_status: "pending" }),
      requests: [pendingRequest],
      capabilities: approver,
      userId: APPROVER,
    });
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  it("does not offer a decision to someone who cannot approve", () => {
    renderApproval({
      row: commitment({ status: "pending_approval", approval_status: "pending" }),
      requests: [pendingRequest],
      capabilities: assistant,
    });
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("blocks self-approval until an override reason is written", async () => {
    const user = userEvent.setup();
    renderApproval({
      row: commitment({ status: "pending_approval", approval_status: "pending" }),
      requests: [pendingRequest],
      capabilities: owner,
      userId: OWNER,
    });
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    await user.type(screen.getByLabelText("Override reason"), "Sole director");
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  it("sends the override reason with a self-approval", async () => {
    const user = userEvent.setup();
    renderApproval({
      row: commitment({ status: "pending_approval", approval_status: "pending" }),
      requests: [pendingRequest],
      capabilities: owner,
      userId: OWNER,
    });
    await user.type(screen.getByLabelText("Override reason"), "Sole director");
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(commitmentFns.approveCommitment).toHaveBeenCalled());
    expect(lastCommitmentPayload("approveCommitment")).toMatchObject({
      overrideReason: "Sole director",
    });
  });

  it("requires a reason before a rejection can be sent", async () => {
    const user = userEvent.setup();
    renderApproval({
      row: commitment({ status: "pending_approval", approval_status: "pending" }),
      requests: [pendingRequest],
      capabilities: approver,
      userId: APPROVER,
    });
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    await user.type(screen.getByLabelText("Comment / rejection reason"), "Quote too high");
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(commitmentFns.rejectCommitment).toHaveBeenCalled());
    expect(lastCommitmentPayload("rejectCommitment")).toMatchObject({ reason: "Quote too high" });
  });

  it("shows the decision history", () => {
    renderApproval({
      row: commitment({ approval_status: "rejected" }),
      requests: [
        { ...pendingRequest, decision: "rejected", decision_reason: "Quote too high" },
      ],
    });
    expect(screen.getAllByText("Rejected").length).toBeGreaterThan(0);
    expect(screen.getByText("Quote too high")).toBeInTheDocument();
  });

  it("tells a recorder that a rejected draft can be revised", () => {
    renderApproval({ row: commitment({ approval_status: "rejected" }), capabilities: assistant });
    expect(
      screen.getByText(/Revise the draft and request approval again/),
    ).toBeInTheDocument();
  });

  it("recognises self-approval only for the requester", () => {
    expect(isSelfApproval(OWNER, OWNER)).toBe(true);
    expect(isSelfApproval(OWNER, APPROVER)).toBe(false);
    expect(isSelfApproval(null, OWNER)).toBe(false);
  });
});

/* -------------------------------------------------------------- schedule */

describe("schedule versioning", () => {
  function renderSchedule(props: {
    row?: CommitmentRow;
    versions?: ScheduleVersionRow[];
    lines?: ScheduleLineRow[];
    capabilities?: typeof owner;
    projections?: { source_id: string; state: string; reconciliation_state: string }[];
  }) {
    return renderWithProviders(
      <WithActions
        render={(actions) => (
          <SchedulePanel
            commitment={props.row ?? commitment({ status: "active", approval_status: "approved" })}
            versions={props.versions ?? [version()]}
            lines={props.lines ?? [line()]}
            capabilities={props.capabilities ?? owner}
            actions={actions}
            projections={props.projections ?? []}
          />
        )}
      />,
    );
  }

  it("lists every version with its effective date and total", () => {
    renderSchedule({
      versions: [
        version({ id: "ver-2", version_no: 2, effective_from: "2026-06-01", total_amount: 90000 }),
        version({ is_current: false, status: "superseded" }),
      ],
    });
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText(/From 01 Jun 2026/)).toBeInTheDocument();
    expect(screen.getByText("Superseded")).toBeInTheDocument();
  });

  it("shows each line's own status and its cash-flow projection", () => {
    renderSchedule({
      lines: [line(), line({ id: "dddddddd-2222-4222-8222-222222222222", line_no: 2, status: "paid", amount: 60000 })],
      projections: [{ source_id: "dddddddd-1111-4111-8111-111111111111", state: "committed", reconciliation_state: "unmatched" }],
    });
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText(/Committed · Unmatched/)).toBeInTheDocument();
    expect(screen.getByText("Not projected")).toBeInTheDocument();
  });

  it("hides the revision action from a recorder who cannot manage", () => {
    renderSchedule({ capabilities: assistant });
    expect(screen.queryByRole("button", { name: /Revise schedule/ })).not.toBeInTheDocument();
  });

  it("carries only untouched lines into a revision", async () => {
    const user = userEvent.setup();
    renderSchedule({
      lines: [
        line(),
        line({ id: "dddddddd-2222-4222-8222-222222222222", line_no: 2, status: "paid", amount: 60000 }),
      ],
    });
    await user.click(screen.getByRole("button", { name: /Revise schedule/ }));
    expect(screen.getByLabelText("Amount line 1")).toHaveValue("40000");
    expect(screen.queryByLabelText("Amount line 2")).not.toBeInTheDocument();
  });

  it("counts frozen history towards the schedule total", async () => {
    const user = userEvent.setup();
    renderSchedule({
      lines: [line(), line({ id: "dddddddd-2222-4222-8222-222222222222", line_no: 2, status: "paid", amount: 60000 })],
    });
    await user.click(screen.getByRole("button", { name: /Revise schedule/ }));
    expect(screen.getByText(/Frozen history/).parentElement!.textContent).toContain("€60,000.00");
    expect(screen.getByText(/Schedule total/).parentElement!.textContent).toContain("€100,000.00");
  });

  it("warns as soon as the revision exceeds the authorised amount", async () => {
    const user = userEvent.setup();
    renderSchedule({});
    await user.click(screen.getByRole("button", { name: /Revise schedule/ }));
    const amount = screen.getByLabelText("Amount line 1");
    await user.clear(amount);
    await user.type(amount, "150000");
    expect(screen.getByRole("alert").textContent).toMatch(/Over the authorised amount/);
  });

  it("sends the whole version, not a line edit", async () => {
    const user = userEvent.setup();
    renderSchedule({});
    await user.click(screen.getByRole("button", { name: /Revise schedule/ }));
    await user.click(screen.getByRole("button", { name: "Save version" }));
    await waitFor(() => expect(commitmentFns.createScheduleVersion).toHaveBeenCalled());
    const payload = lastCommitmentPayload("createScheduleVersion") as {
      commitmentId: string;
      lines: unknown[];
    };
    expect(payload.commitmentId).toBe("aaaaaaaa-1111-4111-8111-111111111111");
    expect(payload.lines).toHaveLength(1);
  });

  it("refuses to save a version with no dated lines", async () => {
    const user = userEvent.setup();
    renderSchedule({ versions: [], lines: [] });
    await user.click(screen.getByRole("button", { name: /Create schedule/ }));
    await user.click(screen.getByRole("button", { name: "Save version" }));
    expect(commitmentFns.createScheduleVersion).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("adds and removes lines while renumbering them", async () => {
    const user = userEvent.setup();
    renderSchedule({});
    await user.click(screen.getByRole("button", { name: /Revise schedule/ }));
    await user.click(screen.getByRole("button", { name: /Add line/ }));
    expect(screen.getByLabelText("Amount line 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove line 1" }));
    expect(screen.queryByLabelText("Amount line 2")).not.toBeInTheDocument();
  });

  it("blocks activation while a variance is unapproved", () => {
    renderSchedule({
      versions: [
        version({
          status: "draft",
          is_current: false,
          requires_approval: true,
          variance_amount: 20000,
          variance_approved: false,
        }),
      ],
    });
    expect(screen.getByRole("button", { name: "Activate version" })).toBeDisabled();
    expect(screen.getByRole("alert").textContent).toMatch(/exceeds the authorised amount/);
  });

  it("lets an approver approve the variance with a reason", async () => {
    const user = userEvent.setup();
    renderSchedule({
      capabilities: owner,
      versions: [
        version({
          status: "draft",
          is_current: false,
          requires_approval: true,
          variance_amount: 20000,
        }),
      ],
    });
    await user.type(screen.getByLabelText("Variance approval reason"), "Scope increase agreed");
    await user.click(screen.getByRole("button", { name: "Approve variance" }));
    await waitFor(() => expect(commitmentFns.approveScheduleVariance).toHaveBeenCalled());
    expect(lastCommitmentPayload("approveScheduleVariance")).toMatchObject({
      versionId: "cccccccc-1111-4111-8111-111111111111",
      reason: "Scope increase agreed",
    });
  });

  it("activates a clean draft version", async () => {
    const user = userEvent.setup();
    renderSchedule({ versions: [version({ status: "draft", is_current: false })] });
    await user.click(screen.getByRole("button", { name: "Activate version" }));
    await waitFor(() => expect(commitmentFns.activateScheduleVersion).toHaveBeenCalled());
  });

  it("offers no schedule editing on a completed commitment", () => {
    renderSchedule({ row: commitment({ status: "completed" }) });
    expect(screen.queryByRole("button", { name: /Revise schedule/ })).not.toBeInTheDocument();
  });

  it("spreads a monthly schedule without losing cents", () => {
    const lines = monthlyLines("2026-01-15", 3, 1000);
    expect(lines).toHaveLength(3);
    expect(scheduleTotal(lines)).toBe(1000);
    expect(lines[2]!.expectedDate).toBe("2026-03-15");
  });
});

/* ------------------------------------------------------------- drawdowns */

describe("drawdowns", () => {
  const drawdown = (overrides: Partial<DrawdownRow> = {}): DrawdownRow => ({
    id: "eeeeeeee-1111-4111-8111-111111111111",
    commitment_id: "aaaaaaaa-1111-4111-8111-111111111111",
    document_id: DOCUMENTS[0]!.id,
    schedule_line_id: "dddddddd-1111-4111-8111-111111111111",
    amount: 24600,
    drawdown_date: "2026-03-05",
    kind: "allocation",
    status: "active",
    reverses_drawdown_id: null,
    reversal_reason: null,
    reversed_at: null,
    notes: null,
    created_at: "2026-03-05T10:00:00Z",
    ...overrides,
  });

  function renderDrawdowns(props: {
    summary?: CommitmentSummary | null;
    drawdowns?: DrawdownRow[];
    capabilities?: typeof owner;
  }) {
    const s = props.summary === undefined ? summary() : props.summary;
    return renderWithProviders(
      <WithActions
        render={(actions) => (
          <DrawdownPanel
            currency="EUR"
            summary={s}
            allSummaries={s ? [s] : []}
            drawdowns={props.drawdowns ?? []}
            lines={[line()]}
            documents={DOCUMENTS}
            capabilities={props.capabilities ?? owner}
            actions={actions}
          />
        )}
      />,
    );
  }

  it("shows the net drawn and remaining capacity from the view", () => {
    renderDrawdowns({ drawdowns: [drawdown()] });
    expect(screen.getByText(/Net drawn/).parentElement!.textContent).toContain("€24,600.00");
    expect(screen.getByText(/Net drawn/).parentElement!.textContent).toContain("€60,000.00");
  });

  it("excludes reversed rows from the net drawn", () => {
    renderDrawdowns({
      drawdowns: [
        drawdown({ status: "reversed", reversal_reason: "Wrong commitment" }),
        drawdown({ id: "eeeeeeee-2222-4222-8222-222222222222", kind: "reversal", amount: -24600, status: "reversed" }),
      ],
    });
    expect(screen.getByText(/Net drawn/).parentElement!.textContent).toContain("€0.00");
  });

  it("shows the lineage between a reversal and its original", () => {
    renderDrawdowns({
      drawdowns: [
        drawdown({ status: "reversed" }),
        drawdown({
          id: "eeeeeeee-2222-4222-8222-222222222222",
          kind: "reversal",
          amount: -24600,
          status: "reversed",
          reverses_drawdown_id: "eeeeeeee-1111-4111-8111-111111111111",
        }),
      ],
    });
    expect(screen.getByText(/Reverses €24,600.00 of 05 Mar 2026/)).toBeInTheDocument();
  });

  it("only allows a drawdown on an active commitment", () => {
    renderDrawdowns({ summary: summary({ status: "approved" }) });
    expect(screen.getByRole("button", { name: /Record drawdown/ })).toBeDisabled();
  });

  it("hides the drawdown action from a viewer", () => {
    renderDrawdowns({ capabilities: viewer });
    expect(screen.getByRole("button", { name: /Record drawdown/ })).toBeDisabled();
  });

  it("refuses to submit without a document", async () => {
    const user = userEvent.setup();
    renderDrawdowns({});
    await user.click(screen.getByRole("button", { name: /Record drawdown/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Record drawdown" }));
    expect(commitmentFns.createDrawdown).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert").textContent).toMatch(/Select the posted/);
  });

  it("supports several allocation rows for one document", async () => {
    const user = userEvent.setup();
    renderDrawdowns({});
    await user.click(screen.getByRole("button", { name: /Record drawdown/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Add allocation/ }));
    expect(within(dialog).getByLabelText("Amount allocation 2")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Remove allocation 2" }));
    expect(within(dialog).queryByLabelText("Amount allocation 2")).not.toBeInTheDocument();
  });

  it("keeps a running allocated total", async () => {
    const user = userEvent.setup();
    renderDrawdowns({});
    await user.click(screen.getByRole("button", { name: /Record drawdown/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Amount allocation 1"), "1500");
    expect(within(dialog).getByText(/Allocated/).parentElement!.textContent).toContain("€1,500.00");
  });

  it("requires a reason before a reversal can be sent", async () => {
    const user = userEvent.setup();
    renderDrawdowns({ drawdowns: [drawdown()] });
    const reverse = screen.getByRole("button", { name: "Reverse" });
    expect(reverse).toBeDisabled();
    await user.type(screen.getByLabelText(/Reversal reason/), "Allocated to the wrong job");
    await user.click(screen.getByRole("button", { name: "Reverse" }));
    await waitFor(() => expect(commitmentFns.reverseDrawdown).toHaveBeenCalled());
    expect(lastCommitmentPayload("reverseDrawdown")).toMatchObject({
      drawdownId: "eeeeeeee-1111-4111-8111-111111111111",
      reason: "Allocated to the wrong job",
    });
  });

  it("never offers to reverse a reversal", () => {
    renderDrawdowns({
      drawdowns: [drawdown({ id: "eeeeeeee-2222-4222-8222-222222222222", kind: "reversal", amount: -100 })],
    });
    expect(screen.queryByRole("button", { name: "Reverse" })).not.toBeInTheDocument();
  });

  it("does not offer reversal to a recorder who cannot manage", () => {
    renderDrawdowns({ drawdowns: [drawdown()], capabilities: assistant });
    expect(screen.queryByRole("button", { name: "Reverse" })).not.toBeInTheDocument();
  });
});

/* ----------------------------------------------------------- maintenance */

describe("maintenance", () => {
  const job = (overrides: Partial<MaintenanceJobRow> = {}): MaintenanceJobRow => ({
    id: "bbbbbbbb-1111-4111-8111-111111111111",
    company_id: COMPANY,
    code: "MNT-001",
    title: "Boiler service",
    description: null,
    status: "scheduled",
    priority: "high",
    requested_date: "2026-02-01",
    target_date: "2026-03-01",
    completion_date: null,
    responsible_name: "Ana",
    counterparty_id: "ffffffff-1111-4111-8111-111111111111",
    commitment_id: "aaaaaaaa-1111-4111-8111-111111111111",
    cancellation_reason: null,
    notes: null,
    ...overrides,
  });

  function renderMaintenance(jobs: MaintenanceJobRow[], capabilities = owner) {
    return renderWithProviders(
      <WithActions
        render={(actions) => (
          <MaintenancePanel
            companyId={COMPANY}
            jobs={jobs}
            commitments={[summary()]}
            capabilities={capabilities}
            actions={actions}
          />
        )}
      />,
    );
  }

  it("shows operational fields alongside derived commitment costs", () => {
    renderMaintenance([job()]);
    expect(screen.getByText("Boiler service")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("€60,000.00")).toBeInTheDocument();
    expect(screen.getByText("€40,000.00")).toBeInTheDocument();
  });

  it("shows a dash instead of a cost when no commitment is linked", () => {
    renderMaintenance([job({ commitment_id: null })]);
    const row = screen.getByText("Boiler service").closest("tr")!;
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("creates a job through the server contract", async () => {
    const user = userEvent.setup();
    renderMaintenance([]);
    await user.click(screen.getByRole("button", { name: /New job/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Title"), "Gutter clearing");
    await user.click(within(dialog).getByRole("button", { name: "Create job" }));
    await waitFor(() => expect(commitmentFns.createMaintenanceJob).toHaveBeenCalled());
    expect(lastCommitmentPayload("createMaintenanceJob")).toMatchObject({
      companyId: COMPANY,
      title: "Gutter clearing",
    });
  });

  it("refuses an empty title", async () => {
    const user = userEvent.setup();
    renderMaintenance([]);
    await user.click(screen.getByRole("button", { name: /New job/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Create job" }));
    expect(commitmentFns.createMaintenanceJob).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
  });

  it("updates an existing job with its identifier", async () => {
    const user = userEvent.setup();
    renderMaintenance([job()]);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Responsible"), " Silva");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(commitmentFns.updateMaintenanceJob).toHaveBeenCalled());
    expect(lastCommitmentPayload("updateMaintenanceJob")).toMatchObject({
      jobId: "bbbbbbbb-1111-4111-8111-111111111111",
      responsibleName: "Ana Silva",
    });
  });

  it("gives a viewer no way to create or edit jobs", () => {
    renderMaintenance([job()], viewer);
    expect(screen.getByRole("button", { name: /New job/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});

/* ----------------------------------------------------------------- capex */

describe("capex summary", () => {
  const row: CapexSummaryRow = {
    company_id: COMPANY,
    project_id: "ffffffff-2222-4222-8222-222222222222",
    code: "CPX-1",
    name: "Block A refurbishment",
    status: "in_progress",
    project_type: "capex",
    property_id: "prop-1",
    property_name: "Rua do Almada 12",
    currency: "EUR",
    budget_amount: 120000,
    actual_amount: 25000,
    committed_amount: 100000,
    forecast_amount: 0,
    approved_commitments: 2,
    active_commitments: 1,
    invoiced_amount: 40000,
    paid_amount: 25000,
    remaining_budget: 20000,
    commitment_variance: 0,
    invoice_variance: 0,
    spend_pct: 83.3,
  };

  it("renders every derived money column", () => {
    renderWithProviders(<CapexPanel rows={[row]} />);
    expect(screen.getByText("Block A refurbishment")).toBeInTheDocument();
    expect(screen.getByText("Rua do Almada 12")).toBeInTheDocument();
    expect(screen.getByText("€120,000.00")).toBeInTheDocument();
    expect(screen.getByText("€100,000.00")).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
    expect(screen.getByText("83.3%")).toBeInTheDocument();
  });

  it("flags an over-committed project", () => {
    renderWithProviders(
      <CapexPanel rows={[{ ...row, commitment_variance: 15000 }]} />,
    );
    expect(screen.getByText("€15,000.00")).toHaveClass("text-destructive");
  });

  it("shows an empty state with no projects", () => {
    renderWithProviders(<CapexPanel rows={[]} />);
    expect(screen.getByText("No capex projects yet.")).toBeInTheDocument();
  });
});

/* ---------------------------------------------------------- capabilities */

describe("capability mapping", () => {
  it("mirrors the database predicates", () => {
    expect(commitmentCapabilities(["owner"])).toEqual({
      canView: true,
      canRecord: true,
      canManage: true,
      canApprove: true,
    });
    expect(commitmentCapabilities(["approver"])).toMatchObject({
      canRecord: false,
      canManage: false,
      canApprove: true,
    });
    expect(commitmentCapabilities(["bookkeeper"])).toMatchObject({
      canRecord: true,
      canManage: false,
      canApprove: false,
    });
    expect(commitmentCapabilities(["viewer"])).toMatchObject({
      canView: true,
      canRecord: false,
      canManage: false,
      canApprove: false,
    });
    expect(commitmentCapabilities([])).toMatchObject({ canView: false, canApprove: false });
  });
});
