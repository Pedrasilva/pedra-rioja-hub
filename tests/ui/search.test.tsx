import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigate = vi.fn();
const searchState: { hits: unknown[]; isFetching: boolean; isError: boolean } = {
  hits: [],
  isFetching: false,
  isError: false,
};

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("@/modules/search/queries", () => ({
  useGlobalSearch: () => ({
    data: searchState.hits,
    isFetching: searchState.isFetching,
    isError: searchState.isError,
  }),
}));

import { GlobalSearch } from "@/modules/search/components/global-search";
import { renderWithProviders } from "./harness";

function hit(overrides: Record<string, unknown>) {
  return {
    company_id: "c1",
    entity_type: "property",
    entity_id: "e1",
    title: "Row",
    subtitle: null,
    url_path: "/properties/e1",
    occurred_at: null,
    status: null,
    is_archived: false,
    property_id: null,
    ...overrides,
  };
}

/**
 * cmdk filters rendered items against the typed value, so tests that assert on
 * results leave the input empty and let the mocked index supply the rows.
 */
async function openPalette(term = "") {
  const user = userEvent.setup();
  renderWithProviders(<GlobalSearch companyId="c1" />);
  await user.click(screen.getByRole("button", { name: /search the portfolio/i }));
  if (term) await user.type(screen.getByPlaceholderText(/search properties/i), term);
  return user;
}

beforeEach(() => {
  navigate.mockReset();
  searchState.hits = [];
  searchState.isFetching = false;
  searchState.isError = false;
});

describe("global search palette", () => {
  it("groups every operational entity type under a readable heading", async () => {
    searchState.hits = [
      hit({ entity_type: "commitment", entity_id: "cm1", title: "Roof works", url_path: "/commitments/cm1" }),
      hit({ entity_type: "budget", entity_id: "b1", title: "2026 plan", url_path: "/budgets/b1" }),
      hit({
        entity_type: "maintenance_schedule",
        entity_id: "ms1",
        title: "Boiler service",
        url_path: "/operations?tab=preventive&record=ms1",
      }),
      hit({
        entity_type: "counterparty",
        entity_id: "cp1",
        title: "EDP",
        url_path: "/bookkeeping?tab=counterparties&record=cp1",
      }),
    ];
    await openPalette();

    for (const heading of ["Commitments", "Budgets", "Preventive schedules", "Counterparties"]) {
      expect(await screen.findByText(heading)).toBeInTheDocument();
    }
  });

  it("navigates to the workspace route carried by the index, tab and all", async () => {
    searchState.hits = [
      hit({
        entity_type: "maintenance_job",
        entity_id: "mj1",
        title: "Lift inspection",
        url_path: "/operations?tab=maintenance&record=mj1",
      }),
    ];
    const user = await openPalette();
    await user.click(await screen.findByText("Lift inspection"));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ href: "/operations?tab=maintenance&record=mj1" }),
    );
  });

  it("routes a document to its owning property workspace", async () => {
    searchState.hits = [
      hit({
        entity_type: "document",
        entity_id: "d1",
        title: "Deed of purchase",
        url_path: "/properties/p1?tab=documents&record=d1",
      }),
    ];
    const user = await openPalette();
    await user.click(await screen.findByText("Deed of purchase"));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ href: "/properties/p1?tab=documents&record=d1" }),
    );
  });

  it("refuses to navigate when the index has no destination", async () => {
    searchState.hits = [hit({ title: "Orphan row", url_path: null })];
    const user = await openPalette();
    await user.click(await screen.findByText("Orphan row"));

    expect(navigate).not.toHaveBeenCalled();
  });

  it("marks archived rows so a stale hit is never mistaken for a live record", async () => {
    searchState.hits = [hit({ title: "Old commitment", is_archived: true })];
    await openPalette();
    expect(await screen.findByText("Archived")).toBeInTheDocument();
  });

  it("explains an empty result set without pretending nothing matched", async () => {
    searchState.isError = true;
    await openPalette("mar");
    expect(await screen.findByText(/search is unavailable/i)).toBeInTheDocument();
  });
});
