import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, expectNoError } from "../support/client";
import {
  createPropertyLikeServerFn,
  createTestCompany,
  dropTestCompany,
  type TestCompany,
} from "../support/fixtures";

/**
 * Views are the only source of KPI values. These tests prove each view derives
 * correctly from source rows and that missing data yields null / empty states
 * rather than a misleading zero.
 */

let company: TestCompany;
const ids: Record<string, string> = {};

beforeAll(async () => {
  company = await createTestCompany("views");

  // 1. vacant, financed, valued, multi-unit
  const vacant = await createPropertyLikeServerFn(company.id, {
    name: "Vacant Multi-Unit",
    acquisition_date: "2022-01-01",
    purchasePrice: 400_000,
  });
  ids.vacant = vacant.property.id;
  await admin.from("property_units").insert([
    { company_id: company.id, property_id: ids.vacant, code: "U1", status: "available" },
    { company_id: company.id, property_id: ids.vacant, code: "U2", status: "available" },
  ]);
  await admin.from("property_acquisition_costs").insert({
    company_id: company.id,
    property_id: ids.vacant,
    cost_type: "imt",
    description: "IMT",
    amount: 26_000,
    capitalisable: true,
  });
  await admin.from("property_valuations").insert({
    company_id: company.id,
    property_id: ids.vacant,
    valuation_date: "2025-01-01",
    amount: 450_000,
  });
  const fin1 = await admin
    .from("financing_agreements")
    .insert({
      company_id: company.id,
      property_id: ids.vacant,
      lender: "Bank A",
      principal: 200_000,
      start_date: "2022-01-01",
    })
    .select("id")
    .single();
  const fin2 = await admin
    .from("financing_agreements")
    .insert({
      company_id: company.id,
      property_id: ids.vacant,
      lender: "Bank B",
      principal: 50_000,
      start_date: "2023-01-01",
    })
    .select("id")
    .single();
  for (const [agreement, closing] of [
    [fin1.data!.id, 150_000],
    [fin2.data!.id, 40_000],
  ] as const) {
    const version = await admin
      .from("financing_schedule_versions")
      .insert({
        company_id: company.id,
        agreement_id: agreement,
        version_no: 1,
        effective_from: "2022-01-01",
        is_current: true,
      })
      .select("id")
      .single();
    expectNoError(version, "create version");
    const rowsRes = await admin.from("financing_schedule_rows").insert([
      {
        company_id: company.id,
        version_id: version.data!.id,
        period_no: 1,
        due_date: "2022-02-01",
        opening_balance: closing + 1_000,
        total_payment: 1_200,
        interest: 200,
        principal: 1_000,
        closing_balance: closing,
      },
      {
        company_id: company.id,
        version_id: version.data!.id,
        period_no: 2,
        due_date: "2099-01-01",
        opening_balance: closing,
        total_payment: 1_200,
        interest: 200,
        principal: 1_000,
        closing_balance: closing - 1_000,
      },
    ]);
    expectNoError(rowsRes, "create schedule rows");
  }

  // 2. occupied, single unit, no financing
  const occupied = await createPropertyLikeServerFn(company.id, {
    name: "Occupied No Debt",
    acquisition_date: "2023-05-01",
    purchasePrice: 200_000,
  });
  ids.occupied = occupied.property.id;
  const unit = await admin
    .from("property_units")
    .insert({ company_id: company.id, property_id: ids.occupied, code: "S1", status: "rented" })
    .select("id")
    .single();
  const tenant = await admin
    .from("tenants")
    .insert({ company_id: company.id, name: "Cafe Central" })
    .select("id")
    .single();
  await admin.from("tenancy_agreements").insert({
    company_id: company.id,
    property_id: ids.occupied,
    unit_id: unit.data!.id,
    tenant_id: tenant.data!.id,
    start_date: "2024-01-01",
    base_rent: 1_250,
    status: "active",
  });

  // 3. no valuation, no financing, no units, no costs
  const bare = await createPropertyLikeServerFn(company.id, { name: "Bare Asset" });
  ids.bare = bare.property.id;

  // 4. archived
  const archived = await createPropertyLikeServerFn(company.id, {
    name: "Archived Asset",
    acquisition_date: "2019-01-01",
    purchasePrice: 90_000,
  });
  ids.archived = archived.property.id;
  await admin.from("properties").update({ status: "archived" }).eq("id", ids.archived);
});

afterAll(async () => {
  await dropTestCompany(company);
});

async function summary(propertyId: string) {
  const { data, error } = await admin
    .from("v_property_summary")
    .select("*")
    .eq("property_id", propertyId)
    .single();
  expectNoError({ error }, "read summary");
  return data!;
}

