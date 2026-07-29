import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("./mocks")).supabaseProxy,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/modules/bookkeeping/bookkeeping.functions", async () =>
  (await import("./mocks")).serverFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./mocks")).toastMock }));

import { SettlementPanel } from "@/packages/bookkeeping-core/components/settlement-panel";
import { capabilitiesFor } from "@/modules/bookkeeping/host/roles";

import {
  BANK_TRANSACTIONS,
  COMPANY,
  COUNTERPARTIES,
  db,
  documentRow,
  lastPayload,
  renderWithProviders,
  resetCalls,
  seed,
  serverFns,
  type Row,
} from "./harness";

const manager = capabilitiesFor(["manager"]);
const bookkeeper = capabilitiesFor(["bookkeeper"]);
const viewer = capabilitiesFor(["viewer"]);
const approver = capabilitiesFor(["approver"]);

const postedDoc = documentRow({
  id: "doc-posted",
  status: "posted",
  payment_state: "partially_paid",
  paid_amount: 500,
  outstanding_amount: 730,
});

const payments: Row[] = [
  {
    id: "pay-1",
    company_id: COMPANY,
    document_id: "doc-posted",
    payment_date: "2026-03-01",
    amount: 300,
    method: "transfer",
    status: "settled",
    bank_transaction_id: "tx-1",
    reversal_reason: null,
  },
  {
    id: "pay-2",
    company_id: COMPANY,
    document_id: "doc-posted",
    payment_date: "2026-03-10",
    amount: 200,
    method: "direct debit",
    status: "settled",
    bank_transaction_id: null,
    reversal_reason: null,
  },
  {
    id: "pay-3",
    company_id: COMPANY,
    document_id: "doc-posted",
    payment_date: "2026-03-12",
    amount: 100,
    method: "transfer",
    status: "reversed",
    bank_transaction_id: null,
    reversal_reason: "Duplicated transfer",
  },
];

function seedSettlement(doc: Row = postedDoc, pays: Row[] = payments) {
  seed({
    counterparties: COUNTERPARTIES,
    financial_documents: [doc],
    financial_document_lines: [],
    financial_payments: pays,
    bank_transactions: BANK_TRANSACTIONS,
  });
}

beforeEach(() => {
  resetCalls();
  seedSettlement();
});

const render = (capabilities = bookkeeper, documentId = "doc-posted") =>
  renderWithProviders(
    <SettlementPanel companyId={COMPANY} documentId={documentId} capabilities={capabilities} />,
  );

