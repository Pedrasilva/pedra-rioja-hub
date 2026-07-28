import { defineConfig } from "vitest/config";

// Standalone config: the database/RLS suite talks to Lovable Cloud over HTTP and
// psql, so it must not load the app's TanStack Start Vite plugins.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