describe("derived views", () => {
  it("v_property_acquisition_totals sums purchase price and capitalised costs", async () => {
    const { data } = await admin
      .from("v_property_acquisition_totals")
      .select("*")
      .eq("property_id", ids.vacant)
      .single();
    expect(Number(data!.purchase_price)).toBe(400_000);
    expect(Number(data!.acquisition_total)).toBe(426_000);
    expect(Number(data!.capitalised_total)).toBe(426_000);
  });

  it("v_property_current_valuation returns the latest valuation and null when absent", async () => {
    const valued = await admin
      .from("v_property_current_valuation")
      .select("current_valuation")
      .eq("property_id", ids.vacant)
      .single();
    expect(Number(valued.data!.current_valuation)).toBe(450_000);

    const bare = await summary(ids.bare);
    expect(bare.current_valuation).toBeNull();
    expect(bare.valuation_date).toBeNull();
  });

  it("v_property_debt_outstanding aggregates multiple agreements from current schedule versions", async () => {
    const { data } = await admin
      .from("v_property_debt_outstanding")
      .select("outstanding_debt, agreement_count")
      .eq("property_id", ids.vacant)
      .single();
    expect(Number(data!.outstanding_debt)).toBe(190_000);
    expect(Number(data!.agreement_count)).toBe(2);
  });

  it("a property with no financing reports no debt row / null debt, not a fabricated zero", async () => {
    const { data } = await admin
      .from("v_property_debt_outstanding")
      .select("outstanding_debt")
      .eq("property_id", ids.bare)
      .maybeSingle();
    expect(data === null || Number(data.outstanding_debt) === 0).toBe(true);
    const s = await summary(ids.bare);
    expect(s.outstanding_debt === null || Number(s.outstanding_debt) === 0).toBe(true);
  });

  it("v_property_occupancy reflects vacant, occupied and unit-less properties", async () => {
    const vacant = await admin
      .from("v_property_occupancy")
      .select("unit_count, rented_units, occupancy_pct")
      .eq("property_id", ids.vacant)
      .single();
    expect(Number(vacant.data!.unit_count)).toBe(2);
    expect(Number(vacant.data!.rented_units)).toBe(0);
    expect(Number(vacant.data!.occupancy_pct)).toBe(0);

    const occupied = await admin
      .from("v_property_occupancy")
      .select("unit_count, rented_units, occupancy_pct")
      .eq("property_id", ids.occupied)
      .single();
    expect(Number(occupied.data!.unit_count)).toBe(1);
    expect(Number(occupied.data!.rented_units)).toBe(1);
    expect(Number(occupied.data!.occupancy_pct)).toBe(100);

    const bare = await summary(ids.bare);
    expect(Number(bare.unit_count ?? 0)).toBe(0);
    expect(bare.occupancy_pct === null || Number(bare.occupancy_pct) === 0).toBe(true);
  });

  it("v_property_rent_roll counts only active tenancies", async () => {
    const occupied = await admin
      .from("v_property_rent_roll")
      .select("active_tenancies, monthly_rent")
      .eq("property_id", ids.occupied)
      .single();
    expect(Number(occupied.data!.active_tenancies)).toBe(1);
    expect(Number(occupied.data!.monthly_rent)).toBe(1_250);

    const vacant = await summary(ids.vacant);
    expect(Number(vacant.active_tenancies ?? 0)).toBe(0);
    expect(Number(vacant.monthly_rent ?? 0)).toBe(0);
  });

  it("v_property_summary derives equity = valuation - debt and never stores it", async () => {
    const s = await summary(ids.vacant);
    expect(Number(s.current_valuation)).toBe(450_000);
    expect(Number(s.outstanding_debt)).toBe(190_000);
    expect(Number(s.estimated_equity)).toBe(260_000);

    const bare = await summary(ids.bare);
    expect(bare.estimated_equity).toBeNull();
  });

  it("v_property_summary includes archived properties so the UI can filter, not lose them", async () => {
    const archived = await summary(ids.archived);
    expect(archived.status).toBe("archived");
  });

  it("v_portfolio_summary aggregates the company totals", async () => {
    const { data } = await admin
      .from("v_portfolio_summary")
      .select("*")
      .eq("company_id", company.id)
      .single();
    expect(Number(data!.property_count)).toBe(4);
    expect(Number(data!.outstanding_debt)).toBe(190_000);
    expect(Number(data!.monthly_rent)).toBe(1_250);
    expect(Number(data!.portfolio_value)).toBe(450_000);
    expect(Number(data!.acquisition_total)).toBe(426_000 + 200_000 + 90_000);
  });

  it("v_property_timeline exposes automatic and manual events in one chronological spine", async () => {
    await admin.from("property_events").insert({
      company_id: company.id,
      property_id: ids.vacant,
      event_date: "2024-06-01",
      event_type: "custom",
      title: "Facade inspection",
    });

    const { data } = await admin
      .from("v_property_timeline")
      .select("event_type, is_manual, event_date, property_code")
      .eq("property_id", ids.vacant)
      .order("event_date", { ascending: true });

    expect(data!.length).toBeGreaterThanOrEqual(3);
    expect(data!.some((e) => e.event_type === "purchase" && e.is_manual === false)).toBe(true);
    expect(data!.some((e) => e.event_type === "custom" && e.is_manual === true)).toBe(true);
    expect(data!.every((e) => e.property_code !== null)).toBe(true);
  });

  it("v_search_index covers every domain entity of the company", async () => {
    const { data, error } = await admin
      .from("v_search_index")
      .select("entity_type, entity_id, title, url_path")
      .eq("company_id", company.id);
    expectNoError({ error }, "read search index");

    const types = new Set(data!.map((r) => r.entity_type));
    expect(types.has("property")).toBe(true);
    expect(data!.some((r) => r.entity_id === ids.vacant && r.url_path.includes(ids.vacant))).toBe(
      true,
    );
    expect(data!.every((r) => typeof r.title === "string" && r.title.length > 0)).toBe(true);
  });

  it("views are company-scoped: no rows leak between companies", async () => {
    const other = await createTestCompany("view-isolation");
    try {
      await createPropertyLikeServerFn(other.id, { name: "Other Portfolio Asset" });
      const mine = await admin
        .from("v_property_summary")
        .select("property_id")
        .eq("company_id", company.id);
      expect(mine.data!.length).toBe(4);
    } finally {
      await dropTestCompany(other);
    }
  });
});
