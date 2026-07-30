/**
 * Phase 8B — operational register, reminder and commitment-link component
 * tests.
 *
 * Same boundary discipline as the Phase 8A suites: the only ways out of the
 * module are the Supabase read client and the operations server functions,
 * both mocked here. The tests exist mainly to hold one rule in place — an
 * operational record shows money but never accepts it, because the commitment
 * owns the amount.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("./mocks")).supabaseProxy,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/modules/operations/operations.functions", async () =>
  (await import("./mocks")).operationsFnModule(),
);
vi.mock("@/modules/bookkeeping/bookkeeping.functions", async () =>
  (await import("./mocks")).serverFnModule(),
);
vi.mock("@/modules/commitments/commitments.functions", async () =>
  (await import("./mocks")).commitmentFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./mocks")).toastMock }));

import { commitmentCapabilities } from "@/modules/commitments/capabilities";
import type { CommitmentSummary } from "@/modules/commitments/queries";
import { CommitmentLinkDialog } from "@/modules/operations/components/commitment-link-dialog";
import {
  RegisterPanel,
  type RegisterDef,
  type RegisterRow,
} from "@/modules/operations/components/register-panel";
import {
  insuranceRegister,
  obligationRegister,
  serviceContractRegister,
  taxRegister,
  utilityRegister,
} from "@/modules/operations/components/registers";
import { RemindersPanel } from "@/modules/operations/components/reminders-panel";
import { TaxDatesDialog } from "@/modules/operations/components/tax-dates-dialog";
import type { ObligationSummary, OperationalReminder } from "@/modules/operations/queries";
import {
  OPERATIONAL_ENTITY_TYPES,
  insurancePolicyCreateSchema,
  obligationCreateSchema,
  serviceContractCreateSchema,
  taxScheduleCreateSchema,
  utilityContractCreateSchema,
} from "@/modules/operations/schemas";
import { useOperationsActions } from "@/modules/operations/server";

import {
  COMPANY,
  lastOperationsPayload,
  operationsFns,
  renderWithProviders,
  resetCalls,
  seed,
  toasts,
} from "./harness";

/* ------------------------------------------------------------- fixtures */

const owner = commitmentCapabilities(["owner"]);
const assistant = commitmentCapabilities(["assistant"]);
const viewer = commitmentCapabilities(["viewer"]);

/** Derived money always arrives on the row; nothing here is user input. */
function derived(overrides: Partial<RegisterRow> = {}) {
  return {
    company_id: COMPANY,
    commitment_id: null,
    commitment_status: null,
    commitment_approval_status: null,
    commitment_currency: null,
    authorised_amount: 0,
    committed_amount: 0,
    invoiced_amount: 0,
    paid_amount: 0,
    remaining_commitment: 0,
    archived_at: null,
    ...overrides,
  };
}

function obligationRow(overrides: Partial<RegisterRow> = {}): RegisterRow {
  return {
    ...derived(),
    obligation_id: "ob-1",
    title: "Annual lift inspection",
    code: "OBL-001",
    obligation_type: "compliance",
    status: "open",
    priority: "high",
    due_date: "2026-09-30",
    days_until_due: 12,
    property_name: "Quinta do Douro",
    property_id: "prop-1",
    counterparty_id: null,
    counterparty_name: null,
    reminder_lead_days: 30,
    recurrence_frequency: "annual",
    recurrence_interval: 1,
    ...overrides,
  } as RegisterRow;
}

function contractRow(overrides: Partial<RegisterRow> = {}): RegisterRow {
  return {
    ...derived(),
    contract_id: "sc-1",
    title: "Cleaning — Block A",
    code: null,
    service_type: "cleaning",
    counterparty_name: "Limpezas Norte",
    status: "active",
    end_date: "2026-12-31",
    days_until_expiry: 45,
    auto_renew: true,
    reminder_lead_days: 60,
    ...overrides,
  } as RegisterRow;
}