describe("SettlementPanel", () => {
  it("shows the source-owned totals and the derived payment state", async () => {
    render();
    expect(await screen.findByText("Document total")).toBeInTheDocument();
    expect(screen.getByText("Partially Paid")).toBeInTheDocument();
    const figures = screen.getByText("Outstanding").parentElement!;
    expect(within(figures).getByText(/730\.00/)).toBeInTheDocument();
  });

  it("lists multiple settlements including a reversed one with its reason", async () => {
    render();
    expect(await screen.findByText("Payment history")).toBeInTheDocument();
    expect(screen.getByText(/300\.00/)).toBeInTheDocument();
    expect(screen.getByText(/200\.00/)).toBeInTheDocument();
    expect(screen.getByText("Reversed")).toBeInTheDocument();
    expect(screen.getByText("Duplicated transfer")).toBeInTheDocument();
    expect(screen.getByText("Bank linked")).toBeInTheDocument();
  });

  it("records a partial payment through settle_financial_document only", async () => {
    const user = userEvent.setup();
    render();
    await user.type(await screen.findByLabelText("Amount"), "230");
    await user.type(screen.getByLabelText("Method"), "transfer");
    await user.click(screen.getByRole("button", { name: /record payment/i }));

    await waitFor(() => expect(serverFns.settleFinancialDocument).toHaveBeenCalledTimes(1));
    expect(lastPayload("settleFinancialDocument")).toMatchObject({
      documentId: "doc-posted",
      amount: 230,
      method: "transfer",
      bankTransactionId: null,
    });

    // the panel never writes source-owned amounts itself
    expect(serverFns.updateFinancialDocument).not.toHaveBeenCalled();
    expect(db.financial_documents[0]).toMatchObject({
      net_amount: 1000,
      vat_amount: 230,
      gross_amount: 1230,
      payable_amount: 1230,
    });
  });

  it("can link a settlement to a bank transaction", async () => {
    const user = userEvent.setup();
    render();
    await user.type(await screen.findByLabelText("Amount"), "120.5");
    await user.click(screen.getByLabelText("Bank transaction"));
    await user.click(await screen.findByRole("option", { name: /TRF EDP ENERGIA FEV/ }));
    await user.click(screen.getByRole("button", { name: /record payment/i }));

    await waitFor(() => expect(serverFns.settleFinancialDocument).toHaveBeenCalled());
    expect(lastPayload("settleFinancialDocument")).toMatchObject({ bankTransactionId: "tx-1" });
  });

  it("keeps the record button inert without an amount", async () => {
    render();
    expect(await screen.findByRole("button", { name: /record payment/i })).toBeDisabled();
  });

  it("shows an overpayment as a negative outstanding and an overpaid state", async () => {
    seedSettlement(
      documentRow({
        id: "doc-posted",
        status: "posted",
        payment_state: "overpaid",
        paid_amount: 1300,
        outstanding_amount: -70,
      }),
      [payments[0]!],
    );
    render();
    expect(await screen.findByText("Overpaid")).toBeInTheDocument();
    const outstanding = screen.getByText("Outstanding").parentElement!;
    expect(outstanding.textContent).toMatch(/70\.00/);
    expect(outstanding.textContent).toMatch(/-|−/);
  });

  it("requires a reversal reason of at least three characters", async () => {
    const user = userEvent.setup();
    render(manager);
    const reasonInput = await screen.findByLabelText("Reversal reason for payment pay-1");
    const reverseButton = within(reasonInput.closest("div")!).getByRole("button", {
      name: /reverse/i,
    });
    expect(reverseButton).toBeDisabled();
    await user.type(reasonInput, "ab");
    expect(reverseButton).toBeDisabled();
    await user.type(reasonInput, "c — bank returned it");
    expect(reverseButton).toBeEnabled();
    await user.click(reverseButton);

    await waitFor(() => expect(serverFns.reverseFinancialPayment).toHaveBeenCalled());
    expect(lastPayload("reverseFinancialPayment")).toEqual({
      paymentId: "pay-1",
      reason: "abc — bank returned it",
    });
  });

  it("never offers a reversal on an already reversed payment", async () => {
    render(manager);
    await screen.findByText("Payment history");
    expect(
      screen.queryByLabelText("Reversal reason for payment pay-3"),
    ).not.toBeInTheDocument();
  });

  it("hides the payment form from roles that cannot record", async () => {
    render(viewer);
    await screen.findByText("Payment history");
    expect(screen.queryByText("Record a payment")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reversal reason for payment pay-1")).not.toBeInTheDocument();
  });

  it("lets a recording role settle but keeps reversal manage-level", async () => {
    const { unmount } = render(bookkeeper);
    expect(await screen.findByText("Record a payment")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reversal reason for payment pay-1")).not.toBeInTheDocument();
    unmount();

    resetCalls();
    seedSettlement();
    render(manager);
    expect(await screen.findByLabelText("Reversal reason for payment pay-1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("gives an approver read-only settlement history", async () => {
    render(approver);
    await screen.findByText("Payment history");
    expect(screen.queryByText("Record a payment")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reversal reason for payment pay-1")).not.toBeInTheDocument();
  });

  it("hides the payment form on a document that is not posted", async () => {
    seedSettlement(documentRow({ id: "doc-posted", status: "draft" }), []);
    render(manager);
    await screen.findByText("Payment history");
    expect(screen.queryByText("Record a payment")).not.toBeInTheDocument();
    expect(screen.getByText("No payments recorded yet.")).toBeInTheDocument();
  });
});
