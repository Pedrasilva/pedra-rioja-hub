/**
 * Phase 8E — payload helpers shared by the lease server functions.
 *
 * Kept out of the *.functions.ts module so that file stays a thin wrapper
 * (server-function splitting removes runtime siblings from that module).
 */

/** Drops undefined/null/empty values so the database keeps its own defaults. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}