function policyRow(overrides: Partial<RegisterRow> = {}): RegisterRow {
  return {
    ...derived(),
    policy_id: "ip-1",
    title: "Buildings cover",
    code: null,
    policy_type: "buildings",
    insurer_name: "Fidelidade",
    status: "active",
    expiry_date: "2027-01-15",
    days_until_expiry: 120,
    property_name: "Quinta do Douro",
    reminder_lead_days: 45,
    ...overrides,
  } as RegisterRow;
}

function utilityRow(overrides: Partial<RegisterRow> = {}): RegisterRow {
  return {
    ...derived(),
    contract_id: "uc-1",
    title: "Electricity — Block A",
    code: null,
    utility_type: "electricity",
    counterparty_name: "EDP",
    status: "active",
    account_number: "ACC-9911",
    meter_identifier: "MTR-42",
    property_name: "Quinta do Douro",
    reminder_lead_days: 30,
    ...overrides,
  } as RegisterRow;
}

function taxRow(overrides: Partial<RegisterRow> = {}): RegisterRow {
  return {
    ...derived(),
    schedule_id: "ts-1",
    title: "IMI 2026",
    code: null,
    tax_type: "imi",
    jurisdiction: "Porto",
    tax_year: 2026,
    status: "scheduled",
    scheduled_dates: 2,
    next_due_date: "2026-05-31",
    property_name: "Quinta do Douro",
    reminder_lead_days: 30,
    ...overrides,
  } as RegisterRow;
}

const COMMITMENTS: CommitmentSummary[] = [
  {
    commitment_id: "com-1",
    title: "Lift maintenance 2026",
    currency: "EUR",
    archived_at: null,
  } as unknown as CommitmentSummary,
  {
    commitment_id: "com-archived",
    title: "Retired commitment",
    currency: "EUR",
    archived_at: "2026-01-01",
  } as unknown as CommitmentSummary,
];

const OBLIGATIONS = [
  { obligation_id: "ob-1", title: "Annual lift inspection" },
] as unknown as ObligationSummary[];

function reminder(overrides: Partial<OperationalReminder> = {}): OperationalReminder {
  return {
    reminder_id: "rem-1",
    company_id: COMPANY,
    entity_type: "insurance_policy",
    entity_id: "ip-1",
    reason: "policy_expiry",
    remind_on: "2026-12-01",
    due_on: "2027-01-15",
    severity: "normal",
    status: "pending",
    title: "Buildings cover expires",
    notes: null,
    resolved_at: null,
    days_until_reminder: 10,
    days_until_due: 45,
    is_overdue: false,
    commitment_id: null,
    ...overrides,
  };
}

/* -------------------------------------------------------------- harness */

/** Renders a register with the real actions hook behind the mocked fns. */
function Register(props: {
  register: RegisterDef;
  rows: RegisterRow[];
  capabilities?: ReturnType<typeof commitmentCapabilities>;
  isLoading?: boolean;
  extra?: (row: RegisterRow) => React.ReactNode;
}) {
  const actions = useOperationsActions();
  return (
    <RegisterPanel
      register={props.register}
      companyId={COMPANY}
      rows={props.rows}
      obligations={OBLIGATIONS}
      commitments={COMMITMENTS}
      capabilities={props.capabilities ?? owner}
      actions={actions}
      isLoading={props.isLoading}
      renderExtraActions={props.extra}
    />
  );
}

function Reminders(props: {
  reminders: OperationalReminder[];
  capabilities?: ReturnType<typeof commitmentCapabilities>;
  isLoading?: boolean;
}) {
  const actions = useOperationsActions();
  return (
    <RemindersPanel
      companyId={COMPANY}
      reminders={props.reminders}
      capabilities={props.capabilities ?? owner}
      actions={actions}
      isLoading={props.isLoading}
    />
  );
}

function LinkDialog(props: { row: RegisterRow }) {
  const actions = useOperationsActions();
  return (
    <CommitmentLinkDialog
      entityType="service_contract"
      entityId="sc-1"
      row={props.row as never}
      commitments={COMMITMENTS}
      actions={actions}
    />
  );
}

