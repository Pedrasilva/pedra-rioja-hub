import { test } from "vitest";
test("import chain 2", async () => {
  console.log("H"); await import("./harness");
  console.log("CORE"); await import("@/packages/bookkeeping-core");
  console.log("DONE");
});
