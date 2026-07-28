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

import { DocumentEditorDialog } from "@/modules/bookkeeping/components/document-editor";
import { DocumentsPanel } from "@/modules/bookkeeping/components/documents-panel";
import { capabilitiesFor } from "@/modules/bookkeeping/permissions";

import {
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

const draft = documentRow();
const posted = documentRow({
  id: "doc-posted",
  status: "posted",
  document_number: "2026/2",
  payment_state: "partially_paid",
  paid_amount: 500,
  outstanding_amount: 730,
});
const cancelled = documentRow({
  id: "doc-cancelled",
  status: "cancelled",
  document_number: "2026/3",
  outstanding_amount: 0,
});
const otherCompanyDoc = documentRow({
  id: "doc-other",
  company_id: "22222222-2222-4222-8222-222222222222",
  document_number: "9999/9",
});
const saleDoc = documentRow({
  id: "doc-sale",
  direction: "outbound",
  document_number: "FT 2026/7",
  counterparty_id: "cp-client",
  counterparty_name: "Inquilino Norte SA",
});

function seedDocs(extra: Record<string, Row[]> = {}) {
  seed({
    counterparties: COUNTERPARTIES,
    financial_classifications: CLASSIFICATIONS,
    financial_periods: PERIODS,
    financial_documents: [draft, posted, cancelled, otherCompanyDoc, saleDoc],
    financial_document_lines: [],
    financial_payments: [],
    properties: [],
    capex_projects: [],
    bank_transactions: [],
    ...extra,
  });
}

beforeEach(() => {
  resetCalls();
  seedDocs();
});

describe("DocumentsPanel — company scoping, direction and lifecycle", () => {
  it("lists only this company's purchases and scopes the query", async () => {
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={manager} />,
    );
    expect(await screen.findByText("A 2026/1")).toBeInTheDocument();
    expect(screen.queryByText("A 9999/9")).not.toBeInTheDocument();
    expect(screen.queryByText("A FT 2026/7")).not.toBeInTheDocument();

    const ops = opsFor("financial_documents");
    expect(ops).toContainEqual(["eq", "company_id", COMPANY]);
    expect(ops).toContainEqual(["eq", "direction", "inbound"]);
  });

  it("switches to sales for the outbound direction", async () => {
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="outbound" capabilities={manager} />,
    );
    expect(await screen.findByText("A FT 2026/7")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Client" })).toBeInTheDocument();
    expect(opsFor("financial_documents")).toContainEqual(["eq", "direction", "outbound"]);
  });

  it("excludes cancelled documents from the header totals", async () => {
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={manager} />,
    );
    // draft 1230 + posted 1230, cancelled excluded
    expect(await screen.findByText(/2,460\.00/)).toBeInTheDocument();
  });

  it("offers Post only on drafts and only to manage roles", async () => {
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={manager} />,
    );
    const draftRow = (await screen.findByText("A 2026/1")).closest("tr")!;
    expect(within(draftRow).getByRole("button", { name: "Post" })).toBeInTheDocument();
    const postedRow = screen.getByText("A 2026/2").closest("tr")!;
    expect(within(postedRow).queryByRole("button", { name: "Post" })).not.toBeInTheDocument();
  });

  it("hides post and cancel from a recording-only role", async () => {
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={bookkeeper} />,
    );
    await screen.findByText("A 2026/1");
    expect(screen.queryByRole("button", { name: "Post" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Cancel document/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new purchase/i })).toBeInTheDocument();
  });

  it("hides every write affordance from a viewer", async () => {
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={viewer} />,
    );
    await screen.findByText("A 2026/1");
    expect(screen.queryByRole("button", { name: /new purchase/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("posts a draft through the server function", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={manager} />,
    );
    const draftRow = (await screen.findByText("A 2026/1")).closest("tr")!;
    await user.click(within(draftRow).getByRole("button", { name: "Post" }));
    await waitFor(() => expect(serverFns.postFinancialDocument).toHaveBeenCalled());
    expect(lastPayload("postFinancialDocument")).toEqual({ id: "doc-draft" });
  });

  it("requires a cancellation reason of at least three characters", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={manager} />,
    );
    const draftRow = (await screen.findByText("A 2026/1")).closest("tr")!;
    await user.click(within(draftRow).getByRole("button", { name: "Cancel document 2026/1" }));

    const confirm = await screen.findByRole("button", { name: "Cancel document" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Reason"), "ab");
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Reason"), "c duplicate");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(serverFns.cancelFinancialDocument).toHaveBeenCalled());
    expect(lastPayload("cancelFinancialDocument")).toEqual({
      id: "doc-draft",
      reason: "abc duplicate",
    });
  });

  it("never offers a cancel action on an already cancelled document", async () => {
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={manager} />,
    );
    const row = (await screen.findByText("A 2026/3")).closest("tr")!;
    expect(within(row).queryByRole("button", { name: "Cancel document 2026/3" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /^Settle/i })).not.toBeInTheDocument();
  });

  it("only offers settlement on posted documents", async () => {
    renderWithProviders(
      <DocumentsPanel companyId={COMPANY} direction="inbound" capabilities={manager} />,
    );
    const postedRow = (await screen.findByText("A 2026/2")).closest("tr")!;
    expect(within(postedRow).getByRole("button", { name: "Settle document 2026/2" })).toBeInTheDocument();
    const draftRow = screen.getByText("A 2026/1").closest("tr")!;
    expect(within(draftRow).queryByRole("button", { name: "Settle document 2026/1" })).not.toBeInTheDocument();
  });
});

