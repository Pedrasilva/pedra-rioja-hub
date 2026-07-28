import { admin, expectNoError } from "./client";
import { planPropertyFolders } from "../../src/modules/realestate/drive-template";

export type TestCompany = { id: string; name: string };

/**
 * Test fixtures live in throwaway companies. Deleting the company cascades to
 * every domain table, so no test data is left behind in the live database.
 */
export async function createTestCompany(label: string): Promise<TestCompany> {
  const name = `ZZ QA ${label} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const { data, error } = await admin
    .from("companies")
    .insert({ name, base_currency: "EUR", country_code: "PT" })
    .select("id, name")
    .single();
  if (error) throw new Error(`createTestCompany: ${error.message}`);
  return data as TestCompany;
}

export async function dropTestCompany(company: TestCompany | undefined) {
  if (!company) return;
  await admin.from("companies").delete().eq("id", company.id);
}

type PropertyInput = Record<string, unknown>;

/**
 * Mirrors the createProperty server function: property row, optional purchase
 * price as an acquisition cost, and the planned Drive folder set.
 */
export async function createPropertyLikeServerFn(
  companyId: string,
  input: PropertyInput & { name: string; purchasePrice?: number },
) {
  const { purchasePrice, ...rest } = input;
  const inserted = await admin
    .from("properties")
    .insert({ company_id: companyId, property_type: "apartment", status: "owned", ...rest })
    .select("id, code, name, company_id, acquisition_date")
    .single();
  expectNoError(inserted, "insert property");
  const property = inserted.data!;

  if (typeof purchasePrice === "number" && purchasePrice > 0) {
    const cost = await admin.from("property_acquisition_costs").insert({
      company_id: companyId,
      property_id: property.id,
      cost_type: "price",
      description: "Purchase price",
      amount: purchasePrice,
      currency: "EUR",
      incurred_on: (rest.acquisition_date as string | undefined) ?? null,
      capitalisable: true,
    });
    expectNoError(cost, "insert acquisition cost");
  }

  const folders = planPropertyFolders(property.id, property.code ?? property.id);
  const folderInsert = await admin.from("drive_folders").insert(
    folders.map((f) => ({
      company_id: companyId,
      entity_type: f.entity_type,
      entity_id: f.entity_id,
      folder_kind: f.folder_kind,
      path: f.path,
      sync_status: "pending",
    })),
  );
  expectNoError(folderInsert, "insert planned drive folders");

  return { property, plannedFolders: folders.length };
}

export async function countRows(
  table: string,
  filters: Record<string, string | number | boolean | null>,
) {
  let q = admin.from(table).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) {
    q = v === null ? q.is(k, null) : q.eq(k, v as never);
  }
  const { count, error } = await q;
  if (error) throw new Error(`countRows(${table}): ${error.message}`);
  return count ?? 0;
}
