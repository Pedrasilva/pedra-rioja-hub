import { it, vi } from "vitest";
import fs from "node:fs";
const log = (m: string) => fs.appendFileSync("/tmp/probe.txt", m + "\n");
log("top");
vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("./harness")).supabaseProxy,
}));
log("m1");
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/modules/bookkeeping/bookkeeping.functions", async () =>
  (await import("./harness")).serverFnModule(),
);
vi.mock("sonner", async () => ({ toast: (await import("./harness")).toastMock }));
log("mocks");
it("probe", async () => {
  log("body");
  const a = await import("./harness"); log("harness " + typeof a.seed);
  const b = await import("@/packages/bookkeeping-core/components/classifications-panel"); log("panel " + typeof b.ClassificationsPanel);
});
