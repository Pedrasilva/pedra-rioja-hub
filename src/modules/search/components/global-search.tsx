/**
 * Phase 8D — global search palette.
 *
 * Presentation only: results, labels and destinations all come from the
 * database search index. Rows without a route render as non-navigable, so an
 * unknown entity type fails closed rather than guessing a link.
 */

import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatDate, titleCase } from "@/lib/format";
import { useGlobalSearch } from "@/modules/search/queries";

export function GlobalSearch({ companyId }: { companyId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const { data: hits = [], isFetching } = useGlobalSearch(companyId, term);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const groups = hits.reduce<Record<string, typeof hits>>((acc, hit) => {
    const key = hit.entity_type ?? "other";
    (acc[key] ??= []).push(hit);
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Search the portfolio"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search properties, documents, commitments, contracts…"
          value={term}
          onValueChange={setTerm}
        />
        <CommandList>
          <CommandEmpty>
            {term.trim().length < 2
              ? "Type at least two characters."
              : isFetching
                ? "Searching…"
                : "Nothing matched."}
          </CommandEmpty>
          {Object.entries(groups).map(([type, rows]) => (
            <CommandGroup key={type} heading={titleCase(type)}>
              {rows.map((hit) => (
                <CommandItem
                  key={`${type}-${hit.entity_id}`}
                  value={`${hit.title ?? ""} ${hit.subtitle ?? ""} ${hit.entity_id ?? ""}`}
                  disabled={!hit.url_path}
                  onSelect={() => {
                    if (!hit.url_path) return;
                    setOpen(false);
                    navigate({ to: hit.url_path });
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate">{hit.title ?? "Untitled"}</div>
                      {hit.subtitle ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {hit.subtitle}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(hit.occurred_at, "")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
