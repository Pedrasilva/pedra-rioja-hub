import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("./harness")).supabaseProxy,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/modules/bookkeeping/bookkeeping.functions", async () =>
  (await import("./harness")).serverFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./harness")).toastMock }));

import { ClassificationsPanel } from "@/modules/bookkeeping/components/classifications-panel";
import { PeriodsPanel } from "@/modules/bookkeeping/components/periods-panel";
import { BankRulesPanel } from "@/modules/bookkeeping/components/rules-panel";
import { capabilitiesFor } from "@/modules/bookkeeping/permissions";

import {
  BANK_TRANSACTIONS,
  CLASSIFICATIONS,
  COMPANY,
  COUNTERPARTIES,
  documentRow,
  lastPayload,
  opsFor,
  PERIODS,
  renderWithProviders,
  resetCalls,
  seed,
  serverFns,
  type Row,
} from "./harness";

const manager = capabilitiesFor(["manager"]);
const bookkeeper = capabilitiesFor(["bookkeeper"]);
const viewer = capabilitiesFor(["viewer"]);

const RULES: Row[] = [
  {
    id: "r-low",
    company_id: COMPANY,
    name: "Rent inflow",
    priority: 50,
    match_field: "description",
    match_type: "starts_with",
    match_value: "RENDA",
    direction: "inflow",
    classification_id: "c1",
    is_internal_transfer: false,
  },
  {
    id: "r-high",
    company_id: COMPANY,
    name: "Energy supplier",
    priority: 10,
    match_field: "description",
    match_type: "contains",
    match_value: "EDP",
    direction: "outflow",
    classification_id: "c2",
    is_internal_transfer: false,
  },
  {
    id: "r-other",
    company_id: "22222222-2222-4222-8222-222222222222",
    name: "Other company rule",
    priority: 1,
    match_field: "description",
    match_type: "contains",
    match_value: "X",
    direction: null,
    classification_id: null,
    is_internal_transfer: true,
  },
];

const TOTALS: Row[] = [
  {
    id: "t1",
    period_id: "p1",
    bucket: "purchases",
    net_amount: 1000,
    vat_amount: 230,
    gross_amount: 1230,
  },
  { id: "t2", period_id: "p1", bucket: "sales", net_amount: 2000, vat_amount: 460, gross_amount: 2460 },
  {
    id: "t3",
    period_id: "p2",
    bucket: "purchases",
    net_amount: 10,
    vat_amount: 2.3,
    gross_amount: 12.3,
  },
];

beforeEach(() => {
  resetCalls();
  seed({
    counterparties: COUNTERPARTIES,
    financial_classifications: CLASSIFICATIONS,
    financial_periods: PERIODS,
    financial_period_totals: TOTALS,
    financial_documents: [
      documentRow({ id: "d1", status: "posted", period_id: "p1" }),
      documentRow({ id: "d2", status: "draft", period_id: "p1" }),
      documentRow({ id: "d3", status: "posted", period_id: "p2" }),
    ],
    bank_classification_rules: RULES,
    bank_transactions: BANK_TRANSACTIONS,
    properties: [],
    capex_projects: [],
  });
});