function TaxDates(props: {
  dates: Parameters<typeof TaxDatesDialog>[0]["dates"];
  canRecord?: boolean;
}) {
  const actions = useOperationsActions();
  return (
    <TaxDatesDialog
      scheduleId="ts-1"
      title="IMI 2026"
      dates={props.dates}
      actions={actions}
      canRecord={props.canRecord ?? true}
    />
  );
}

beforeEach(() => {
  seed({});
  resetCalls();
  toasts.length = 0;
  for (const fn of Object.values(operationsFns)) fn.mockClear();
});

/* --------------------------------------------------------------- shell */

describe("operations shell", () => {
  const source = readFileSync("src/routes/_authenticated/operations.tsx", "utf8");

  it("exposes every Phase 8B register plus maintenance and capex as tabs", () => {
    for (const tab of [
      "reminders",
      "obligations",
      "contracts",
      "insurance",
      "utilities",
      "tax",
      "maintenance",
      "capex",
    ]) {
      expect(source).toContain(`value="${tab}"`);
    }
  });

  it("drives all five registers through the one shared panel", () => {
    expect(source.match(/<RegisterPanel/g) ?? []).toHaveLength(5);
    for (const register of [
      "obligationRegister",
      "serviceContractRegister",
      "insuranceRegister",
      "utilityRegister",
      "taxRegister",
    ]) {
      expect(source).toContain(register);
    }
  });

  it("gates the operations screen on the shared commitment capability model", () => {
    expect(source).toContain("commitmentCapabilities(workspace?.roles)");
  });
});

/* ------------------------------------------------------- shared panel */

