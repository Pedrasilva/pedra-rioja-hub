/**
 * Phase 8F.1 — payment execution UI tests.
 *
 * Same boundary discipline as the other suites: the only ways out are the
 * Supabase read client and the payment server functions, both mocked. These
 * tests cover the register, the run workspace lifecycle, the instruction
 * picker, permission gating and the bank export adapters.
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
vi.mock("@/modules/bookkeeping/bookkeeping.functions", async () =>
  (await import("./mocks")).serverFnModule(),
);
vi.mock("@/modules/payments/payments.functions", async () =>
  (await import("./mocks")).paymentFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./mocks")).toastMock }));

import { paymentCapabilities } from "@/modules/payments/capabilities";
import { generateExport, contentHash } from "@/modules/payments/export-adapters";
import { usePaymentActions } from "@/modules/payments/server";
import { PaymentRunList } from "@/modules/payments/components/payment-run-list";
import { PaymentRunDetail } from "@/modules/payments/components/payment-run-detail";
import { PaymentRunDialog } from "@/modules/payments/components/payment-run-dialog";
import type {
  PaymentBatchSummary,
  PaymentInstructionDetail,
  PaymentRunSummary,
} from "@/modules/payments/queries";

import {
  callsFor,
  lastPaymentPayload,
  opsFor,
  paymentFns,
  renderWithProviders,
  resetCalls,
  seed,
} from "./harness";

const COMPANY = "c1";
const manager = paymentCapabilities(["manager"]);
const bookkeeper = paymentCapabilities(["bookkeeper"]);
const viewer = paymentCapabilities(["viewer"]);

function run(overrides: Partial<PaymentRunSummary> = {}): PaymentRunSummary {
  return {
    payment_run_id: "run-1",
    company_id: COMPANY,
    reference: "PR-20260305-ab12cd",
    title: "March suppliers",
    description: null,
    status: "draft",
    approval_status: "not_requested",
    approval_request_id: null,
    scheduled_execution_date: "2026-03-05",
    actual_execution_date: null,
    archived_at: null,
    cancellation_reason: null,
    completion_notes: null,
    created_at: "2026-03-01T09:00:00Z",
    created_by: null,
    approved_by: null,
    exported_at: null,
    executed_at: null,
    completed_at: null,
    batch_count: 1,
    instruction_count: 2,
    executed_count: 0,
    failed_count: 0,
    outstanding_total: 1250,
    payable_total: 1250,
    ...overrides,
  } as PaymentRunSummary;
}

function instruction(
  overrides: Partial<PaymentInstructionDetail> = {},
): PaymentInstructionDetail {
  return {
    instruction_id: "i1",
    company_id: COMPANY,
    payment_run_id: "run-1",
    batch_id: "b1",
    document_id: "d1",
    document_number: "INV-001",
    counterparty_id: "cp1",
    counterparty_name: "Rioja Manutenção Lda",
    currency: "EUR",
    outstanding_amount: 750,
    payable_amount: 750,
    due_date: "2026-03-10",
    status: "pending",
    payment_method: "transfer",
    payment_reference: null,
    failure_reason: null,
    bank_account_id: null,
    executed_at: null,
    ...overrides,
  } as PaymentInstructionDetail;
}

const BATCHES: PaymentBatchSummary[] = [
  {
    batch_id: "b1",
    company_id: COMPANY,
    payment_run_id: "run-1",
    counterparty_id: "cp1",
    counterparty_name: "Rioja Manutenção Lda",
    currency: "EUR",
    bank_account_id: null,
    execution_order: 1,
    export_status: "pending",
    exported_at: null,
    export_format: null,
    export_reference: null,
    instruction_count: 2,
    outstanding_total: 1250,
    payable_total: 1250,
  } as PaymentBatchSummary,
];

function Harness({
  runRow,
  instructions,
  capabilities = manager,
}: {
  runRow: PaymentRunSummary;
  instructions: PaymentInstructionDetail[];
  capabilities?: ReturnType<typeof paymentCapabilities>;
}) {
  const actions = usePaymentActions();
  return (
    <PaymentRunDetail
      companyId={COMPANY}
      run={runRow}
      batches={BATCHES}
      instructions={instructions}
      exports={[]}
      actions={actions}
      capabilities={capabilities}
    />
  );
}

beforeEach(() => {
  resetCalls();
  for (const fn of Object.values(paymentFns)) fn.mockClear();
  seed({
    v_payment_run_summary: [],
    v_payment_batch_summary: [],
    v_payment_instruction_detail: [],
    payment_run_exports: [],
    counterparties: [{ id: "cp1", company_id: COMPANY, name: "Rioja Manutenção Lda" }],
    financial_documents: [
      {
        id: "d2",
        company_id: COMPANY,
        document_number: "INV-002",
        counterparty_id: "cp1",
        direction: "inbound",
        status: "posted",
        payment_state: "unpaid",
        currency: "EUR",
        outstanding_amount: 500,
        payable_amount: 500,
        due_date: "2026-03-12",
        issue_date: "2026-02-12",
      },
    ],
  });
});

/* ------------------------------------------------------------- register */

