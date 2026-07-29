import { test } from "vitest";
test("import chain", async () => {
  console.log("A"); await import("@/packages/bookkeeping-core/host");
  console.log("B"); await import("@/modules/bookkeeping/host/roles");
  console.log("C"); await import("@/modules/bookkeeping/host/data");
  console.log("D"); await import("@/modules/bookkeeping/host/adapters");
  console.log("E"); await import("@/modules/bookkeeping/host/server");
  console.log("F");
});
