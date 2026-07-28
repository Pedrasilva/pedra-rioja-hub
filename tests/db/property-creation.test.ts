import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, expectNoError } from "../support/client";
import {
  countRows,
  createPropertyLikeServerFn,
  createTestCompany,
  dropTestCompany,
  type TestCompany,
} from "../support/fixtures";
import { planPropertyFolders } from "../../src/modules/realestate/drive-template";

let company: TestCompany;

beforeAll(async () => {
  company = await createTestCompany("property-creation");
});

afterAll(async () => {
  await dropTestCompany(company);
});

describe("property creation", () => {
  it("generates sequential, unique PR001-style codes per company", async () => {
    const first = await createPropertyLikeServerFn(company.id, {
      name: "Quinta do Douro",
      acquisition_date: "2024-03-01",
      purchasePrice: 250_000,
      city: "Porto",
    });
    const second = await createPropertyLikeServerFn(company.id, { name: "Rua Aurea 12" });

    expect(first.property.code).toBe("PR001");
    expect(second.property.code).toBe("PR002");

    const other = await createTestCompany("code-isolation");
    try {
      const isolated = await createPropertyLikeServerFn(other.id, { name: "Other Co Asset" });
      expect(isolated.property.code).toBe("PR001");
    } finally {
      await dropTestCompany(other);
    }
  });

  it("records the purchase price as an acquisition cost, not on the property", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, {
      name: "Acquisition Cost Asset",
      acquisition_date: "2023-06-15",
      purchasePrice: 400_000,
    });

    const { data, error } = await admin
      .from("property_acquisition_costs")
      .select("cost_type, amount, capitalisable, incurred_on")
      .eq("property_id", property.id);
    expectNoError({ error }, "read acquisition costs");
    expect(data).toHaveLength(1);
    expect(data![0].cost_type).toBe("price");
    expect(Number(data![0].amount)).toBe(400_000);
    expect(data![0].incurred_on).toBe("2023-06-15");

    const propertyColumns = Object.keys(
      (await admin.from("properties").select("*").eq("id", property.id).single()).data!,
    );
    for (const forbidden of [
      "purchase_price",
      "current_valuation",
      "outstanding_debt",
      "estimated_equity",
      "monthly_rent",
      "occupancy_pct",
    ]) {
      expect(propertyColumns).not.toContain(forbidden);
    }
  });

  it("queues the full Drive folder plan with sync_status = pending", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, { name: "Drive Plan Asset" });
    const expected = planPropertyFolders(property.id, property.code!);

    const { data, error } = await admin
      .from("drive_folders")
      .select("path, folder_kind, sync_status, drive_folder_id")
      .eq("entity_id", property.id)
      .order("path");
    expectNoError({ error }, "read drive folders");

    expect(data).toHaveLength(expected.length);
    expect(data!.every((f) => f.sync_status === "pending")).toBe(true);
    expect(data!.every((f) => f.drive_folder_id === null)).toBe(true);
    expect(data!.map((f) => f.path).sort()).toEqual(expected.map((f) => f.path).sort());
    expect(data!.some((f) => f.path === `01 Properties/${property.code}/Legal`)).toBe(true);
  });

  it("registers exactly one dimension value for the property", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, { name: "Dimension Asset" });
    const { data } = await admin
      .from("dimension_values")
      .select("id, code, label, entity_table, is_active, dimensions(code)")
      .eq("entity_id", property.id);

    expect(data).toHaveLength(1);
    expect(data![0].entity_table).toBe("properties");
    expect(data![0].code).toBe(property.code);
    expect(data![0].is_active).toBe(true);
  });

  it("creates the 'Property acquired' timeline event exactly once and keeps it in sync", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, {
      name: "Timeline Asset",
      acquisition_date: "2022-01-10",
    });

    const eventsAfterInsert = await admin
      .from("property_events")
      .select("event_type, title, is_manual, event_date")
      .eq("property_id", property.id);
    expect(eventsAfterInsert.data).toHaveLength(1);
    expect(eventsAfterInsert.data![0].event_type).toBe("purchase");
    expect(eventsAfterInsert.data![0].title).toBe("Property acquired");
    expect(eventsAfterInsert.data![0].is_manual).toBe(false);

    // Repeated updates must upsert, never duplicate.
    for (const name of ["Timeline Asset v2", "Timeline Asset v3"]) {
      const upd = await admin.from("properties").update({ name }).eq("id", property.id);
      expectNoError(upd, "update property");
    }
    expect(await countRows("property_events", { property_id: property.id })).toBe(1);
    expect(await countRows("dimension_values", { entity_id: property.id })).toBe(1);
    expect(await countRows("drive_folders", { entity_id: property.id })).toBe(12);

    // Changing the acquisition date updates the existing event in place.
    await admin.from("properties").update({ acquisition_date: "2022-02-20" }).eq("id", property.id);
    const after = await admin
      .from("property_events")
      .select("event_date")
      .eq("property_id", property.id);
    expect(after.data).toHaveLength(1);
    expect(after.data![0].event_date).toBe("2022-02-20");
  });

  it("does not create a purchase event when no acquisition date is known", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, { name: "No Date Asset" });
    expect(await countRows("property_events", { property_id: property.id })).toBe(0);
  });

  it("appears in the register (v_property_summary) with derived, non-misleading values", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, {
      name: "Register Asset",
      acquisition_date: "2024-01-01",
      purchasePrice: 300_000,
      city: "Lisboa",
    });

    const { data, error } = await admin
      .from("v_property_summary")
      .select("*")
      .eq("property_id", property.id)
      .single();
    expectNoError({ error }, "read v_property_summary");

    expect(data!.code).toBe(property.code);
    expect(Number(data!.purchase_price)).toBe(300_000);
    expect(Number(data!.acquisition_total)).toBe(300_000);
    expect(data!.current_valuation).toBeNull();
    expect(Number(data!.outstanding_debt ?? 0)).toBe(0);
    expect(Number(data!.monthly_rent ?? 0)).toBe(0);
  });
});