describe("shared register panel", () => {
  it("renders a loading state before rows arrive", () => {
    renderWithProviders(<Register register={obligationRegister} rows={[]} isLoading />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders an empty state when nothing matches", () => {
    renderWithProviders(<Register register={obligationRegister} rows={[]} />);
    expect(screen.getByText("Nothing to show yet.")).toBeInTheDocument();
  });

  it("shows the register title, description and rows", () => {
    renderWithProviders(<Register register={obligationRegister} rows={[obligationRow()]} />);
    expect(screen.getByText("Obligations")).toBeInTheDocument();
    expect(screen.getByText("Annual lift inspection")).toBeInTheDocument();
    expect(screen.getByText("OBL-001")).toBeInTheDocument();
  });

  it("hides archived rows until they are asked for, then marks them", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Register
        register={obligationRegister}
        rows={[
          obligationRow(),
          obligationRow({
            obligation_id: "ob-2",
            title: "Retired duty",
            archived_at: "2026-01-01",
            status: "archived",
          }),
        ]}
      />,
    );
    expect(screen.queryByText("Retired duty")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Show archived"));
    const row = screen.getByText("Retired duty").closest("tr")!;
    expect(row).toHaveAttribute("data-archived", "true");
    // The status cell and the archived marker both say so.
    expect(within(row).getAllByText("Archived").length).toBeGreaterThanOrEqual(1);
  });

  it("offers no edit, link or archive action on an archived row", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Register
        register={obligationRegister}
        rows={[obligationRow({ archived_at: "2026-01-01", status: "archived" })]}
      />,
    );
    await user.click(screen.getByLabelText("Show archived"));
    const row = screen.getByText("Annual lift inspection").closest("tr")!;
    expect(within(row).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Commit/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Register
        register={obligationRegister}
        rows={[
          obligationRow(),
          obligationRow({ obligation_id: "ob-2", title: "Closed duty", status: "completed" }),
        ]}
      />,
    );
    await user.click(screen.getByLabelText("Filter by status"));
    await user.click(await screen.findByRole("option", { name: "Completed" }));
    await waitFor(() => expect(screen.queryByText("Annual lift inspection")).not.toBeInTheDocument());
    expect(screen.getByText("Closed duty")).toBeInTheDocument();
  });

  it("shows derived commitment figures only when a commitment is linked", () => {
    renderWithProviders(
      <Register
        register={obligationRegister}
        rows={[
          obligationRow({
            commitment_id: "com-1",
            commitment_currency: "EUR",
            committed_amount: 12000,
            invoiced_amount: 4000,
            paid_amount: 1500,
          }),
          obligationRow({ obligation_id: "ob-2", title: "Unlinked duty" }),
        ]}
      />,
    );
    const linked = screen.getByText("Annual lift inspection").closest("tr")!;
    expect(within(linked).getByText("Lift maintenance 2026")).toBeInTheDocument();
    expect(within(linked).getByText("€12,000.00")).toBeInTheDocument();
    expect(within(linked).getByText("€4,000.00")).toBeInTheDocument();
    expect(within(linked).getByText("€1,500.00")).toBeInTheDocument();

    const unlinked = screen.getByText("Unlinked duty").closest("tr")!;
    expect(within(unlinked).getByText("Not linked")).toBeInTheDocument();
    expect(within(unlinked).getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("lets a recording role create a record and sends the company with it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register register={obligationRegister} rows={[]} />);
    await user.click(screen.getByRole("button", { name: /New obligation/ }));
    await user.type(await screen.findByLabelText("Title"), "Fire certificate");
    await user.click(screen.getByRole("button", { name: "New obligation" }));

    await waitFor(() => expect(operationsFns.createObligation).toHaveBeenCalled());
    const payload = lastOperationsPayload("createObligation") as Record<string, unknown>;
    expect(payload.companyId).toBe(COMPANY);
    expect(payload.title).toBe("Fire certificate");
    expect(toasts.at(-1)).toEqual({ kind: "success", message: "Obligation created" });
  });

  it("edits a record through the update action with its own identifier", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register register={obligationRegister} rows={[obligationRow()]} />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const title = await screen.findByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Lift inspection (revised)");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(operationsFns.updateObligation).toHaveBeenCalled());
    const payload = lastOperationsPayload("updateObligation") as Record<string, unknown>;
    expect(payload.obligationId).toBe("ob-1");
    expect(payload.title).toBe("Lift inspection (revised)");
    expect(payload.status).toBe("open");
  });

  it("refuses to archive without a reason, then archives with one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register register={obligationRegister} rows={[obligationRow()]} />);
    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "An archive reason is required",
    );
    expect(operationsFns.archiveOperationalRecord).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Reason"), "Superseded by 2027 contract");
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(operationsFns.archiveOperationalRecord).toHaveBeenCalled());
    expect(lastOperationsPayload("archiveOperationalRecord")).toEqual({
      entityType: "operational_obligation",
      entityId: "ob-1",
      reason: "Superseded by 2027 contract",
    });
  });

  it("reports a failed action instead of closing the dialog", async () => {
    const user = userEvent.setup();
    operationsFns.createObligation.mockRejectedValueOnce(new Error("Insufficient rights"));
    renderWithProviders(<Register register={obligationRegister} rows={[]} />);
    await user.click(screen.getByRole("button", { name: /New obligation/ }));
    await user.type(await screen.findByLabelText("Title"), "Fire certificate");
    await user.click(screen.getByRole("button", { name: "New obligation" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/check the highlighted details/i);
    expect(toasts.at(-1)).toEqual({ kind: "error", message: "Insufficient rights" });
  });
});

/* ------------------------------------------------------- role gating */

