/**
 * Phase 7 — financial-document evidence (attachments).
 *
 * The panel is rendered through the real Pedra Rioja host wherever possible;
 * upload and failure paths use explicit adapter doubles, because the Pedra
 * Rioja host is link-only (Drive owns the files).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("./mocks")).supabaseProxy,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/modules/bookkeeping/bookkeeping.functions", async () =>
  (await import("./mocks")).serverFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./mocks")).toastMock }));

import { AttachmentsPanel } from "@/packages/bookkeeping-core/components/attachments-panel";
import { DocumentEditorDialog } from "@/packages/bookkeeping-core/components/document-editor";
import { createDocumentsAdapter } from "@/modules/bookkeeping/host/adapters";
import { capabilitiesFor } from "@/modules/bookkeeping/host/roles";
import type { DocumentsAdapter, LinkedFile } from "@/packages/bookkeeping-core/adapters";

import {
  CLASSIFICATIONS,
  COMPANY,
  COUNTERPARTIES,
  documentRow,
  lastPayload,
  opsFor,
  OTHER_COMPANY,
  PERIODS,
  renderWithProviders,
  resetCalls,
  seed,
  serverFns,
  type Row,
} from "./harness";

const DOCS: Row[] = [
  {
    id: "file-1",
    company_id: COMPANY,
    title: "Invoice 2026-1 scan.pdf",
    status: "active",
    drive_web_view_link: "https://drive.test/file-1",
    deleted_at: null,
    created_at: "2026-02-02",
  },
  {
    id: "file-2",
    company_id: COMPANY,
    title: "Payment proof.pdf",
    status: "active",
    drive_web_view_link: "https://drive.test/file-2",
    deleted_at: null,
    created_at: "2026-02-03",
  },
  {
    id: "file-missing",
    company_id: COMPANY,
    title: "Lost original.pdf",
    status: "missing",
    drive_web_view_link: null,
    deleted_at: null,
    created_at: "2026-02-04",
  },
  {
    id: "file-other",
    company_id: OTHER_COMPANY,
    title: "Other company contract.pdf",
    status: "active",
    drive_web_view_link: "https://drive.test/other",
    deleted_at: null,
    created_at: "2026-02-05",
  },
];

const LINKS: Row[] = [
  {
    id: "l1",
    company_id: COMPANY,
    document_id: "file-1",
    entity_type: "financial_document",
    entity_id: "doc-draft",
    relation: "primary",
  },
  {
    id: "l2",
    company_id: OTHER_COMPANY,
    document_id: "file-other",
    entity_type: "financial_document",
    entity_id: "doc-other",
    relation: "primary",
  },
];

const attachActions = {
  attach: (d: Record<string, unknown>) => serverFns.attachDocumentToSource({ data: d }),
  detach: (d: Record<string, unknown>) => serverFns.detachDocumentFromSource({ data: d }),
};

function hostDocuments(canRecord = true) {
  return { documents: createDocumentsAdapter(COMPANY, canRecord, attachActions) };
}

/** Adapter double for paths the Drive-backed host does not expose. */
function fakeDocuments(over: Partial<DocumentsAdapter> = {}): DocumentsAdapter {
  return {
    capabilities: { canLink: true, canUpload: true },
    useLinkedFiles: () => ({ files: [] as LinkedFile[], isLoading: false }),
    useAvailableFiles: () => ({ files: [], isLoading: false }),
    linkExisting: () => {},
    unlink: () => {},
    upload: () => {},
    ...over,
  };
}

beforeEach(() => {
  seed({
    documents: DOCS,
    document_links: LINKS,
    financial_documents: [documentRow()],
    financial_document_lines: [],
    financial_payments: [],
    counterparties: COUNTERPARTIES,
    financial_classifications: CLASSIFICATIONS,
    financial_periods: PERIODS,
  });
  resetCalls();
  for (const fn of Object.values(serverFns)) fn.mockClear();
});

