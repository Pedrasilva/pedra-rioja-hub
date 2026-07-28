import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!url || !serviceKey) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run the database tests");
}

/** Admin client: bypasses RLS. Used for fixtures and trigger/view assertions. */
export const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
});

/** Anonymous client: no session, used to prove protected data is unreachable. */
export function anonClient(): SupabaseClient {
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(accessToken: string): SupabaseClient {
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export const authAdminUrl = `${url}/auth/v1/admin`;
export const authUrl = `${url}/auth/v1`;
export const serviceRoleKey = serviceKey;
export const anonKey = publishableKey;

/** Read-only SQL introspection (index/trigger definitions) via psql. */
export function sqlRows(query: string): string[] {
  if (!dbUrl) throw new Error("SUPABASE_DB_URL is required for schema introspection tests");
  const out = execFileSync("psql", [dbUrl, "-Atc", query], { encoding: "utf8" });
  return out.split("\n").filter((line) => line.length > 0);
}

export function expectNoError(result: { error: unknown }, what: string) {
  if (result.error) {
    throw new Error(`${what}: ${JSON.stringify(result.error)}`);
  }
}