describe("payment run register", () => {
  it("lists runs, links to the workspace and totals what is in view", async () => {
    renderWithProviders(
      <PaymentRunList
        rows={[run(), run({ payment_run_id: "run-2", reference: "PR-2", title: "Utilities", status: "executed", outstanding_total: 400 })]}
      />,
    );
    expect(screen.getByText("PR-20260305-ab12cd").closest("a")).toHaveAttribute(
      "href",
      "/payments/run-1",
    );
    expect(screen.getByText("Utilities")).toBeInTheDocument();
    expect(screen.getByText("€1,650.00")).toBeInTheDocument();
  });

  it("filters by search text", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PaymentRunList rows={[run(), run({ payment_run_id: "run-2", reference: "PR-2", title: "Utilities" })]} />,
    );
    await user.type(screen.getByLabelText("Search payment runs"), "utilit");
    expect(screen.queryByText("March suppliers")).not.toBeInTheDocument();
    expect(screen.getByText("Utilities")).toBeInTheDocument();
  });

  it("invites the first run when there is nothing to show", () => {
    renderWithProviders(<PaymentRunList rows={[]} />);
    expect(screen.getByText(/No payment runs yet/i)).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------- creation */

describe("creating a run", () => {
  it("sends title, description and scheduled date to the server function", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const actions = usePaymentActions();
      return <PaymentRunDialog companyId={COMPANY} actions={actions} disabled={false} />;
    }
    renderWithProviders(<Wrapper />);
    await user.click(screen.getByRole("button", { name: /new payment run/i }));
    await user.type(screen.getByLabelText(/title/i), "March suppliers");
    await user.click(screen.getByRole("button", { name: /^create/i }));

    expect(paymentFns.createPaymentRun).toHaveBeenCalled();
    expect(lastPaymentPayload("createPaymentRun")).toMatchObject({
      companyId: COMPANY,
      title: "March suppliers",
    });
  });
});

/* -------------------------------------------------------------- lifecycle */

