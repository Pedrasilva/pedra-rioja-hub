import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, expectNoError, sqlRows } from "../support/client";
import {
  createPropertyLikeServerFn,
  createTestCompany,
  dropTestCompany,
  type TestCompany,
} from "../support/fixtures";
import { planChildFolder, planPropertyFolders } from "../../src/modules/realestate/drive-template";

/**
 * Regression suite for the Phase 2 blocker: an ON CONFLICT target that does not
 * match the actual index (partial / expression indexes) fails only at runtime.
 * These tests assert both the structural match and the runtime behaviour.
 */

let company: TestCompany;

beforeAll(async () => {
  company = await createTestCompany("conflict-targets");
});

afterAll(async () => {
  await dropTestCompany(company);
});

function indexDef(name: string) {
  const rows = sqlRows(
    `select indexdef from pg_indexes where schemaname='public' and indexname='${name}'`,
  );
  expect(rows, `index ${name} must exist`).toHaveLength(1);
  return rows[0];
}

describe("trigger / index conflict-target compatibility", () => {
  it("dimension_values: trigger ON CONFLICT matches the partial unique index", () => {
    const def = indexDef("dimension_values_entity_idx");
    expect(def).toContain("(dimension_id, entity_id)");
    expect(def).toContain("WHERE (entity_id IS NOT NULL)");

    const fn = sqlRows(
      "select replace(pg_get_functiondef(oid), chr(10), ' ') from pg_proc where proname='tg_sync_dimension_value'",
    )[0];
    expect(fn).toContain("ON CONFLICT (dimension_id, entity_id) WHERE entity_id IS NOT NULL");
  });

  it("property_events: record_property_event ON CONFLICT matches the partial unique index", () => {
    const def = indexDef("property_events_source_key");
    expect(def).toContain("(source_type, source_id, event_type)");
    expect(def).toContain("WHERE (source_id IS NOT NULL)");

    const fn = sqlRows(
      "select replace(pg_get_functiondef(oid), chr(10), ' ') from pg_proc where proname='record_property_event'",
    )[0];
    expect(fn).toContain("ON CONFLICT (source_type, source_id, event_type) WHERE source_id IS NOT NULL");
  });

  it("drive_folders: the unique index is an expression index, so no code may use ON CONFLICT on it", () => {
    const def = indexDef("drive_folders_entity_kind_idx");
    expect(def).toContain("COALESCE(entity_id");

    // PostgREST cannot target an expression index with on_conflict, so the
    // server function reconciles explicitly. Guard against a regression.
    const fnSource = sqlRows(
      "select 1 where exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_get_functiondef(p.oid) ilike '%drive_folders%on conflict%')",
    );
    expect(fnSource).toHaveLength(0);
  });

  it("runtime: creating and re-saving a property never trips a conflict target", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, {
      name: "Conflict Asset",
      acquisition_date: "2024-07-01",
      purchasePrice: 100_000,
    });

    for (let i = 0; i < 3; i++) {
      const upd = await admin
        .from("properties")
        .update({ name: `Conflict Asset ${i}`, acquisition_date: "2024-07-01" })
        .eq("id", property.id);
      expectNoError(upd, `re-save property #${i}`);
    }

    const events = await admin.from("property_events").select("id").eq("property_id", property.id);
    expect(events.data).toHaveLength(1);
    const dims = await admin.from("dimension_values").select("id").eq("entity_id", property.id);
    expect(dims.data).toHaveLength(1);
  });

  it("runtime: re-planning a child Drive folder reconciles instead of duplicating", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, { name: "Folder Asset" });
    const agreement = await admin
      .from("financing_agreements")
      .insert({
        company_id: company.id,
        property_id: property.id,
        lender: "Caixa",
        principal: 100_000,
        start_date: "2024-01-01",
      })
      .select("id")
      .single();
    expectNoError(agreement, "create agreement");

    const planFirst = planChildFolder(
      "financing_agreements",
      agreement.data!.id,
      property.code!,
      "Caixa",
    )!;
    const planRenamed = planChildFolder(
      "financing_agreements",
      agreement.data!.id,
      property.code!,
      "Caixa Geral",
    )!;

    // mirrors planEntityDriveFolder: look up, then update or insert
    for (const plan of [planFirst, planFirst, planRenamed]) {
      const existing = await admin
        .from("drive_folders")
        .select("id")
        .eq("company_id", company.id)
        .eq("entity_type", plan.entity_type)
        .eq("entity_id", plan.entity_id!)
        .eq("folder_kind", plan.folder_kind)
        .maybeSingle();
      const row = {
        company_id: company.id,
        entity_type: plan.entity_type,
        entity_id: plan.entity_id,
        folder_kind: plan.folder_kind,
        path: plan.path,
        sync_status: "pending",
      };
      const res = existing.data
        ? await admin.from("drive_folders").update(row).eq("id", existing.data.id)
        : await admin.from("drive_folders").insert(row);
      expectNoError(res, "reconcile drive folder");
    }

    const folders = await admin
      .from("drive_folders")
      .select("path")
      .eq("entity_id", agreement.data!.id);
    expect(folders.data).toHaveLength(1);
    expect(folders.data![0].path).toContain("Caixa Geral");
  });

  it("runtime: the expression unique index actually blocks duplicate folder rows", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, { name: "Dup Folder Asset" });
    const plan = planPropertyFolders(property.id, property.code!)[0];
    const dup = await admin.from("drive_folders").insert({
      company_id: company.id,
      entity_type: plan.entity_type,
      entity_id: plan.entity_id,
      folder_kind: plan.folder_kind,
      path: plan.path,
      sync_status: "pending",
    });
    expect(dup.error).not.toBeNull();
  });

  it("polymorphic source_type/source_id keeps automatic events per source distinct", async () => {
    const { property } = await createPropertyLikeServerFn(company.id, {
      name: "Polymorphic Asset",
      acquisition_date: "2020-01-01",
    });
    await admin.from("properties").update({ disposal_date: "2024-12-31" }).eq("id", property.id);

    const { data } = await admin
      .from("property_events")
      .select("source_type, event_type")
      .eq("property_id", property.id)
      .order("event_type");
    expect(data!.map((e) => e.source_type).sort()).toEqual(["properties", "properties_disposal"]);
    expect(data!.map((e) => e.event_type).sort()).toEqual(["purchase", "sold"]);
  });

  it("transaction_dimensions keeps its idempotency key on (source_type, source_id, dimension_value_id)", async () => {
    const def = indexDef("transaction_dimensions_source_type_source_id_dimension_valu_key");
    expect(def).toContain("(source_type, source_id, dimension_value_id)");

    const { property } = await createPropertyLikeServerFn(company.id, { name: "Dimension Link" });
    const dim = await admin
      .from("dimension_values")
      .select("id")
      .eq("entity_id", property.id)
      .single();
    const sourceId = crypto.randomUUID();
    const row = {
      company_id: company.id,
      source_type: "bank_transactions",
      source_id: sourceId,
      dimension_value_id: dim.data!.id,
    };
    expectNoError(await admin.from("transaction_dimensions").insert(row), "link dimension");
    const dup = await admin.from("transaction_dimensions").insert(row);
    expect(dup.error).not.toBeNull();
  });
});
