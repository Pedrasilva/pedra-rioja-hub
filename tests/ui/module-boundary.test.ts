import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Phase 6d guard rails. These assert the extraction boundary itself: the
 * shared core (src/packages/bookkeeping-core) must be host-agnostic, and the
 * Pedra Rioja host (src/modules/bookkeeping) owns every host-specific detail.
 */

const CORE_DIR = "src/packages/bookkeeping-core";
const HOST_DIR = "src/modules/bookkeeping";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function sourcesIn(dir: string) {
  const files = walk(dir).filter((f) => /\.tsx?$/.test(f));
  return new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
}

const core = sourcesIn(CORE_DIR);
const host = sourcesIn(HOST_DIR);

describe("shared bookkeeping core boundary", () => {
  it("has the extracted files to inspect", () => {
    expect(core.size).toBeGreaterThan(8);
    expect(host.size).toBeGreaterThan(3);
  });

  it("never imports a host database client, server function or host module", () => {
    for (const [file, src] of core) {
      expect.soft(src, file).not.toMatch(/@\/integrations\//);
      expect.soft(src, file).not.toMatch(/bookkeeping\.functions/);
      expect.soft(src, file).not.toMatch(/@\/modules\//);
      expect.soft(src, file).not.toMatch(/@\/hooks\//);
      expect.soft(src, file).not.toMatch(/@\/lib\//);
    }
  });

  it("never imports app routing, navigation or the workspace shell", () => {
    for (const [file, src] of core) {
      expect.soft(src, file).not.toMatch(/@tanstack\/react-router/);
      expect.soft(src, file).not.toMatch(/@tanstack\/react-start/);
      expect.soft(src, file).not.toMatch(/@\/components\/app-shell/);
      expect.soft(src, file).not.toMatch(/@\/hooks\/use-workspace/);
    }
  });

  it("never names a host domain table or a bookkeeping table directly", () => {
    for (const [file, src] of core) {
      expect.soft(src, file).not.toMatch(/\.from\(["']/);
      expect.soft(src, file).not.toMatch(/["'](properties|capex_projects|bank_transactions)["']/);
    }
  });

  it("only imports shadcn primitives and its own modules from outside", () => {
    for (const [file, src] of core) {
      const imports = [...src.matchAll(/from ["']([^"']+)["']/g)].map((m) => m[1]!);
      for (const imported of imports) {
        const ok =
          imported.startsWith(".") ||
          imported.startsWith("@/components/ui/") ||
          !imported.startsWith("@/");
        expect.soft(ok, `${file} imports ${imported}`).toBe(true);
      }
    }
  });

  it("exposes no client-side destructive delete of accounting history", () => {
    for (const [file, src] of [...core, ...host]) {
      if (file.endsWith("bookkeeping.functions.ts")) continue;
      expect.soft(src, file).not.toMatch(/\.delete\(\)/);
      expect.soft(src, file).not.toMatch(/\.rpc\(\s*["'][^"']*delete/);
    }
  });
});

describe("Pedra Rioja host adapters", () => {
  it("keeps every real-estate dimension inside the host adapter layer", () => {
    const adapters = host.get(join(HOST_DIR, "host", "adapters.ts"))!;
    expect(adapters).toMatch(/from\("properties"\)/);
    expect(adapters).toMatch(/from\("capex_projects"\)/);
  });

  it("implements the full server contract from authenticated server functions", () => {
    const server = host.get(join(HOST_DIR, "host", "server.ts"))!;
    for (const op of [
      "createCounterparty",
      "updateCounterparty",
      "archiveCounterparty",
      "createDocument",
      "updateDocument",
      "postDocument",
      "cancelDocument",
      "settleDocument",
      "reversePayment",
      "createClassification",
      "upsertBankRule",
      "createPeriod",
      "recomputePeriodTotals",
      "closePeriod",
      "reopenPeriod",
    ]) {
      expect.soft(server, op).toMatch(new RegExp(`${op}:`));
    }
  });

  it("only deletes draft document lines on the server, never a document or a payment", () => {
    const server = host.get(join(HOST_DIR, "bookkeeping.functions.ts"))!;
    const deletes = [...server.matchAll(/\.from\("([a-z_]+)"\)\s*\.delete\(\)/g)].map((m) => m[1]);
    // `document_links` rows are evidence links, not accounting records: detaching
    // a document removes the link only, never the document or its amounts.
    expect(new Set(deletes)).toEqual(new Set(["financial_document_lines", "document_links"]));
    expect(server).not.toMatch(/from\("financial_documents"\)[\s\S]{0,40}\.delete\(\)/);
    expect(server).not.toMatch(/from\("financial_payments"\)[\s\S]{0,40}\.delete\(\)/);
  });

  it("keeps every server function company-scoped or document-scoped", () => {
    const server = host.get(join(HOST_DIR, "bookkeeping.functions.ts"))!;
    expect(server).toMatch(/requireSupabaseAuth/);
    const handlers = server.split("= createServerFn").slice(1);
    expect(handlers.length).toBeGreaterThan(10);
    for (const handler of handlers) {
      expect(handler.slice(0, 400)).toMatch(/middleware\(\[requireSupabaseAuth\]\)/);
    }
  });
});
