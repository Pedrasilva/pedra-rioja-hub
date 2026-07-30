/**
 * Phase 8F.2 — acquisition pipeline UI tests.
 *
 * Same boundary discipline as the other suites: the only ways out are the
 * Supabase read client and the acquisition server functions, both mocked.
 * These tests cover the pipeline board and register, the opportunity
 * workspace, permitted stage moves, permission gating and the one rule that
 * matters most — a deal never creates financial value on its own.
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
    const { to, params, ...attrs } = rest as Record<string, unknown>;
    let href = String(to ?? "#");
    for (const [k, v] of Object.entries((params ?? {}) as Record<string, string>)) {
      href = href.replace(`$${k}`, v);
    }
    return (
      <a href={href} {...attrs}>
        {children as never}
      </a>
    );
  },
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/modules/acquisitions/acquisitions.functions", async () =>
  (await import("./mocks")).acquisitionFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./mocks")).toastMock }));

import { acquisitionCapabilities } from "@/modules/acquisitions/capabilities";
import { permittedMoves, STAGE_TRANSITIONS } from "@/modules/acquisitions/schemas";
import { useAcquisitionActions } from "@/modules/acquisitions/server";
import { AcquisitionPipeline } from "@/modules/acquisitions/components/pipeline-board";
import { OpportunityDetail } from "@/modules/acquisitions/components/opportunity-detail";
import { OpportunityDialog } from "@/modules/acquisitions/components/opportunity-dialog";
import type { AcquisitionOpportunity } from "@/modules/acquisitions/queries";

import {
  acquisitionFns,
  lastAcquisitionPayload,
  renderWithProviders,
  resetCalls,
  seed,
} from "./harness";

const COMPANY = "11111111-1111-4111-8111-111111111111";
const manager = acquisitionCapabilities(["manager"]);
const bookkeeper = acquisitionCapabilities(["bookkeeper"]);
const viewer = acquisitionCapabilities(["viewer"]);

function opportunity(overrides: Partial<AcquisitionOpportunity> = {}): AcquisitionOpportunity {
  return {
    opportunity_id: "opp-1",
    company_id: COMPANY,
    reference: "AO-2026-0001",
    title: "Calle Mayor 14",
    property_name: "Mayor 14 block",
    address: "Calle Mayor 14",
    location: "Logroño",
    opportunity_type: "mixed_use",
    source: "Broker",
    broker_id: null,
    broker_name: null,
    seller_id: null,
    seller_name: null,
    contact_name: "Ana Ruiz",
    contact_email: "ana@broker.test",
    contact_phone: null,
    assigned_to: null,
    stage: "under_analysis",
    probability: 40,
    link_kind: "prospective_property",
    property_id: null,
    currency: "EUR",
    asking_price: 1_200_000,
    indicative_offer: 1_050_000,
    valuation_amount: 1_100_000,
    target_acquisition_date: "2026-09-30",
    expected_closing_date: "2026-11-15",
    decision: null,
    decision_reason: null,
    notes: null,
    archived_at: null,
    created_at: "2026-02-01T09:00:00Z",
    updated_at: "2026-02-01T09:00:00Z",
    created_by: null,
    is_archived: false,
    weighted_estimate: 480_000,
    activity_count: 2,
    open_task_count: 1,
    offer_count: 1,
    latest_offer_amount: 1_020_000,
    latest_valuation: 1_100_000,
    linked_commitment_count: 0,
    ...overrides,
  };
}

function ActionsProbe({
  opportunity: opp,
  capabilities,
}: {
  opportunity: AcquisitionOpportunity;
  capabilities: ReturnType<typeof acquisitionCapabilities>;
}) {
  const actions = useAcquisitionActions();
  return <OpportunityDetail opportunity={opp} capabilities={capabilities} actions={actions} />;
}

function DialogProbe({ disabled }: { disabled?: boolean }) {
  const actions = useAcquisitionActions();
  return <OpportunityDialog companyId={COMPANY} actions={actions} disabled={disabled} />;
}

beforeEach(() => {
  resetCalls();
  for (const fn of Object.values(acquisitionFns)) fn.mockClear();
  seed({
    acquisition_activities: [],
    acquisition_tasks: [],
    acquisition_valuations: [],
    acquisition_offers: [],
    v_acquisition_commitment_link: [],
    acquisition_stage_events: [],
    commitments: [],
  });
});

/* ------------------------------------------------------------- pipeline */

