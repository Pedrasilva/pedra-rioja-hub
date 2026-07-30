/**
 * Phase 8E — leasing UI tests.
 *
 * Same boundary discipline as the other suites: the only ways out are the
 * Supabase read client and the lease server functions, both mocked. These
 * tests exercise the components the new /leases, /tenants, /rent-roll and
 * /occupancy routes render, including deep-link targets and permission gating.
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
vi.mock("@/modules/leases/leases.functions", async () => (await import("./mocks")).leaseFnModule());
vi.mock("sonner", async () => ({ toast: (await import("./mocks")).toastMock }));

import { leaseCapabilities } from "@/modules/leases/capabilities";
import { useLeaseActions } from "@/modules/leases/server";
import { OccupancyBoard } from "@/modules/occupancy/components/occupancy-board";
import { RentRollTable } from "@/modules/rentroll/components/rent-roll-table";
import { TenantDialog } from "@/modules/tenants/components/tenant-dialog";
import { TenantDetail } from "@/modules/tenants/components/tenant-detail";
import { TenantList } from "@/modules/tenants/components/tenant-list";

import { lastLeasePayload, leaseFns, renderWithProviders, resetCalls, seed } from "./harness";

const COMPANY = "c1";
const manager = leaseCapabilities(["manager"]);
const viewer = leaseCapabilities(["viewer"]);

const TENANTS = [
  {
    id: "t1",
    company_id: COMPANY,
    name: "Adega Norte",
    code: "TEN-001",
    legal_name: "Adega Norte Lda",
    trading_name: "Adega Norte",
    tax_number: "500111222",
    registration_number: null,
    email: "geral@adeganorte.pt",
    phone: null,
    website: null,
    address: null,
    sector: "Wine",
    tenant_type: "company",
    status: "active",
    archived_at: null,
  },
  {
    id: "t2",
    company_id: COMPANY,
    name: "Casa Velha",
    code: "TEN-002",
    legal_name: null,
    trading_name: null,
    tax_number: null,
    registration_number: null,
    email: null,
    phone: null,
    website: null,
    address: null,
    sector: "Retail",
    tenant_type: "individual",
    status: "active",
    archived_at: "2026-01-04",
  },
];

const RENT_ROLL = [
  {
    rent_roll_id: "rr1",
    company_id: COMPANY,
    property_id: "p1",
    property_name: "Quinta do Douro",
    unit_id: "u1",
    unit_code: "A-01",
    tenant_id: "t1",
    tenant_name: "Adega Norte",
    lease_id: "l1",
    lease_code: "L-001",
    lease_status: "active",
    occupancy_status: "occupied",
    rent: 2000,
    annual_rent: 24000,
    service_charge: 100,
    currency: "EUR",
    start_date: "2025-01-01",
    end_date: "2030-01-01",
    next_review_date: "2027-01-01",
    next_break_date: null,
    area_m2: 120,
  },
  {
    rent_roll_id: "rr2",
    company_id: COMPANY,
    property_id: "p2",
    property_name: "Armazém Rioja",
    unit_id: "u2",
    unit_code: "B-02",
    tenant_id: "t2",
    tenant_name: "Casa Velha",
    lease_id: "l2",
    lease_code: "L-002",
    lease_status: "active",
    occupancy_status: "occupied",
    rent: 500,
    annual_rent: 6000,
    service_charge: null,
    currency: "EUR",
    start_date: "2024-01-01",
    end_date: "2026-09-01",
    next_review_date: null,
    next_break_date: null,
    area_m2: 40,
  },
];

const OCCUPANCY = [
  {
    company_id: COMPANY,
    property_id: "p1",
    property_name: "Quinta do Douro",
    unit_id: "u1",
    unit_code: "A-01",
    occupancy_status: "occupied",
    tenant_id: "t1",
    tenant_name: "Adega Norte",
    lease_id: "l1",
    lease_code: "L-001",
    area_m2: 120,
    start_date: "2025-01-01",
    end_date: "2030-01-01",
  },
  {
    company_id: COMPANY,
    property_id: "p2",
    property_name: "Armazém Rioja",
    unit_id: "u2",
    unit_code: "B-02",
    occupancy_status: "vacant",
    tenant_id: null,
    tenant_name: null,
    lease_id: null,
    lease_code: null,
    area_m2: 40,
    start_date: null,
    end_date: null,
  },
];

function seedAll() {
  seed({
    tenants: [...TENANTS],
    tenant_contacts: [
      {
        id: "tc1",
        tenant_id: "t1",
        name: "Marta Silva",
        role: "Estate manager",
        email: "marta@adeganorte.pt",
        phone: "910000000",
        is_primary: true,
      },
    ],
    v_lease_summary: [
      {
        lease_id: "l1",
        company_id: COMPANY,
        code: "L-001",
        title: "Adega Norte — A-01",
        tenant_id: "t1",
        primary_tenant_id: "t1",
        tenant_name: "Adega Norte",
        property_id: "p1",
        property_name: "Quinta do Douro",
        status: "active",
        start_date: "2025-01-01",
        end_date: "2030-01-01",
        total_periodic_charge: 2100,
        currency: "EUR",
      },
    ],
    v_rent_roll: [...RENT_ROLL],
    v_unit_occupancy: [...OCCUPANCY],
    vacancy_periods: [
      {
        id: "v1",
        company_id: COMPANY,
        unit_id: "u2",
        start_date: "2025-06-01",
        end_date: null,
        reason: "refurbishment",
        target_rent: 600,
        currency: "EUR",
      },
    ],
    occupancy_history: [],
  });
  resetCalls();
}

beforeEach(seedAll);

describe("tenant register", () => {
  it("lists tenants and deep-links each one to its workspace", async () => {
    renderWithProviders(<TenantList rows={TENANTS as never} />);
    const link = screen.getByRole("link", { name: "Adega Norte" });
    expect(link).toHaveAttribute("href", "/tenants/t1");
    expect(screen.getByText("500111222")).toBeInTheDocument();
  });

  it("marks archived tenants rather than hiding or deleting them", () => {
    renderWithProviders(<TenantList rows={TENANTS as never} />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("filters the register by the search term", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TenantList rows={TENANTS as never} />);
    await user.type(screen.getByLabelText("Search tenants"), "casa");
    expect(screen.queryByRole("link", { name: "Adega Norte" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Casa Velha" })).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TenantList rows={TENANTS as never} />);
    await user.type(screen.getByLabelText("Search tenants"), "zzz");
    expect(screen.getByText(/no tenants match/i)).toBeInTheDocument();
  });
});

describe("tenant creation", () => {
  function Harness({ onCreated }: { onCreated: (id: string) => void }) {
    const actions = useLeaseActions();
    return <TenantDialog companyId={COMPANY} actions={actions} onCreated={onCreated} />;
  }

  it("sends the register fields and routes to the new tenant", async () => {
    leaseFns.upsertTenant.mockResolvedValue({ id: "t9" });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Harness onCreated={onCreated} />);
    await user.click(screen.getByRole("button", { name: /new tenant/i }));
    await user.type(screen.getByLabelText("Name"), "Nova Adega");
    await user.type(screen.getByLabelText("Tax number"), "501999888");
    await user.click(screen.getByRole("button", { name: /create tenant/i }));
    await waitFor(() => expect(leaseFns.upsertTenant).toHaveBeenCalled());
    expect(lastLeasePayload("upsertTenant")).toMatchObject({
      companyId: COMPANY,
      name: "Nova Adega",
      taxNumber: "501999888",
    });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("t9"));
  });

  it("refuses to submit without a name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness onCreated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /new tenant/i }));
    expect(screen.getByRole("button", { name: /create tenant/i })).toBeDisabled();
  });
});

describe("tenant workspace", () => {
  function Detail({ capabilities }: { capabilities: ReturnType<typeof leaseCapabilities> }) {
    const actions = useLeaseActions();
    return (
      <TenantDetail tenant={TENANTS[0] as never} actions={actions} capabilities={capabilities} />
    );
  }

  it("shows contacts, leases and occupied units with working deep links", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Detail capabilities={manager} />);
    await user.click(screen.getByRole("tab", { name: /contacts/i }));
    expect(await screen.findByText(/Marta Silva/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^leases$/i }));
    const leaseLink = await screen.findByRole("link", { name: "L-001" });
    expect(leaseLink).toHaveAttribute("href", "/leases/l1");

    await user.click(screen.getByRole("tab", { name: /properties & units/i }));
    const propertyLink = await screen.findByRole("link", { name: "Quinta do Douro" });
    expect(propertyLink).toHaveAttribute("href", "/properties/p1");
  });

  it("hides write affordances from a viewer", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Detail capabilities={viewer} />);
    expect(screen.getByRole("button", { name: /archive tenant/i })).toBeDisabled();
    await user.click(screen.getByRole("tab", { name: /contacts/i }));
    expect(screen.queryByRole("button", { name: /add contact/i })).not.toBeInTheDocument();
  });
});

describe("rent roll", () => {
  it("renders one row per let unit with figures taken straight from the view", () => {
    renderWithProviders(<RentRollTable rows={RENT_ROLL as never} />);
    const row = screen.getByText("A-01").closest("tr")!;
    expect(within(row).getByText(/2[ .,]000/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Adega Norte" })).toHaveAttribute(
      "href",
      "/tenants/t1",
    );
  });

  it("filters by tenant", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RentRollTable rows={RENT_ROLL as never} />);
    await user.click(screen.getByLabelText("Filter by tenant"));
    await user.click(await screen.findByRole("option", { name: "Casa Velha" }));
    await waitFor(() => expect(screen.queryByText("A-01")).not.toBeInTheDocument());
    expect(screen.getByText("B-02")).toBeInTheDocument();
  });

  it("shows an empty state when the portfolio has no let units", () => {
    renderWithProviders(<RentRollTable rows={[]} />);
    expect(screen.getByText(/no let units yet/i)).toBeInTheDocument();
  });
});

describe("occupancy board", () => {
  it("groups units by property and shows both occupied and vacant states", async () => {
    renderWithProviders(<OccupancyBoard companyId={COMPANY} />);
    expect(await screen.findByText("Quinta do Douro")).toBeInTheDocument();
    expect(await screen.findByText("Armazém Rioja")).toBeInTheDocument();
    expect((await screen.findAllByText(/occupied/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/vacant/i)).length).toBeGreaterThan(0);
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OccupancyBoard companyId={COMPANY} />);
    await screen.findByText("A-01");
    await user.click(screen.getByLabelText("Filter by status"));
    await user.click(await screen.findByRole("option", { name: /^Vacant$/i }));
    await waitFor(() => expect(screen.queryByText("A-01")).not.toBeInTheDocument());
    expect(screen.getByText("B-02")).toBeInTheDocument();
  });

  it("deep-links units to their property workspace", async () => {
    renderWithProviders(<OccupancyBoard companyId={COMPANY} />);
    const link = await screen.findByRole("link", { name: "Quinta do Douro" });
    expect(link.getAttribute("href")).toContain("/properties/p1");
  });

  it("shows an empty state when no unit matches the filters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OccupancyBoard companyId={COMPANY} />);
    await screen.findByText("A-01");
    await user.type(screen.getByLabelText("Search occupancy"), "zzzz");
    expect(await screen.findByText(/no unit/i)).toBeInTheDocument();
  });
});
