import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, expectNoError } from "../support/client";
import {
  countRows,
  createPropertyLikeServerFn,
  createTestCompany,
  dropTestCompany,
  type TestCompany,
} from "../support/fixtures";

let company: TestCompany;
let propertyId: string;
let propertyCode: string;
let tenantId: string;
let tenancyId: string;
let agreementId: string;
let projectId: string;

beforeAll(async () => {
  company = await createTestCompany("related-entities");
  const { property } = await createPropertyLikeServerFn(company.id, {
    name: "Related Entities Asset",
    acquisition_date: "2023-01-05",
    purchasePrice: 500_000,
  });
  propertyId = property.id;
  propertyCode = property.code!;
});

afterAll(async () => {
  await dropTestCompany(company);
});

async function dimensionValueCount(entityId: string) {
  return countRows("dimension_values", { entity_id: entityId });
}

async function eventsFor(sourceType: string, sourceId: string) {
  const { data, error } = await admin
    .from("property_events")
    .select("event_type, title, event_date, amount, is_manual")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  expectNoError({ error }, `read events for ${sourceType}`);
  return data!;
}

describe("related entities: creation, updates, dimensions and timeline", () => {
  it("property units: create, update, dimension registration, unique code per property", async () => {
    const created = await admin
      .from("property_units")
      .insert({ company_id: company.id, property_id: propertyId, code: "A1", name: "Ground floor" })
      .select("id")
      .single();
    expectNoError(created, "create unit");
    const unitId = created.data!.id;
    expect(await dimensionValueCount(unitId)).toBe(1);

    const upd = await admin
      .from("property_units")
      .update({ name: "Ground floor shop", status: "rented" })
      .eq("id", unitId);
    expectNoError(upd, "update unit");
    expect(await dimensionValueCount(unitId)).toBe(1);

    const dup = await admin
      .from("property_units")
      .insert({ company_id: company.id, property_id: propertyId, code: "A1" });
    expect(dup.error).not.toBeNull();

    await admin
      .from("property_units")
      .insert({ company_id: company.id, property_id: propertyId, code: "A2", status: "available" });
    expect(await countRows("property_units", { property_id: propertyId })).toBe(2);
  });

  it("tenants: create and update register one dimension value", async () => {
    const created = await admin
      .from("tenants")
      .insert({ company_id: company.id, name: "Adega Rioja Lda", tenant_type: "company" })
      .select("id")
      .single();
    expectNoError(created, "create tenant");
    tenantId = created.data!.id;
    expect(await dimensionValueCount(tenantId)).toBe(1);

    await admin.from("tenants").update({ name: "Adega Rioja SA" }).eq("id", tenantId);
    const { data } = await admin
      .from("dimension_values")
      .select("label")
      .eq("entity_id", tenantId)
      .single();
    expect(data!.label).toContain("Adega Rioja SA");
    expect(await dimensionValueCount(tenantId)).toBe(1);
  });

  it("tenancies: timeline events on start, on end, and no duplicates on repeat updates", async () => {
    const created = await admin
      .from("tenancy_agreements")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        tenant_id: tenantId,
        start_date: "2024-01-01",
        base_rent: 1_500,
        status: "active",
      })
      .select("id")
      .single();
    expectNoError(created, "create tenancy");
    tenancyId = created.data!.id;

    expect(await dimensionValueCount(tenancyId)).toBe(1);
    const startEvents = await eventsFor("tenancy_agreements", tenancyId);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].event_type).toBe("tenant_moved_in");

    for (const rent of [1_600, 1_700, 1_800]) {
      await admin.from("tenancy_agreements").update({ base_rent: rent }).eq("id", tenancyId);
    }
    const afterUpdates = await eventsFor("tenancy_agreements", tenancyId);
    expect(afterUpdates).toHaveLength(1);
    expect(Number(afterUpdates[0].amount)).toBe(1_800);

    await admin
      .from("tenancy_agreements")
      .update({ status: "ended", end_date: "2025-06-30" })
      .eq("id", tenancyId);
    const endEvents = await eventsFor("tenancy_agreements_end", tenancyId);
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0].event_type).toBe("tenant_moved_out");
    expect(await eventsFor("tenancy_agreements", tenancyId)).toHaveLength(1);

    // restore the tenancy as active for later view tests
    await admin
      .from("tenancy_agreements")
      .update({ status: "active", end_date: null })
      .eq("id", tenancyId);
  });

  it("rent schedules: create, update, and unique period per tenancy", async () => {
    const rows = [1, 2, 3].map((m) => ({
      company_id: company.id,
      tenancy_id: tenancyId,
      period_start: `2024-0${m}-01`,
      period_end: `2024-0${m}-28`,
      due_date: `2024-0${m}-05`,
      amount: 1_500,
    }));
    const insert = await admin.from("rent_schedules").insert(rows);
    expectNoError(insert, "create rent schedule");

    const dup = await admin.from("rent_schedules").insert(rows[0]);
    expect(dup.error).not.toBeNull();

    const upd = await admin
      .from("rent_schedules")
      .update({ status: "paid", settled_on: "2024-01-06" })
      .eq("tenancy_id", tenancyId)
      .eq("period_start", "2024-01-01");
    expectNoError(upd, "settle rent schedule");
    expect(await countRows("rent_schedules", { tenancy_id: tenancyId, status: "paid" })).toBe(1);
  });

  it("financing agreements and schedule versions: events, dimensions, versioning", async () => {
    const created = await admin
      .from("financing_agreements")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        lender: "Banco Rioja",
        principal: 300_000,
        start_date: "2023-02-01",
        rate_type: "euribor_spread",
        index_name: "EURIBOR",
        index_tenor: "12M",
        spread: 1.1,
        status: "active",
      })
      .select("id")
      .single();
    expectNoError(created, "create financing agreement");
    agreementId = created.data!.id;

    expect(await dimensionValueCount(agreementId)).toBe(1);
    const signed = await eventsFor("financing_agreements", agreementId);
    expect(signed).toHaveLength(1);
    expect(signed[0].event_type).toBe("mortgage_signed");

    const v1 = await admin
      .from("financing_schedule_versions")
      .insert({
        company_id: company.id,
        agreement_id: agreementId,
        version_no: 1,
        effective_from: "2023-02-01",
        reason: "origination",
        rate_applied: 3.4,
        is_current: true,
      })
      .select("id")
      .single();
    expectNoError(v1, "create schedule version 1");

    const dupVersion = await admin.from("financing_schedule_versions").insert({
      company_id: company.id,
      agreement_id: agreementId,
      version_no: 1,
      effective_from: "2023-02-01",
    });
    expect(dupVersion.error).not.toBeNull();

    await admin
      .from("financing_schedule_versions")
      .update({ is_current: false })
      .eq("id", v1.data!.id);
    const v2 = await admin
      .from("financing_schedule_versions")
      .insert({
        company_id: company.id,
        agreement_id: agreementId,
        version_no: 2,
        effective_from: "2024-02-01",
        reason: "rate_reset",
        rate_applied: 4.2,
        is_current: true,
      })
      .select("id")
      .single();
    expectNoError(v2, "create schedule version 2");

    // one revision event per version, and repeat updates do not duplicate
    expect(await eventsFor("financing_schedule_versions", v2.data!.id)).toHaveLength(1);
    await admin
      .from("financing_schedule_versions")
      .update({ notes: "reviewed" })
      .eq("id", v2.data!.id);
    expect(await eventsFor("financing_schedule_versions", v2.data!.id)).toHaveLength(1);

    const rowsInsert = await admin.from("financing_schedule_rows").insert([
      {
        company_id: company.id,
        version_id: v2.data!.id,
        period_no: 1,
        due_date: "2024-03-01",
        opening_balance: 290_000,
        total_payment: 1_400,
        interest: 900,
        principal: 500,
        closing_balance: 289_500,
      },
    ]);
    expectNoError(rowsInsert, "create schedule rows");

    // settling the agreement adds a distinct settled event, still once
    await admin.from("financing_agreements").update({ status: "settled" }).eq("id", agreementId);
    expect(await eventsFor("financing_agreements_settled", agreementId)).toHaveLength(1);
    await admin.from("financing_agreements").update({ notes: "touched" }).eq("id", agreementId);
    expect(await eventsFor("financing_agreements_settled", agreementId)).toHaveLength(1);
    await admin.from("financing_agreements").update({ status: "active" }).eq("id", agreementId);
  });

  it("tenant fit-out loans: dimension registration and repeatable updates", async () => {
    const created = await admin
      .from("tenant_fitout_loans")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        tenant_id: tenantId,
        tenancy_id: tenancyId,
        description: "Shop fit-out advance",
        principal: 25_000,
        term_months: 24,
        start_date: "2024-02-01",
      })
      .select("id")
      .single();
    expectNoError(created, "create fit-out loan");
    const loanId = created.data!.id;
    expect(await dimensionValueCount(loanId)).toBe(1);

    await admin.from("tenant_fitout_loans").update({ principal: 26_000 }).eq("id", loanId);
    await admin.from("tenant_fitout_loans").update({ status: "settled" }).eq("id", loanId);
    expect(await dimensionValueCount(loanId)).toBe(1);
  });

  it("capex projects: dimension, timeline event, and idempotent updates", async () => {
    const created = await admin
      .from("capex_projects")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        name: "Roof replacement",
        project_type: "renovation",
        status: "in_progress",
        start_date: "2024-04-01",
        budget_amount: 60_000,
      })
      .select("id")
      .single();
    expectNoError(created, "create capex project");
    projectId = created.data!.id;

    expect(await dimensionValueCount(projectId)).toBe(1);
    const events = await eventsFor("capex_projects", projectId);
    expect(events).toHaveLength(1);

    for (const budget of [65_000, 70_000]) {
      await admin.from("capex_projects").update({ budget_amount: budget }).eq("id", projectId);
    }
    expect(await eventsFor("capex_projects", projectId)).toHaveLength(1);
    expect(await dimensionValueCount(projectId)).toBe(1);

    const cost = await admin.from("capex_project_costs").insert({
      company_id: company.id,
      project_id: projectId,
      description: "Scaffolding",
      amount: 4_000,
    });
    expectNoError(cost, "create project cost");
  });

  it("valuations: one event per valuation, latest wins", async () => {
    const first = await admin
      .from("property_valuations")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        valuation_date: "2024-01-31",
        amount: 520_000,
        method: "internal",
      })
      .select("id")
      .single();
    expectNoError(first, "create valuation");
    expect(await eventsFor("property_valuations", first.data!.id)).toHaveLength(1);

    await admin.from("property_valuations").update({ amount: 530_000 }).eq("id", first.data!.id);
    expect(await eventsFor("property_valuations", first.data!.id)).toHaveLength(1);

    const second = await admin
      .from("property_valuations")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        valuation_date: "2025-01-31",
        amount: 560_000,
        method: "appraiser",
        valuer: "Prime Yield",
      })
      .select("id")
      .single();
    expectNoError(second, "create second valuation");

    const { data } = await admin
      .from("v_property_current_valuation")
      .select("current_valuation, valuation_date, method")
      .eq("property_id", propertyId)
      .single();
    expect(Number(data!.current_valuation)).toBe(560_000);
    expect(data!.valuation_date).toBe("2025-01-31");
    expect(data!.method).toBe("appraiser");
  });

  it("insurance policies: renewal event created once", async () => {
    const created = await admin
      .from("property_insurance_policies")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        insurer: "Fidelidade",
        policy_number: "POL-1",
        insured_amount: 600_000,
        premium_amount: 800,
        start_date: "2024-01-01",
        renewal_date: "2025-01-01",
      })
      .select("id")
      .single();
    expectNoError(created, "create insurance policy");
    expect(await eventsFor("property_insurance_policies", created.data!.id)).toHaveLength(1);

    await admin
      .from("property_insurance_policies")
      .update({ premium_amount: 850 })
      .eq("id", created.data!.id);
    expect(await eventsFor("property_insurance_policies", created.data!.id)).toHaveLength(1);
  });

  it("depreciation assets: create and update without side effects", async () => {
    const created = await admin
      .from("depreciation_assets")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        capex_project_id: projectId,
        description: "Roof (capitalised)",
        category: "building",
        capitalised_amount: 60_000,
        in_service_date: "2024-09-01",
        useful_life_years: 20,
      })
      .select("id")
      .single();
    expectNoError(created, "create depreciation asset");

    const entry = await admin.from("depreciation_entries").insert({
      company_id: company.id,
      asset_id: created.data!.id,
      period_start: "2024-09-01",
      period_end: "2024-09-30",
      amount: 250,
    });
    expectNoError(entry, "create depreciation entry");

    const dup = await admin.from("depreciation_entries").insert({
      company_id: company.id,
      asset_id: created.data!.id,
      period_start: "2024-09-01",
      period_end: "2024-09-30",
      amount: 250,
    });
    expect(dup.error).not.toBeNull();

    await admin
      .from("depreciation_assets")
      .update({ useful_life_years: 25 })
      .eq("id", created.data!.id);
  });

  it("manual property events: created as manual and never overwritten by triggers", async () => {
    const created = await admin
      .from("property_events")
      .insert({
        company_id: company.id,
        property_id: propertyId,
        event_date: "2024-05-05",
        event_type: "custom",
        title: "Condominium meeting",
        description: "Agreed facade works",
      })
      .select("id, is_manual, source_id")
      .single();
    expectNoError(created, "create manual event");
    expect(created.data!.is_manual).toBe(true);
    expect(created.data!.source_id).toBeNull();

    // Two manual events with the same type are allowed (partial index only
    // constrains automatic, source-linked events).
    const second = await admin.from("property_events").insert({
      company_id: company.id,
      property_id: propertyId,
      event_date: "2024-05-06",
      event_type: "custom",
      title: "Condominium meeting follow-up",
    });
    expectNoError(second, "create second manual event");

    await admin
      .from("property_events")
      .update({ title: "Condominium meeting (minuted)" })
      .eq("id", created.data!.id);
    const { data } = await admin
      .from("property_events")
      .select("title")
      .eq("id", created.data!.id)
      .single();
    expect(data!.title).toBe("Condominium meeting (minuted)");
  });

  it("archived records stay queryable but drop out of active register filters", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, {
      name: "To Be Archived",
      acquisition_date: "2021-01-01",
    });
    await admin.from("properties").update({ status: "archived" }).eq("id", property.id);

    const active = await admin
      .from("v_property_summary")
      .select("property_id, status")
      .eq("company_id", company.id)
      .neq("status", "archived");
    expect(active.data!.some((r) => r.property_id === property.id)).toBe(false);

    const all = await admin
      .from("v_property_summary")
      .select("property_id, status")
      .eq("property_id", property.id)
      .single();
    expect(all.data!.status).toBe("archived");

    // archiving must not orphan folders, dimensions or events
    expect(await countRows("drive_folders", { entity_id: property.id })).toBe(12);
    expect(await countRows("dimension_values", { entity_id: property.id })).toBe(1);
    expect(await countRows("property_events", { property_id: property.id })).toBe(1);

    await admin.from("properties").update({ status: "owned" }).eq("id", property.id);
    const restored = await admin
      .from("properties")
      .select("status")
      .eq("id", property.id)
      .single();
    expect(restored.data!.status).toBe("owned");
  });

  it("property code is used for the child Drive folder paths", async () => {
    const path = `01 Properties/${propertyCode}/Financing/Banco Rioja`;
    const insert = await admin.from("drive_folders").insert({
      company_id: company.id,
      entity_type: "financing_agreements",
      entity_id: agreementId,
      folder_kind: "root",
      path,
      sync_status: "pending",
    });
    expectNoError(insert, "plan child folder");
    expect(await countRows("drive_folders", { entity_id: agreementId })).toBe(1);
  });
});
