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

import {
  CounterpartiesPanel,
  CounterpartyDialog,
} from "@/packages/bookkeeping-core/components/counterparties-panel";
import { capabilitiesFor } from "@/modules/bookkeeping/host/roles";

import {
  CLASSIFICATIONS,
  COMPANY,
  COUNTERPARTIES,
  lastPayload,
  opsFor,
  renderWithProviders,
  resetCalls,
  seed,
  serverFns,
} from "./harness";

const bookkeeper = capabilitiesFor(["bookkeeper"]);
const viewer = capabilitiesFor(["viewer"]);

beforeEach(() => {
  resetCalls();
  seed({ counterparties: COUNTERPARTIES, financial_classifications: CLASSIFICATIONS });
});

describe("CounterpartiesPanel — company scoping and roles", () => {
  it("loads only the active counterparties of the current company", async () => {
    renderWithProviders(<CounterpartiesPanel companyId={COMPANY} capabilities={bookkeeper} />);

    expect(await screen.findByText("Rioja Manutenção Lda")).toBeInTheDocument();
    expect(screen.getByText("Inquilino Norte SA")).toBeInTheDocument();
    expect(screen.getByText("Duarte & Filhos")).toBeInTheDocument();
    // archived and other-company rows are filtered out by the query
    expect(screen.queryByText("Fornecedor Antigo")).not.toBeInTheDocument();
    expect(screen.queryByText("Outra Empresa Lda")).not.toBeInTheDocument();

    const ops = opsFor("counterparties");
    expect(ops).toContainEqual(["eq", "company_id", COMPANY]);
    expect(ops).toContainEqual(["eq", "status", "active"]);
  });

  it("renders supplier, client and both roles distinctly", async () => {
    renderWithProviders(<CounterpartiesPanel companyId={COMPANY} capabilities={bookkeeper} />);
    const supplier = (await screen.findByText("Rioja Manutenção Lda")).closest("tr")!;
    expect(within(supplier).getByText("Supplier")).toBeInTheDocument();
    const both = screen.getByText("Duarte & Filhos").closest("tr")!;
    expect(within(both).getByText("Both")).toBeInTheDocument();
  });

  it("hides create, edit and archive affordances from a viewer", async () => {
    renderWithProviders(<CounterpartiesPanel companyId={COMPANY} capabilities={viewer} />);
    await screen.findByText("Rioja Manutenção Lda");
    expect(screen.queryByRole("button", { name: /new counterparty/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit /i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Archive /i })).not.toBeInTheDocument();
    expect(screen.getAllByText("View only").length).toBeGreaterThan(0);
  });

  it("archives instead of deleting, and offers restore for archived rows", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CounterpartiesPanel companyId={COMPANY} capabilities={bookkeeper} />);
    await user.click(await screen.findByRole("button", { name: "Archive Rioja Manutenção Lda" }));

    await waitFor(() => expect(serverFns.archiveCounterparty).toHaveBeenCalled());
    expect(lastPayload("archiveCounterparty")).toEqual({ id: "cp-supplier", archived: true });

    // no destructive delete exists anywhere in the panel
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("shows archived records under the archived filter with a restore action", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CounterpartiesPanel companyId={COMPANY} capabilities={bookkeeper} />);
    await screen.findByText("Rioja Manutenção Lda");
    expect(screen.queryByText("Fornecedor Antigo")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Filter by status"));
    await user.click(await screen.findByRole("option", { name: "Archived" }));

    expect(await screen.findByText("Fornecedor Antigo")).toBeInTheDocument();
    expect(opsFor("counterparties")).toContainEqual(["eq", "status", "archived"]);
    expect(
      screen.getByRole("button", { name: "Restore Fornecedor Antigo" }),
    ).toBeInTheDocument();
  });

  it("passes the search term through to the query", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CounterpartiesPanel companyId={COMPANY} capabilities={bookkeeper} />);
    await screen.findByText("Rioja Manutenção Lda");
    await user.type(screen.getByLabelText("Search counterparties"), "Rioja");
    await waitFor(() =>
      expect(
        opsFor("counterparties").some(
          (op) => op[0] === "or" && String(op[1]).includes("Rioja"),
        ),
      ).toBe(true),
    );
  });
});

describe("CounterpartyDialog — creation, NIF validation and editing", () => {
  const openDialog = (initial?: Parameters<typeof CounterpartyDialog>[0]["initial"], caps = bookkeeper) =>
    renderWithProviders(
      <CounterpartyDialog
        open
        onOpenChange={() => {}}
        companyId={COMPANY}
        initial={initial}
        capabilities={caps}
      />,
    );

  it("blocks submission until a name is present", async () => {
    const user = userEvent.setup();
    openDialog();
    await user.click(screen.getByRole("button", { name: /create counterparty/i }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(serverFns.createCounterparty).not.toHaveBeenCalled();
  });

  it("rejects an invalid NIF checksum and accepts a valid one", async () => {
    const user = userEvent.setup();
    openDialog();
    await user.type(screen.getByLabelText("Name"), "Nova Empresa Lda");
    await user.type(screen.getByLabelText("NIF"), "501442601");
    expect(await screen.findByText("Not a valid Portuguese NIF checksum")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /create counterparty/i }));
    expect(serverFns.createCounterparty).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("NIF"));
    await user.type(screen.getByLabelText("NIF"), "501442600");
    await waitFor(() =>
      expect(screen.queryByText("Not a valid Portuguese NIF checksum")).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /create counterparty/i }));
    await waitFor(() => expect(serverFns.createCounterparty).toHaveBeenCalledTimes(1));
    expect(lastPayload("createCounterparty")).toMatchObject({
      companyId: COMPANY,
      name: "Nova Empresa Lda",
      nif: "501442600",
      counterpartyType: "supplier",
      countryCode: "PT",
      currency: "EUR",
    });
  });

  it("edits an existing counterparty through updateCounterparty, keeping its id", async () => {
    const user = userEvent.setup();
    openDialog(COUNTERPARTIES[0] as never);
    const name = screen.getByLabelText("Name") as HTMLInputElement;
    expect(name.value).toBe("Rioja Manutenção Lda");
    await user.clear(name);
    await user.type(name, "Rioja Manutenção SA");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(serverFns.updateCounterparty).toHaveBeenCalled());
    expect(lastPayload("updateCounterparty")).toMatchObject({
      id: "cp-supplier",
      name: "Rioja Manutenção SA",
    });
    expect(serverFns.createCounterparty).not.toHaveBeenCalled();
  });

  it("disables the submit button for a role that cannot record", () => {
    openDialog(undefined, viewer);
    expect(screen.getByRole("button", { name: /create counterparty/i })).toBeDisabled();
  });
});