describe("the run workspace", () => {
  it("says out loud that the run owns no accounting value", () => {
    renderWithProviders(<Harness runRow={run()} instructions={[instruction()]} />);
    expect(screen.getByText(/posts no accounting entry/i)).toBeInTheDocument();
  });

  it("requests authority to pay from a draft with instructions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness runRow={run()} instructions={[instruction()]} />);
    await user.click(screen.getByRole("button", { name: /request authority to pay/i }));
    expect(lastPaymentPayload("requestPaymentRunApproval")).toMatchObject({ runId: "run-1" });
  });

  it("cannot request approval with nothing to pay", () => {
    renderWithProviders(<Harness runRow={run({ instruction_count: 0 })} instructions={[]} />);
    expect(screen.getByRole("button", { name: /request authority to pay/i })).toBeDisabled();
  });

  it("offers the bank file only once the run is approved", () => {
    const { unmount } = renderWithProviders(
      <Harness runRow={run()} instructions={[instruction()]} />,
    );
    expect(screen.queryByRole("button", { name: /generate bank file/i })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(
      <Harness runRow={run({ status: "approved" })} instructions={[instruction()]} />,
    );
    expect(screen.getByRole("button", { name: /generate bank file/i })).toBeInTheDocument();
  });

  it("exports through an adapter and reports the file name and hash", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness runRow={run({ status: "approved" })} instructions={[instruction()]} />,
    );
    await user.click(screen.getByRole("button", { name: /generate bank file/i }));
    const payload = lastPaymentPayload("exportPaymentRun") as {
      runId: string;
      format: string;
      fileName: string;
      contentHash: string;
    };
    expect(payload.runId).toBe("run-1");
    expect(payload.format).toBe("sepa_xml");
    expect(payload.fileName).toMatch(/\.xml$/);
    expect(payload.contentHash).toHaveLength(8);
  });

  it("marks an exported run executed and then completes it", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(
      <Harness
        runRow={run({ status: "exported" })}
        instructions={[instruction({ status: "exported" })]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /mark as executed/i }));
    expect(lastPaymentPayload("executePaymentRun")).toMatchObject({ runId: "run-1" });
    unmount();

    renderWithProviders(
      <Harness
        runRow={run({ status: "executed" })}
        instructions={[instruction({ status: "executed" })]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /complete run/i }));
    expect(lastPaymentPayload("completePaymentRun")).toMatchObject({ runId: "run-1" });
  });

  it("records a returned payment on an executed run", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness
        runRow={run({ status: "executed" })}
        instructions={[instruction({ status: "executed" })]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /mark failed/i }));
    expect(lastPaymentPayload("failPaymentInstruction")).toMatchObject({
      instructionId: "i1",
      reason: "Returned by the bank",
    });
  });

  it("requires a cancellation reason before cancelling", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness runRow={run()} instructions={[instruction()]} />);
    const button = screen.getByRole("button", { name: /cancel run/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/cancellation reason/i), "Duplicated run");
    await user.click(button);
    expect(lastPaymentPayload("cancelPaymentRun")).toMatchObject({
      runId: "run-1",
      reason: "Duplicated run",
    });
  });

  it("shows only invoice-derived amounts in the instruction table", () => {
    renderWithProviders(
      <Harness runRow={run()} instructions={[instruction(), instruction({ instruction_id: "i2", document_number: "INV-002", outstanding_amount: 500 })]} />,
    );
    const table = screen.getByText("INV-001").closest("table")!;
    expect(within(table).getByText("€750.00")).toBeInTheDocument();
    expect(within(table).getByText("€500.00")).toBeInTheDocument();
  });

  it("keeps a cancelled instruction visible but no longer removable", () => {
    renderWithProviders(
      <Harness runRow={run()} instructions={[instruction({ status: "cancelled" })]} />,
    );
    expect(screen.queryByRole("button", { name: /^remove$/i })).not.toBeInTheDocument();
  });

  it("removes an invoice from a draft run", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness runRow={run()} instructions={[instruction()]} />);
    await user.click(screen.getByRole("button", { name: /^remove$/i }));
    expect(lastPaymentPayload("removePaymentInstruction")).toMatchObject({ instructionId: "i1" });
  });
});

/* ------------------------------------------------------------ picker */

describe("adding payable invoices", () => {
  it("offers only posted payables not already in the run, scoped to the company", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness runRow={run()} instructions={[instruction()]} />);
    await user.click(screen.getByRole("button", { name: /add invoices/i }));

    expect(await screen.findByText("INV-002")).toBeInTheDocument();
    const ops = opsFor("financial_documents");
    expect(ops.some(([op, col, val]) => op === "eq" && col === "company_id" && val === COMPANY)).toBe(
      true,
    );
    expect(ops.some(([op, col, val]) => op === "eq" && col === "status" && val === "posted")).toBe(
      true,
    );
    expect(
      ops.some(([op, col, val]) => op === "eq" && col === "direction" && val === "inbound"),
    ).toBe(true);
    expect(callsFor("financial_documents").length).toBeGreaterThan(0);
  });

  it("adds the selected invoice to the run", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness runRow={run()} instructions={[instruction()]} />);
    await user.click(screen.getByRole("button", { name: /add invoices/i }));
    await screen.findByText("INV-002");
    const row = screen.getByText("INV-002").closest("tr")!;
    await user.click(within(row).getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /add to run/i }));
    expect(lastPaymentPayload("addPaymentInstruction")).toMatchObject({
      runId: "run-1",
      documentId: "d2",
    });
  });
});

