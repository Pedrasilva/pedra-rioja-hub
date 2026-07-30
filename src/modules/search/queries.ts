/**
 * Phase 8D — cross-entity search.
 *
 * Reads the database-owned `v_search_index`, which already carries the entity
 * type, a display title, a subtitle and the route that addresses the record.
 * The client never guesses a route for an unknown entity type.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SearchHit = {
  company_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  title: string | null;
  subtitle: string | null;
  url_path: string | null;
  occurred_at: string | null;
  status: string | null;
  is_archived: boolean | null;
  property_id: string | null;
};

export function useGlobalSearch(companyId: string | undefined, term: string) {
  const query = term.trim();
  return useQuery({
    queryKey: ["global-search", companyId, query],
    enabled: Boolean(companyId) && query.length >= 2,
    queryFn: async () => {
      const escaped = query.replace(/[%,()]/g, " ").trim();
      const { data, error } = await supabase
        .from("v_search_index")
        .select(
          "company_id, entity_type, entity_id, title, subtitle, url_path, occurred_at, status, is_archived, property_id",
        )
        .eq("company_id", companyId!)
        .ilike("search_text", `%${escaped}%`)
        .order("occurred_at", { ascending: false, nullsFirst: false })
        .limit(40);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SearchHit[];
    },
  });
}
