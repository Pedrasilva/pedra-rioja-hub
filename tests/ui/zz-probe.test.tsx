import { it, vi } from "vitest";
import fs from "node:fs";
const log = (m: string) => fs.appendFileSync("/tmp/probe.txt", m + "\n");

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("./harness")).supabaseProxy,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/modules/bookkeeping/bookkeeping.functions", async () =>
  (await import("./harness")).serverFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./harness")).toastMock }));

import { ClassificationsPanel } from "@/packages/bookkeeping-core/components/classifications-panel";
import { capabilitiesFor } from "@/modules/bookkeeping/host/roles";
import { CLASSIFICATIONS, COMPANY, renderWithProviders, seed } from "./harness";

it("probe", async () => {
  log("seed");
  seed({ financial_classifications: CLASSIFICATIONS, properties: [], capex_projects: [] });
  log("render start");
  renderWithProviders(<ClassificationsPanel companyId={COMPANY} capabilities={capabilitiesFor(["manager"])} />);
  log("render done");
  await new Promise((r) => setTimeout(r, 500));
  log("settled");
});
