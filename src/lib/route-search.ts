/**
 * Shared search-param contract for workspace routes that host tabbed
 * registers. Cross-entity search links carry `?tab=` (which tab holds the
 * record) and `?record=` (which record was searched for), so every result can
 * point at a real route instead of a dead per-entity URL.
 */

export type WorkspaceSearch = {
  tab?: string;
  record?: string;
};

export function validateWorkspaceSearch(search: Record<string, unknown>): WorkspaceSearch {
  return {
    tab: typeof search.tab === "string" ? search.tab : undefined,
    record: typeof search.record === "string" ? search.record : undefined,
  };
}

/** Returns `tab` when it names a known tab, otherwise the fallback. */
export function resolveTab(
  tab: string | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  return tab && allowed.includes(tab) ? tab : fallback;
}