describe("AttachmentsPanel", () => {
  it("lists the evidence linked to this document only", async () => {
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      { host: hostDocuments() },
    );
    expect(await screen.findByText("Invoice 2026-1 scan.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Other company contract.pdf")).not.toBeInTheDocument();
  });

  it("scopes the link lookup to the company and the document", async () => {
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      { host: hostDocuments() },
    );
    await screen.findByText("Invoice 2026-1 scan.pdf");
    const ops = opsFor("document_links");
    expect(ops).toContainEqual(["eq", "company_id", COMPANY]);
    expect(ops).toContainEqual(["eq", "entity_type", "financial_document"]);
    expect(ops).toContainEqual(["eq", "entity_id", "doc-draft"]);
  });

  it("shows an empty state when nothing is attached", async () => {
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-none" />,
      { host: hostDocuments() },
    );
    expect(await screen.findByTestId("attachments-empty")).toBeInTheDocument();
  });

  it("asks for the document to be saved before evidence can be attached", () => {
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId={undefined} />,
      { host: hostDocuments() },
    );
    expect(screen.getByTestId("attachments-no-source")).toBeInTheDocument();
  });

  it("reports a loading state while the host resolves the files", () => {
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      { host: { documents: fakeDocuments({ useLinkedFiles: () => ({ files: [], isLoading: true }) }) } },
    );
    expect(screen.getByTestId("attachments-loading")).toBeInTheDocument();
  });

  it("marks a file the host cannot resolve instead of hiding it", () => {
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      {
        host: {
          documents: fakeDocuments({
            useLinkedFiles: () => ({
              files: [{ id: "f", title: "Lost original.pdf", kind: "supporting", url: null }],
              isLoading: false,
            }),
          }),
        },
      },
    );
    expect(screen.getByTestId("attachment-unavailable-f")).toBeInTheDocument();
  });

  it("falls back to a read-only notice when the host offers no storage", () => {
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      {
        host: {
          documents: {
            capabilities: { canLink: false, canUpload: false },
            useLinkedFiles: () => ({ files: [], isLoading: false }),
          },
        },
      },
    );
    expect(screen.getByTestId("attachments-readonly")).toBeInTheDocument();
    expect(screen.queryByTestId("attachments-picker")).not.toBeInTheDocument();
  });

  it("links an existing company file through the host server function", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      { host: hostDocuments() },
    );
    const row = await screen.findByText("Payment proof.pdf");
    await user.click(row.parentElement!.querySelector("button")!);
    await waitFor(() => expect(serverFns.attachDocumentToSource).toHaveBeenCalled());
    expect(lastPayload("attachDocumentToSource")).toMatchObject({
      companyId: COMPANY,
      sourceType: "financial_document",
      sourceId: "doc-draft",
      documentId: "file-2",
      relation: "supporting",
    });
  });

  it("detaches evidence without touching the document itself", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      { host: hostDocuments() },
    );
    await user.click(await screen.findByLabelText("Remove Invoice 2026-1 scan.pdf"));
    await waitFor(() => expect(serverFns.detachDocumentFromSource).toHaveBeenCalled());
    expect(serverFns.postFinancialDocument).not.toHaveBeenCalled();
    expect(serverFns.updateFinancialDocument).not.toHaveBeenCalled();
  });

  it("uploads through the host adapter and reports progress", async () => {
    const user = userEvent.setup();
    let resolve = () => {};
    const upload = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      { host: { documents: fakeDocuments({ upload }) } },
    );
    await user.click(screen.getByRole("button", { name: /upload file/i }));
    expect(await screen.findByRole("button", { name: /uploading/i })).toBeInTheDocument();
    resolve();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /upload file/i })).toBeInTheDocument(),
    );
    expect(upload).toHaveBeenCalledWith({
      sourceType: "financial_document",
      sourceId: "doc-draft",
      kind: "supporting",
    });
  });

  it("surfaces an upload failure instead of failing silently", async () => {
    const user = userEvent.setup();
    const upload = vi.fn(async () => {
      throw new Error("Drive rejected the file");
    });
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      { host: { documents: fakeDocuments({ upload }) } },
    );
    await user.click(screen.getByRole("button", { name: /upload file/i }));
    expect(await screen.findByTestId("attachments-error")).toHaveTextContent(
      "Drive rejected the file",
    );
  });

  it("gives a viewer no attach or remove affordance", async () => {
    renderWithProviders(
      <AttachmentsPanel sourceType="financial_document" sourceId="doc-draft" />,
      { host: { ...hostDocuments(false), capabilities: capabilitiesFor(["viewer"]) } },
    );
    await screen.findByText("Invoice 2026-1 scan.pdf");
    expect(screen.queryByLabelText("Remove Invoice 2026-1 scan.pdf")).not.toBeInTheDocument();
    expect(screen.queryByTestId("attachments-picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("attachments-readonly")).toBeInTheDocument();
  });
});

describe("Document editor attachments section", () => {
  const openEditor = (documentId: string | null, host = hostDocuments()) =>
    renderWithProviders(
      <DocumentEditorDialog
        open
        onOpenChange={() => {}}
        companyId={COMPANY}
        direction="inbound"
        documentId={documentId}
        capabilities={capabilitiesFor(["manager"])}
      />,
      { host },
    );

  it("renders the attachments section inside the editor", async () => {
    openEditor("doc-draft");
    expect(await screen.findByRole("heading", { name: "Attachments" })).toBeInTheDocument();
    expect(await screen.findByText("Invoice 2026-1 scan.pdf")).toBeInTheDocument();
  });

  it("keeps evidence editable on a posted document while amounts stay read-only", async () => {
    seed({
      documents: DOCS,
      document_links: LINKS,
      financial_documents: [documentRow({ status: "posted" })],
      financial_document_lines: [],
      financial_payments: [],
      counterparties: COUNTERPARTIES,
      financial_classifications: CLASSIFICATIONS,
      financial_periods: PERIODS,
    });
    openEditor("doc-draft");
    expect(await screen.findByText("Read-only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
    expect(await screen.findByTestId("attachments-picker")).toBeInTheDocument();
  });

  it("defers attachments until a new document has been created", async () => {
    openEditor(null);
    expect(await screen.findByTestId("attachments-no-source")).toBeInTheDocument();
  });
});