describe("the pipeline", () => {
  it("shows a board column per stage and a register with the weighted total", async () => {
    renderWithProviders(
      <AcquisitionPipeline
        rows={[
          opportunity(),
          opportunity({
            opportunity_id: "opp-2",
            reference: "AO-2026-0002",
            title: "Nave industrial Agoncillo",
            stage: "lead",
            weighted_estimate: 90_000,
          }),
        ]}
      />,
    );

    expect(await screen.findByText("Under analysis")).toBeInTheDocument();
    expect(screen.getByText("Offer accepted")).toBeInTheDocument();
    expect(screen.getByText("Calle Mayor 14")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Register" }));
    expect(await screen.findByText("Weighted pipeline in view (indicative only)")).toBeInTheDocument();
  });

  it("hides archived opportunities until asked for them", async () => {
    renderWithProviders(
      <AcquisitionPipeline
        rows={[
          opportunity({
            opportunity_id: "opp-a",
            reference: "AO-2026-0009",
            title: "Withdrawn warehouse",
            is_archived: true,
            archived_at: "2026-03-01T00:00:00Z",
          }),
        ]}
      />,
    );

    expect(screen.queryByText("Withdrawn warehouse")).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Show archived"));
    expect(await screen.findByText("Withdrawn warehouse")).toBeInTheDocument();
  });

  it("filters by search text", async () => {
    renderWithProviders(
      <AcquisitionPipeline
        rows={[
          opportunity(),
          opportunity({
            opportunity_id: "opp-2",
            reference: "AO-2026-0002",
            title: "Nave industrial Agoncillo",
          }),
        ]}
      />,
    );
    await userEvent.type(screen.getByLabelText("Search opportunities"), "Agoncillo");
    expect(screen.queryByText("Calle Mayor 14")).not.toBeInTheDocument();
    expect(screen.getByText("Nave industrial Agoncillo")).toBeInTheDocument();
  });
});

/* -------------------------------------------------------- stage moves */

describe("stage movement", () => {
  it("offers only the transitions the flow allows", () => {
    expect(permittedMoves("lead", true)).toEqual(["initial_review", "withdrawn"]);
    expect(permittedMoves("under_analysis", true)).toEqual([
      "offer_preparation",
      "offer_rejected",
      "withdrawn",
    ]);
    // Accepting a deal is a managing decision.
    expect(permittedMoves("offer_submitted", false)).not.toContain("offer_accepted");
    expect(permittedMoves("offer_submitted", true)).toContain("offer_accepted");
    // Reopening a closed deal is never an ordinary recording action.
    expect(permittedMoves("offer_rejected", false)).toEqual([]);
    expect(permittedMoves("withdrawn", true)).toEqual(["lead"]);
  });

  it("never allows a closed stage to jump straight back into an offer", () => {
    for (const target of STAGE_TRANSITIONS.offer_accepted) {
      expect(target.to).toBe("withdrawn");
    }
  });

  it("sends the move with its reason through the server function", async () => {
    renderWithProviders(<ActionsProbe opportunity={opportunity()} capabilities={manager} />);

    await userEvent.click(screen.getByRole("button", { name: /move to offer preparation/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Numbers stack up");
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm move" }));

    expect(acquisitionFns.moveOpportunityStage).toHaveBeenCalledTimes(1);
    expect(lastAcquisitionPayload("moveOpportunityStage")).toMatchObject({
      opportunityId: "opp-1",
      stage: "offer_preparation",
      reason: "Numbers stack up",
    });
  });
});

/* ---------------------------------------------------------- workspace */

describe("the opportunity workspace", () => {
  it("labels every figure as indicative and warns that no commitment is implicit", async () => {
    renderWithProviders(<ActionsProbe opportunity={opportunity()} capabilities={manager} />);
    expect(
      await screen.findByText(/indicative deal estimate/i),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Commitments" }));
    expect(await screen.findByText(/never creates one implicitly/i)).toBeInTheDocument();
  });

  it("records an activity on the timeline", async () => {
    renderWithProviders(<ActionsProbe opportunity={opportunity()} capabilities={manager} />);
    await userEvent.click(screen.getByRole("tab", { name: "Activity" }));
    await userEvent.click(await screen.findByRole("button", { name: "Record activity" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Summary"), "Site visit with the broker");
    await userEvent.click(within(dialog).getByRole("button", { name: "Record" }));

    expect(lastAcquisitionPayload("recordAcquisitionActivity")).toMatchObject({
      opportunityId: "opp-1",
      activityType: "note",
      summary: "Site visit with the broker",
    });
  });

  it("records an offer without touching any accounting surface", async () => {
    renderWithProviders(<ActionsProbe opportunity={opportunity()} capabilities={manager} />);
    await userEvent.click(screen.getByRole("tab", { name: "Offers" }));
    await userEvent.click(await screen.findByRole("button", { name: "Record offer" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Amount"), "1015000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Record offer" }));

    expect(lastAcquisitionPayload("recordAcquisitionOffer")).toMatchObject({
      opportunityId: "opp-1",
      amount: 1015000,
    });
    // No commitment, no payment, no bookkeeping call rode along with it.
    expect(acquisitionFns.createAcquisitionCommitment).not.toHaveBeenCalled();
    expect(acquisitionFns.linkAcquisitionCommitment).not.toHaveBeenCalled();
  });

  it("records a valuation and states that it stays informational", async () => {
    renderWithProviders(<ActionsProbe opportunity={opportunity()} capabilities={manager} />);
    await userEvent.click(screen.getByRole("tab", { name: "Valuations" }));
    expect(
      await screen.findByText(/never feed the portfolio, an asset value or an investment metric/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Record valuation" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Estimated value"), "1150000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Record" }));

    expect(lastAcquisitionPayload("recordAcquisitionValuation")).toMatchObject({
      opportunityId: "opp-1",
      estimatedValue: 1150000,
      method: "desktop",
    });
  });

  it("adds a task and completes it", async () => {
    seed({
      acquisition_tasks: [
        {
          id: "task-1",
          opportunity_id: "opp-1",
          description: "Request the cadastral certificate",
          assignee_id: null,
          due_date: "2026-03-10",
          priority: "high",
          reminder_at: null,
          status: "open",
          completed_at: null,
        },
      ],
    });
    renderWithProviders(<ActionsProbe opportunity={opportunity()} capabilities={manager} />);
    await userEvent.click(screen.getByRole("tab", { name: "Tasks" }));

    await userEvent.click(await screen.findByRole("button", { name: "Complete" }));
    expect(lastAcquisitionPayload("setAcquisitionTaskStatus")).toMatchObject({
      taskId: "task-1",
      status: "completed",
    });
  });

  it("creates a commitment only through the explicit hand-over", async () => {
    renderWithProviders(
      <ActionsProbe opportunity={opportunity({ stage: "offer_accepted" })} capabilities={manager} />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Commitments" }));
    await userEvent.click(await screen.findByRole("button", { name: "Create commitment" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/goes through its own approval/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Create commitment" }));

    expect(acquisitionFns.createAcquisitionCommitment).toHaveBeenCalledTimes(1);
    expect(lastAcquisitionPayload("createAcquisitionCommitment")).toMatchObject({
      opportunityId: "opp-1",
      authorisedAmount: 1_020_000,
    });
  });

  it("archives with a reason and restores an archived deal", async () => {
    const { unmount } = renderWithProviders(
      <ActionsProbe opportunity={opportunity()} capabilities={manager} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Seller pulled out");
    await userEvent.click(within(dialog).getAllByRole("button", { name: "Archive" })[0]);
    expect(lastAcquisitionPayload("archiveOpportunity")).toMatchObject({
      opportunityId: "opp-1",
      reason: "Seller pulled out",
    });
    unmount();

    renderWithProviders(
      <ActionsProbe
        opportunity={opportunity({ is_archived: true, archived_at: "2026-03-01T00:00:00Z" })}
        capabilities={manager}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(lastAcquisitionPayload("restoreOpportunity")).toMatchObject({
      opportunityId: "opp-1",
    });
  });
});

/* --------------------------------------------------------- permissions */

describe("permissions", () => {
  it("maps roles onto the database predicates", () => {
    expect(manager).toMatchObject({ canRecord: true, canManage: true, canAcceptOffer: true });
    expect(bookkeeper).toMatchObject({ canRecord: true, canManage: false, canAcceptOffer: false });
    expect(viewer).toMatchObject({ canView: true, canRecord: false, canManage: false });
  });

  it("gives a viewer no way to change anything", async () => {
    renderWithProviders(<ActionsProbe opportunity={opportunity()} capabilities={viewer} />);
    // Every stage move on this deal needs recording rights.
    for (const button of screen.queryAllByRole("button", { name: /move to/i })) {
      expect(button).toBeDisabled();
    }
    await userEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(await screen.findByRole("button", { name: "Record activity" })).toBeDisabled();
  });

  it("keeps archiving away from a bookkeeper", () => {
    renderWithProviders(<ActionsProbe opportunity={opportunity()} capabilities={bookkeeper} />);
    expect(screen.getByRole("button", { name: "Archive" })).toBeDisabled();
  });
});

/* -------------------------------------------------------------- editor */

describe("the opportunity editor", () => {
  it("refuses an empty title and creates once the form is valid", async () => {
    renderWithProviders(<DialogProbe />);
    await userEvent.click(screen.getByRole("button", { name: /new opportunity/i }));
    const dialog = await screen.findByRole("dialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "Create opportunity" }));
    expect(acquisitionFns.createOpportunity).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/give the opportunity a title/i)).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText("Title"), "Bodega Haro");
    await userEvent.type(within(dialog).getByLabelText("Asking price (indicative)"), "800000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create opportunity" }));

    expect(lastAcquisitionPayload("createOpportunity")).toMatchObject({
      companyId: COMPANY,
      title: "Bodega Haro",
      askingPrice: 800000,
    });
  });

  it("is unavailable without recording rights", async () => {
    renderWithProviders(<DialogProbe disabled />);
    expect(screen.getByRole("button", { name: /new opportunity/i })).toBeDisabled();
  });
});