describe("ClassificationsPanel", () => {
  it("renders the chart as a hierarchy, indenting children under parents", async () => {
    renderWithProviders(<ClassificationsPanel companyId={COMPANY} capabilities={manager} />);
    await screen.findByText("Lift servicing");
    const rows = screen.getAllByRole("row");
    const codes = rows.slice(1).map((r) => r.firstElementChild?.textContent);
    expect(codes).toEqual(["6", "6.1", "6.1.1"]);

    const child = screen.getByText("Maintenance").closest("td")!;
    const grandchild = screen.getByText("Lift servicing").closest("td")!;
    expect(child.style.paddingLeft).toBe("30px");
    expect(grandchild.style.paddingLeft).toBe("48px");
  });

  it("marks shared defaults and company entries distinctly", async () => {
    renderWithProviders(<ClassificationsPanel companyId={COMPANY} capabilities={manager} />);
    expect((await screen.findAllByText("Shared")).length).toBe(2);
    expect(screen.getAllByText("Company").length).toBe(1);
  });

  it("only offers creation to a role that manages classifications", async () => {
    const { unmount } = renderWithProviders(
      <ClassificationsPanel companyId={COMPANY} capabilities={bookkeeper} />,
    );
    await screen.findByText("Maintenance");
    expect(screen.queryByRole("button", { name: /new classification/i })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<ClassificationsPanel companyId={COMPANY} capabilities={manager} />);
    expect(
      await screen.findByRole("button", { name: /new classification/i }),
    ).toBeInTheDocument();
  });

  it("creates a company-scoped classification under a parent", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClassificationsPanel companyId={COMPANY} capabilities={manager} />);
    await user.click(await screen.findByRole("button", { name: /new classification/i }));
    await user.type(screen.getByLabelText("Code"), "6.2");
    await user.type(screen.getByLabelText("Name (EN)"), "Cleaning");
    await user.click(screen.getByLabelText("Parent classification"));
    await user.click(await screen.findByRole("option", { name: /6\.1 · Maintenance/ }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(serverFns.createClassification).toHaveBeenCalled());
    expect(lastPayload("createClassification")).toMatchObject({
      companyId: COMPANY,
      code: "6.2",
      nameEn: "Cleaning",
      parentId: "c2",
      level: 2,
    });
  });

  it("blocks creation without a code and a name, and never deletes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClassificationsPanel companyId={COMPANY} capabilities={manager} />);
    await user.click(await screen.findByRole("button", { name: /new classification/i }));
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});

describe("BankRulesPanel", () => {
  it("loads this company's rules ordered by priority", async () => {
    renderWithProviders(<BankRulesPanel companyId={COMPANY} capabilities={manager} />);
    await screen.findByText("Energy supplier");
    const names = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.children[1]?.textContent);
    expect(names).toEqual(["Energy supplier", "Rent inflow"]);
    expect(screen.queryByText("Other company rule")).not.toBeInTheDocument();

    const ops = opsFor("bank_classification_rules");
    expect(ops).toContainEqual(["eq", "company_id", COMPANY]);
    expect(ops).toContainEqual(["order", "priority"]);
  });

  it("hides rule authoring from roles without manage rights", async () => {
    renderWithProviders(<BankRulesPanel companyId={COMPANY} capabilities={bookkeeper} />);
    await screen.findByText("Energy supplier");
    expect(screen.queryByRole("button", { name: /new rule/i })).not.toBeInTheDocument();
  });

  it("dry-runs a draft rule against recent transactions without applying anything", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BankRulesPanel companyId={COMPANY} capabilities={manager} />);
    await user.click(await screen.findByRole("button", { name: /new rule/i }));

    expect(screen.getByText(/Dry run — 0 of the last 50 transactions/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Value"), "EDP");

    await waitFor(() =>
      expect(screen.getByText(/Dry run — 1 of the last 50 transactions/)).toBeInTheDocument(),
    );
    expect(screen.getByText("TRF EDP ENERGIA FEV")).toBeInTheDocument();
    // never leaks another company's transactions into the preview
    expect(screen.queryByText("TRF EDP OUTRA EMPRESA")).not.toBeInTheDocument();
    // a dry run is read-only: nothing was saved and no rpc was applied
    expect(serverFns.upsertBankClassificationRule).not.toHaveBeenCalled();
    expect(opsFor("rpc:suggest_bank_classification")).toHaveLength(0);
  });

  it("respects the direction filter in the preview", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BankRulesPanel companyId={COMPANY} capabilities={manager} />);
    await user.click(await screen.findByRole("button", { name: /new rule/i }));
    await user.type(screen.getByLabelText("Value"), "R");
    await waitFor(() =>
      expect(screen.getByText(/Dry run — 2 of the last 50 transactions/)).toBeInTheDocument(),
    );

    await user.click(screen.getByLabelText("Rule direction"));
    await user.click(await screen.findByRole("option", { name: "Inflow" }));
    await waitFor(() =>
      expect(screen.getByText(/Dry run — 1 of the last 50 transactions/)).toBeInTheDocument(),
    );
    expect(screen.getByText("RENDA FEVEREIRO")).toBeInTheDocument();
  });

  it("saves a rule with its priority and match definition", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BankRulesPanel companyId={COMPANY} capabilities={manager} />);
    await user.click(await screen.findByRole("button", { name: /new rule/i }));
    expect(screen.getByRole("button", { name: /save rule/i })).toBeDisabled();

    await user.type(screen.getByLabelText("Name"), "Energy");
    await user.clear(screen.getByLabelText("Priority"));
    await user.type(screen.getByLabelText("Priority"), "20");
    await user.type(screen.getByLabelText("Value"), "EDP");
    await user.click(screen.getByRole("button", { name: /save rule/i }));

    await waitFor(() => expect(serverFns.upsertBankClassificationRule).toHaveBeenCalled());
    expect(lastPayload("upsertBankClassificationRule")).toMatchObject({
      companyId: COMPANY,
      name: "Energy",
      priority: 20,
      matchField: "description",
      matchType: "contains",
      matchValue: "EDP",
    });
  });
});

