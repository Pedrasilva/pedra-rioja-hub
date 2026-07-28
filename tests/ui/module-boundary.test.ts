import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Phase 6d guard rails. These assert the extraction boundary itself: what the
 * shared bookkeeping core is allowed to import, and that no client-side code
 * can destroy accounting history.
 */

const MODULE_DIR = "src/modules/bookkeeping";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const files = walk(MODULE_DIR).filter((f) => /\.tsx?$/.test(f));
const sources = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

describe("bookkeeping module boundary", () => {
  it("has files to inspect", () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it("never imports another Pedra Rioja domain module", () => {
    for (const [file, src] of sources) {
      expect.soft(src, file).not.toMatch(/from ["']@\/modules\/(realestate|cashflow|banking)/);
      expect.soft(src, file).not.toMatch(/from ["']\.\.\/\.\.\/(realestate|cashflow|banking)/);
    }
  });

  it("never imports app routing, navigation or the workspace shell", () => {
    for (const [file, src] of sources) {
      expect.soft(src, file).not.toMatch(/@tanstack\/react-router/);
      expect.soft(src, file).not.toMatch(/@\/components\/app-shell/);
      expect.soft(src, file).not.toMatch(/@\/hooks\/use-workspace/);
    }
  });

  it("reaches the backend only through the supabase client and the module server functions", () => {
    for (const [file, src] of sources) {
      if (file.endsWith("bookkeeping.functions.ts")) continue;
      const imports = [...src.matchAll(/from ["']([^"']+)["']/g)].map((m) => m[1]!);
      const backendImports = imports.filter(
        (i) => i.includes("supabase") || i.includes("functions"),
      );
      for (const imported of backendImports) {
        expect
          .soft(
            imported === "@/integrations/supabase/client" ||
              imported.endsWith("bookkeeping.functions"),
            `${file} imports ${imported}`,
          )
          .toBe(true);
      }
    }
  });

  it("exposes no client-side destructive delete of accounting history", () => {
    for (const [file, src] of sources) {
      if (file.endsWith("bookkeeping.functions.ts")) continue;
      expect.soft(src, file).not.toMatch(/\.delete\(\)/);
      expect.soft(src, file).not.toMatch(/\.rpc\(\s*["'][^"']*delete/);
    }
  });

  it("only deletes draft document lines on the server, never a document or a payment", () => {
    const server = sources.get(join(MODULE_DIR, "bookkeeping.functions.ts"))!;
    const deletes = [...server.matchAll(/\.from\("([a-z_]+)"\)\s*\.delete\(\)/g)].map((m) => m[1]);
    expect(deletes).toEqual(["financial_document_lines"]);
    expect(server).not.toMatch(/from\("financial_documents"\)[\s\S]{0,40}\.delete\(\)/);
    expect(server).not.toMatch(/from\("financial_payments"\)[\s\S]{0,40}\.delete\(\)/);
  });

  it("keeps every server function company-scoped or document-scoped", () => {
    const server = sources.get(join(MODULE_DIR, "bookkeeping.functions.ts"))!;
    expect(server).toMatch(/requireSupabaseAuth/);
    // no server function may run without the authenticated middleware
    const handlers = server.split("= createServerFn").slice(1);
    expect(handlers.length).toBeGreaterThan(10);
    for (const handler of handlers) {
      expect(handler.slice(0, 400)).toMatch(/middleware\(\[requireSupabaseAuth\]\)/);
    }
  });
});