describe("register permissions", () => {
  it("gives a viewer no way to add, edit, link or archive", () => {
    renderWithProviders(
      <Register register={obligationRegister} rows={[obligationRow()]} capabilities={viewer} />,
    );
    expect(screen.getByRole("button", { name: /New obligation/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("lets a recording role edit and link but not archive", () => {
    renderWithProviders(
      <Register register={obligationRegister} rows={[obligationRow()]} capabilities={assistant} />,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commit/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("lets a managing role archive", () => {
    renderWithProviders(
      <Register register={obligationRegister} rows={[obligationRow()]} capabilities={owner} />,
    );
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------ domain columns */

describe("domain registers", () => {
  it("shows service contracts with their notice countdown and renewal flag", () => {
    renderWithProviders(<Register register={serviceContractRegister} rows={[contractRow()]} />);
    expect(screen.getByText("Service contracts")).toBeInTheDocument();
    expect(screen.getByText("Cleaning — Block A")).toBeInTheDocument();
    expect(screen.getByText("Limpezas Norte")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("shows insurance policies with insurer and expiry", () => {
    renderWithProviders(<Register register={insuranceRegister} rows={[policyRow()]} />);
    expect(screen.getByText("Insurance policies")).toBeInTheDocument();
    expect(screen.getByText("Fidelidade")).toBeInTheDocument();
    expect(screen.getByText("15 Jan 2027")).toBeInTheDocument();
  });

  it("shows utility contracts with account and meter identifiers", () => {
    renderWithProviders(<Register register={utilityRegister} rows={[utilityRow()]} />);
    expect(screen.getByText("Utility contracts")).toBeInTheDocument();
    expect(screen.getByText("ACC-9911")).toBeInTheDocument();
    expect(screen.getByText("MTR-42")).toBeInTheDocument();
  });

  it("shows tax schedules with their instalment count and next date", () => {
    renderWithProviders(<Register register={taxRegister} rows={[taxRow()]} />);
    expect(screen.getByText("IMI 2026")).toBeInTheDocument();
    expect(screen.getByText("31 May 2026")).toBeInTheDocument();
  });

  it("renders the tax instalment dialog passed in as an extra action", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Register
        register={taxRegister}
        rows={[taxRow()]}
        extra={() => (
          <TaxDates
            dates={[
              {
                id: "d1",
                company_id: COMPANY,
                tax_schedule_id: "ts-1",
                sequence_no: 1,
                label: "First instalment",
                due_date: "2026-05-31",
                reminder_date: null,
                status: "scheduled",
                notes: null,
              },
            ]}
          />
        )}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Dates \(1\)/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("First instalment")).toBeInTheDocument();
    expect(within(dialog).getByText("31 May 2026")).toBeInTheDocument();
  });
});

/* ------------------------------------------------- tax instalment dates */

describe("tax instalment dates", () => {
  it("captures dates only — there is no amount field", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaxDates dates={[]} />);
    await user.click(screen.getByRole("button", { name: /Dates \(0\)/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("No instalment dates recorded yet.")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/amount/i)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/comes from the commitment/i)).toBeInTheDocument();
  });

  it("requires a due date and then records the instalment", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaxDates dates={[]} />);
    await user.click(screen.getByRole("button", { name: /Dates \(0\)/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add instalment date" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("A due date is required");
    expect(operationsFns.addTaxScheduleDate).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Due date"), "2026-11-30");
    await user.type(within(dialog).getByLabelText("Label"), "Second instalment");
    await user.click(within(dialog).getByRole("button", { name: "Add instalment date" }));
    await waitFor(() => expect(operationsFns.addTaxScheduleDate).toHaveBeenCalled());
    const payload = lastOperationsPayload("addTaxScheduleDate") as Record<string, unknown>;
    expect(payload).toMatchObject({
      scheduleId: "ts-1",
      dueDate: "2026-11-30",
      label: "Second instalment",
    });
    expect(Object.keys(payload)).not.toContain("amount");
  });

  it("hides the instalment form from a role that cannot record", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaxDates dates={[]} canRecord={false} />);
    await user.click(screen.getByRole("button", { name: /Dates \(0\)/ }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).queryByRole("button", { name: "Add instalment date" }),
    ).not.toBeInTheDocument();
  });
});

/* --------------------------------------------------- commitment linking */

describe("commitment integration", () => {
  it("links an existing commitment without touching the operational record", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkDialog row={contractRow()} />);
    await user.click(screen.getByRole("button", { name: /Commit/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("tab", { name: "Link existing" }));
    await user.click(within(dialog).getByLabelText("Commitment"));
    await user.click(await screen.findByRole("option", { name: "Lift maintenance 2026" }));
    await user.click(within(dialog).getByRole("button", { name: "Save link" }));

    await waitFor(() => expect(operationsFns.linkOperationalCommitment).toHaveBeenCalled());
    expect(lastOperationsPayload("linkOperationalCommitment")).toEqual({
      entityType: "service_contract",
      entityId: "sc-1",
      commitmentId: "com-1",
    });
  });

  it("never offers an archived commitment for linking", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkDialog row={contractRow()} />);
    await user.click(screen.getByRole("button", { name: /Commit/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("tab", { name: "Link existing" }));
    await user.click(within(dialog).getByLabelText("Commitment"));
    expect(await screen.findByRole("option", { name: "Lift maintenance 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Retired commitment" })).not.toBeInTheDocument();
  });

  it("unlinks by sending an empty commitment reference", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkDialog row={contractRow({ commitment_id: "com-1" })} />);
    await user.click(screen.getByRole("button", { name: "Commitment" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByLabelText("Commitment"));
    await user.click(await screen.findByRole("option", { name: "Not linked" }));
    await user.click(within(dialog).getByRole("button", { name: "Save link" }));

    await waitFor(() => expect(operationsFns.linkOperationalCommitment).toHaveBeenCalled());
    expect(
      (lastOperationsPayload("linkOperationalCommitment") as Record<string, unknown>).commitmentId,
    ).toBeNull();
  });

  it("drafts a commitment that carries the amount, leaving the record moneyless", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkDialog row={contractRow()} />);
    await user.click(screen.getByRole("button", { name: /Commit/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Authorised amount"), "9600");
    await user.click(within(dialog).getByRole("button", { name: "Create draft commitment" }));

    await waitFor(() => expect(operationsFns.createOperationalCommitment).toHaveBeenCalled());
    const payload = lastOperationsPayload("createOperationalCommitment") as Record<string, unknown>;
    expect(payload).toMatchObject({
      entityType: "service_contract",
      entityId: "sc-1",
      title: "Cleaning — Block A",
      authorisedAmount: 9600,
      currency: "EUR",
    });
    expect(operationsFns.updateServiceContract).not.toHaveBeenCalled();
  });

  it("refuses a draft without a usable amount", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkDialog row={contractRow()} />);
    await user.click(screen.getByRole("button", { name: /Commit/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Create draft commitment" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      /Enter the amount the commitment authorises/i,
    );
    expect(operationsFns.createOperationalCommitment).not.toHaveBeenCalled();
  });

  it("says plainly that a new commitment starts as a draft needing approval", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkDialog row={contractRow()} />);
    await user.click(screen.getByRole("button", { name: /Commit/ }));
    expect(await screen.findByText(/still needs approval/i)).toBeInTheDocument();
  });
});

/* --------------------------------------------------------- reminders */

describe("reminder inbox", () => {
  it("shows pending reminders first and counts the overdue ones", () => {
    renderWithProviders(
      <Reminders
        reminders={[
          reminder(),
          reminder({ reminder_id: "rem-2", is_overdue: true, title: "IMI instalment due" }),
          reminder({ reminder_id: "rem-3", status: "resolved", title: "Already handled" }),
        ]}
      />,
    );
    expect(screen.getByText("1 overdue across the operational registers.")).toBeInTheDocument();
    expect(screen.getByText("Buildings cover expires")).toBeInTheDocument();
    expect(screen.queryByText("Already handled")).not.toBeInTheDocument();
  });

  it("switches to another status filter", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Reminders
        reminders={[reminder({ reminder_id: "rem-3", status: "resolved", title: "Handled" })]}
      />,
    );
    expect(screen.getByText("Nothing needs attention right now.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Filter reminders"));
    await user.click(await screen.findByRole("option", { name: "Resolved" }));
    expect(await screen.findByText("Handled")).toBeInTheDocument();
  });

  it("acknowledges and resolves a reminder", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Reminders reminders={[reminder()]} />);
    await user.click(screen.getByRole("button", { name: "Acknowledge" }));
    await waitFor(() => expect(operationsFns.resolveOperationalReminder).toHaveBeenCalled());
    expect(lastOperationsPayload("resolveOperationalReminder")).toEqual({
      reminderId: "rem-1",
      status: "acknowledged",
    });

    await user.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() =>
      expect(
        (lastOperationsPayload("resolveOperationalReminder") as Record<string, unknown>).status,
      ).toBe("resolved"),
    );
  });

  it("regenerates reminders from the records rather than storing a second schedule", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Reminders reminders={[reminder()]} />);
    await user.click(screen.getByRole("button", { name: /Refresh/ }));
    await waitFor(() => expect(operationsFns.generateOperationalReminders).toHaveBeenCalled());
    expect(lastOperationsPayload("generateOperationalReminders")).toEqual({ companyId: COMPANY });
  });

  it("gives a viewer no way to refresh or resolve", () => {
    renderWithProviders(<Reminders reminders={[reminder()]} capabilities={viewer} />);
    expect(screen.getByRole("button", { name: /Refresh/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Acknowledge" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolve" })).not.toBeInTheDocument();
  });

  it("shows a loading and an empty state", () => {
    const { unmount } = renderWithProviders(<Reminders reminders={[]} isLoading />);
    expect(screen.getByText("Loading reminders…")).toBeInTheDocument();
    unmount();
    renderWithProviders(<Reminders reminders={[]} />);
    expect(screen.getByText("Nothing needs attention right now.")).toBeInTheDocument();
  });
});

/* --------------------------------------------------------- boundaries */

describe("financial boundaries", () => {
  const registers = [
    obligationRegister,
    serviceContractRegister,
    insuranceRegister,
    utilityRegister,
    taxRegister,
  ];

  it("covers every operational entity type exactly once", () => {
    const covered = registers.map((r) => r.entityType).sort();
    expect(covered).toEqual([...OPERATIONAL_ENTITY_TYPES].sort());
  });

  it("offers no expenditure field on any register form", () => {
    const forbidden =
      /^(committed|invoiced|paid|authorised|authorized|budget|premium|cost|price|total)/i;
    for (const register of registers) {
      for (const field of register.fields) {
        expect(
          forbidden.test(field.name),
          `${register.entityType}.${field.name} looks like an expenditure field`,
        ).toBe(false);
      }
    }
  });

  it("rejects expenditure keys at the schema boundary", () => {
    const schemas = [
      obligationCreateSchema,
      serviceContractCreateSchema,
      insurancePolicyCreateSchema,
      utilityContractCreateSchema,
      taxScheduleCreateSchema,
    ];
    for (const schema of schemas) {
      const keys = Object.keys(schema.shape);
      for (const banned of [
        "committedAmount",
        "invoicedAmount",
        "paidAmount",
        "authorisedAmount",
        "amount",
      ]) {
        expect(keys).not.toContain(banned);
      }
    }
  });

  it("treats the insurance excess as a policy term, not an expected cost", () => {
    const excess = insuranceRegister.fields.find((f) => f.name === "excessAmount");
    expect(excess?.help).toMatch(/not an expected cost/i);
  });

  it("never writes to a commitment while editing an operational record", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Register register={serviceContractRegister} rows={[contractRow({ commitment_id: "com-1" })]} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const title = await screen.findByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Cleaning — Block A (revised)");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(operationsFns.updateServiceContract).toHaveBeenCalled());
    const payload = lastOperationsPayload("updateServiceContract") as Record<string, unknown>;
    expect(payload).not.toHaveProperty("commitmentId");
    expect(payload).not.toHaveProperty("authorisedAmount");
    expect(operationsFns.createOperationalCommitment).not.toHaveBeenCalled();
    expect(operationsFns.linkOperationalCommitment).not.toHaveBeenCalled();
  });
});