describe("DocumentEditorDialog — live calculations and fiscal metadata", () => {
  const openEditor = (props: Partial<Parameters<typeof DocumentEditorDialog>[0]> = {}) =>
    renderWithProviders(
      <DocumentEditorDialog
        open
        onOpenChange={() => {}}
        companyId={COMPANY}
        direction="inbound"
        documentId={null}
        capabilities={manager}
        {...props}
      />,
    );

  it("recalculates lines and header totals as the user types", async () => {
    const user = userEvent.setup();
    openEditor();
    const price = screen.getByLabelText("Unit price");
    await user.clear(price);
    await user.type(price, "1000");

    await waitFor(() =>
      expect(screen.getByTestId("total-net")).toHaveTextContent("1,000.00"),
    );
    expect(screen.getByTestId("total-vat")).toHaveTextContent("230.00");
    expect(screen.getByTestId("total-gross")).toHaveTextContent("1,230.00");
    expect(screen.getByTestId("total-payable")).toHaveTextContent("1,230.00");
  });

  it("applies withholding to the payable total only", async () => {
    const user = userEvent.setup();
    openEditor();
    await user.clear(screen.getByLabelText("Unit price"));
    await user.type(screen.getByLabelText("Unit price"), "1000");
    await user.clear(screen.getByLabelText("Withholding %"));
    await user.type(screen.getByLabelText("Withholding %"), "25");

    await waitFor(() =>
      expect(screen.getByTestId("total-withholding")).toHaveTextContent("250.00"),
    );
    expect(screen.getByTestId("total-gross")).toHaveTextContent("1,230.00");
    expect(screen.getByTestId("total-payable")).toHaveTextContent("980.00");
  });

  it("switches VAT via the PT presets and demands an exemption reason at 0%", async () => {
    const user = userEvent.setup();
    openEditor();
    await user.clear(screen.getByLabelText("Unit price"));
    await user.type(screen.getByLabelText("Unit price"), "100");

    await user.click(screen.getByLabelText("VAT preset line 1"));
    await user.click(await screen.findByRole("option", { name: "Reduzida 6%" }));
    await waitFor(() => expect(screen.getByTestId("total-vat")).toHaveTextContent("6.00"));

    await user.click(screen.getByLabelText("VAT preset line 1"));
    await user.click(await screen.findByRole("option", { name: "Isenta 0%" }));
    expect(
      await screen.findByText("A VAT exemption reason is required on every exempt line."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /create draft/i }));
    expect(serverFns.createFinancialDocument).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("VAT exemption reason"), "Artigo 9.º CIVA");
    await user.click(screen.getByRole("button", { name: /create draft/i }));
    await waitFor(() => expect(serverFns.createFinancialDocument).toHaveBeenCalled());
    const payload = lastPayload("createFinancialDocument") as {
      lines: { description: string; vatRate: number }[];
    };
    expect(payload.lines[0]!.vatRate).toBe(0);
    expect(payload.lines[0]!.description).toContain("VAT exempt: Artigo 9.º CIVA");
  });

  it("adds and removes lines, renumbering them", async () => {
    const user = userEvent.setup();
    openEditor();
    await user.click(screen.getByRole("button", { name: /add line/i }));
    expect(screen.getAllByLabelText(/^Description$/)).toHaveLength(2);

    await user.clear(screen.getAllByLabelText("Unit price")[1]!);
    await user.type(screen.getAllByLabelText("Unit price")[1]!, "50");
    await user.click(screen.getByRole("button", { name: "Remove line 1" }));
    expect(screen.getAllByLabelText(/^Description$/)).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /create draft/i }));
    await waitFor(() => expect(serverFns.createFinancialDocument).toHaveBeenCalled());
    const payload = lastPayload("createFinancialDocument") as {
      lines: { lineNo: number; unitPrice: number }[];
    };
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0]).toMatchObject({ lineNo: 1, unitPrice: 50 });
  });

  it("sends the full fiscal header with the draft", async () => {
    const user = userEvent.setup();
    openEditor();
    await user.type(screen.getByLabelText("Series"), "A");
    await user.type(screen.getByLabelText("Document number"), "2026/42");
    await user.type(screen.getByLabelText("ATCUD"), "JFT7C4KZ-42");
    await user.click(screen.getByLabelText("Counterparty"));
    await user.click(await screen.findByRole("option", { name: "Rioja Manutenção Lda" }));
    await user.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => expect(serverFns.createFinancialDocument).toHaveBeenCalled());
    expect(lastPayload("createFinancialDocument")).toMatchObject({
      companyId: COMPANY,
      direction: "inbound",
      series: "A",
      documentNumber: "2026/42",
      atcud: "JFT7C4KZ-42",
      counterpartyId: "cp-supplier",
      currency: "EUR",
    });
  });

  it("only offers suppliers on a purchase and clients on a sale", async () => {
    const user = userEvent.setup();
    const { unmount } = openEditor();
    await user.click(screen.getByLabelText("Counterparty"));
    expect(await screen.findByRole("option", { name: "Rioja Manutenção Lda" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Duarte & Filhos" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Inquilino Norte SA" })).not.toBeInTheDocument();
    unmount();

    resetCalls();
    seedDocs();
    openEditor({ direction: "outbound" });
    await user.click(screen.getByLabelText("Counterparty"));
    expect(await screen.findByRole("option", { name: "Inquilino Norte SA" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Rioja Manutenção Lda" })).not.toBeInTheDocument();
  });

  it("surfaces a drift warning when the database total disagrees with the preview", async () => {
    const user = userEvent.setup();
    serverFns.createFinancialDocument.mockResolvedValueOnce({ id: "doc-draft" });
    // seeded doc-draft has gross 1230 while the preview will show 123.00
    openEditor();
    await user.clear(screen.getByLabelText("Unit price"));
    await user.type(screen.getByLabelText("Unit price"), "100");
    await user.click(screen.getByRole("button", { name: /create draft/i }));

    expect(await screen.findByText("Totals mismatch")).toBeInTheDocument();
    expect(screen.getByText(/database calculated .*1,230\.00.* gross/)).toBeInTheDocument();
    expect(screen.getByText(/The database value is authoritative/)).toBeInTheDocument();
  });

  it("closes without warning when the database agrees with the preview", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    serverFns.createFinancialDocument.mockResolvedValueOnce({ id: "doc-draft" });
    openEditor({ onOpenChange });
    await user.clear(screen.getByLabelText("Unit price"));
    await user.type(screen.getByLabelText("Unit price"), "1000");
    await user.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(screen.queryByText("Totals mismatch")).not.toBeInTheDocument();
  });

  it("edits an existing draft through updateFinancialDocument", async () => {
    const user = userEvent.setup();
    seedDocs({
      financial_document_lines: [
        {
          id: "l1",
          document_id: "doc-draft",
          line_no: 1,
          description: "Lift servicing",
          quantity: 1,
          unit_price: 1000,
          discount_pct: 0,
          vat_rate: 23,
          vat_code: "NOR",
          classification_id: "c2",
          property_id: null,
          project_id: null,
        },
      ],
    });
    openEditor({ documentId: "doc-draft" });
    await waitFor(() =>
      expect((screen.getByLabelText("Document number") as HTMLInputElement).value).toBe("2026/1"),
    );
    await user.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(serverFns.updateFinancialDocument).toHaveBeenCalled());
    expect(lastPayload("updateFinancialDocument")).toMatchObject({ id: "doc-draft" });
  });

  it("renders a posted document read-only", async () => {
    seedDocs();
    renderWithProviders(
      <DocumentEditorDialog
        open
        onOpenChange={() => {}}
        companyId={COMPANY}
        direction="inbound"
        documentId="doc-posted"
        capabilities={manager}
      />,
    );
    expect(await screen.findByText("Read-only")).toBeInTheDocument();
    expect(screen.getByLabelText("Document number")).toBeDisabled();
    expect(screen.getByLabelText("Issue date")).toBeDisabled();
    expect(screen.getByLabelText("ATCUD")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add line/i })).not.toBeInTheDocument();
  });

  it("renders a cancelled document read-only too", async () => {
    renderWithProviders(
      <DocumentEditorDialog
        open
        onOpenChange={() => {}}
        companyId={COMPANY}
        direction="inbound"
        documentId="doc-cancelled"
        capabilities={manager}
      />,
    );
    expect(await screen.findByText("Read-only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
  });

  it("disables saving for a role without draft rights", () => {
    renderWithProviders(
      <DocumentEditorDialog
        open
        onOpenChange={() => {}}
        companyId={COMPANY}
        direction="inbound"
        documentId={null}
        capabilities={viewer}
      />,
    );
    expect(screen.getByRole("button", { name: /create draft/i })).toBeDisabled();
  });
});
