import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// Two projects:
//  - `db`  : integration/RLS suite talking to Lovable Cloud over HTTP and psql.
//            It must not load the app's TanStack Start Vite plugins.
//  - `ui`  : component and unit tests for the extractable bookkeeping module,
//            running in jsdom with every backend boundary mocked.
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts", "tests/rls/**/*.test.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 60_000,
          fileParallelism: false,
          sequence: { concurrent: false },
        },
      },
      {
        resolve: { alias },
        test: {
          name: "ui",
          include: ["tests/ui/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["tests/ui/setup.ts"],
          globals: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