describe("PeriodsPanel", () => {
  it("lists company periods and shows totals for the first one", async () => {
    renderWithProviders(<PeriodsPanel companyId={COMPANY} capabilities={manager} />);
    expect(await screen.findByText("2026-Q1")).toBeInTheDocument();
    expect(screen.getByText("2025-Q4")).toBeInTheDocument();
    expect(await screen.findByText("Purchases")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(opsFor("financial_period_totals")).toContainEqual(["eq", "period_id", "p1"]);
  });

  it("counts the documents inside the selected period, drafts included", async () => {
    renderWithProviders(<PeriodsPanel companyId={COMPANY} capabilities={manager} />);
    await screen.findByText("Purchases");
    const documents = screen.getByText("Documents").parentElement!;
    await waitFor(() => expect(documents.textContent).toContain("2"));
    const drafts = screen.getByText("Drafts").parentElement!;
    expect(drafts.textContent).toContain("1");
  });

  it("switches period and refetches its totals", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PeriodsPanel companyId={COMPANY} capabilities={manager} />);
    await user.click(await screen.findByText("2025-Q4"));
    await waitFor(() =>
      expect(opsFor("financial_period_totals")).toContainEqual(["eq", "period_id", "p2"]),
    );
  });

  it("recomputes totals from posted documents through the server function", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PeriodsPanel companyId={COMPANY} capabilities={manager} />);
    await user.click(await screen.findByRole("button", { name: /recompute/i }));
    await waitFor(() => expect(serverFns.recomputePeriodTotals).toHaveBeenCalled());
    expect(lastPayload("recomputePeriodTotals")).toEqual({ periodId: "p1" });
  });

  it("hides period creation and recomputation from a viewer", async () => {
    renderWithProviders(<PeriodsPanel companyId={COMPANY} capabilities={viewer} />);
    await screen.findByText("2026-Q1");
    expect(screen.queryByRole("button", { name: /new period/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /recompute/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("creates a period with its code and range", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PeriodsPanel companyId={COMPANY} capabilities={manager} />);
    await user.click(await screen.findByRole("button", { name: /new period/i }));
    expect(screen.getByRole("button", { name: /create period/i })).toBeDisabled();

    await user.type(screen.getByLabelText("Code"), "2026-Q2");
    await user.type(screen.getByLabelText("Start"), "2026-04-01");
    await user.type(screen.getByLabelText("End"), "2026-06-30");
    await user.click(screen.getByRole("button", { name: /create period/i }));

    await waitFor(() => expect(serverFns.createFinancialPeriod).toHaveBeenCalled());
    expect(lastPayload("createFinancialPeriod")).toMatchObject({
      companyId: COMPANY,
      code: "2026-Q2",
      periodType: "quarter",
      periodStart: "2026-04-01",
      periodEnd: "2026-06-30",
    });
  });
});