/* -------------------------------------------------------- permissions */

describe("permission gating", () => {
  it("maps roles to what they may do", () => {
    expect(manager).toMatchObject({ canView: true, canRecord: true, canManage: true, canApprove: true });
    expect(bookkeeper).toMatchObject({ canRecord: true, canManage: false });
    expect(viewer).toMatchObject({ canView: true, canRecord: false, canManage: false, canApprove: false });
  });

  it("gives a viewer read-only access to the workspace", () => {
    renderWithProviders(
      <Harness runRow={run()} instructions={[instruction()]} capabilities={viewer} />,
    );
    expect(screen.getByRole("button", { name: /add invoices/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /request authority to pay/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel run/i })).toBeDisabled();
  });

  it("stops a bookkeeper from executing a run", () => {
    renderWithProviders(
      <Harness
        runRow={run({ status: "exported" })}
        instructions={[instruction({ status: "exported" })]}
        capabilities={bookkeeper}
      />,
    );
    expect(screen.getByRole("button", { name: /mark as executed/i })).toBeDisabled();
  });
});

/* ---------------------------------------------------------- adapters */

describe("bank export adapters", () => {
  const payload = {
    runReference: "PR-20260305-ab12cd",
    runTitle: "March suppliers",
    companyName: "Pedra Rioja",
    executionDate: "2026-03-05",
    instructions: [
      {
        instructionId: "i1",
        documentNumber: "INV-001",
        counterpartyName: "Rioja & Filhos",
        iban: "PT50000201231234567890154",
        currency: "EUR",
        amount: 750,
        dueDate: "2026-03-10",
        reference: null,
        method: "transfer",
      },
      {
        instructionId: "i2",
        documentNumber: "INV-002",
        counterpartyName: "Casa, Velha",
        iban: null,
        currency: "EUR",
        amount: 500.005,
        dueDate: null,
        reference: "REF-2",
        method: "transfer",
      },
    ],
  };

  it("renders a SEPA credit transfer with a control sum and escaped names", () => {
    const file = generateExport("sepa_xml", payload);
    expect(file.mimeType).toBe("application/xml");
    expect(file.content).toContain("pain.001.001.03");
    expect(file.content).toContain("<NbOfTxs>2</NbOfTxs>");
    expect(file.content).toContain("<CtrlSum>1250.01</CtrlSum>");
    expect(file.content).toContain("Rioja &amp; Filhos");
    expect(file.instructionCount).toBe(2);
  });

  it("renders CSV with quoted values", () => {
    const file = generateExport("csv", payload);
    expect(file.content.split("\n")[0]).toContain("execution_date");
    expect(file.content).toContain('"Casa, Velha"');
    expect(file.fileName).toMatch(/\.csv$/);
  });

  it("renders a JSON envelope for a provider API", () => {
    const file = generateExport("api", payload);
    const parsed = JSON.parse(file.content) as { instructions: unknown[] };
    expect(parsed.instructions).toHaveLength(2);
    expect(file.mimeType).toBe("application/json");
  });

  it("is deterministic and hashes a changed file differently", () => {
    const a = generateExport("csv", payload);
    const b = generateExport("csv", payload);
    expect(a.contentHash).toBe(b.contentHash);
    const changed = generateExport("csv", {
      ...payload,
      instructions: [{ ...payload.instructions[0], amount: 751 }],
    });
    expect(changed.contentHash).not.toBe(a.contentHash);
    expect(contentHash("abc")).toHaveLength(8);
  });

  it("refuses to render an empty run", () => {
    expect(() => generateExport("csv", { ...payload, instructions: [] })).toThrow(
      /nothing to export/i,
    );
  });
});
