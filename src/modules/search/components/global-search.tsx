/**
 * Phase 8D — global search palette.
 *
 * Presentation only: results, labels and destinations all come from the
 * database search index. Every indexed row carries a route to a live
 * workspace, so results are navigable; a row is only disabled when the index
 * genuinely has no destination for it.
 */

import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  FileSignature,
  FileText,
  Handshake,
  Hammer,
  Landmark,
  PieChart,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

const ENTITY_LABELS: Record<string, string> = {
  property: "Properties",
  document: "Documents",
  financing: "Financing",
  tenant: "Tenants",
  lease: "Leases",
  project: "Projects",
  commitment: "Commitments",
  budget: "Budgets",
  maintenance_schedule: "Preventive schedules",
  maintenance_job: "Maintenance jobs",
  counterparty: "Counterparties",
};

const ENTITY_ICONS: Record<string, LucideIcon> = {
  property: Building2,
  document: FileText,
  financing: Landmark,
  tenant: Users,
  lease: FileSignature,
  project: Hammer,
  commitment: Handshake,
  budget: PieChart,
  maintenance_schedule: CalendarClock,
  maintenance_job: Wrench,
  counterparty: Users,
};

export function GlobalSearch({ companyId }: { companyId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const { data: hits = [], isFetching, isError } = useGlobalSearch(companyId, term);

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
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Portfolio search"
        description="Search properties, documents, commitments, budgets, maintenance and counterparties"
      >
        <CommandInput
          placeholder="Search properties, documents, commitments, contracts…"
          value={term}
          onValueChange={setTerm}
        />
        <CommandList>
          <CommandEmpty>
            {term.trim().length < 2
              ? "Type at least two characters."
              : isError
                ? "Search is unavailable right now."
                : isFetching
                  ? "Searching…"
                  : "Nothing matched."}
          </CommandEmpty>
          {Object.entries(groups).map(([type, rows]) => {
            const Icon = ENTITY_ICONS[type] ?? ClipboardList;
            return (
              <CommandGroup key={type} heading={ENTITY_LABELS[type] ?? titleCase(type)}>
                {rows.map((hit) => (
                  <CommandItem
                    key={`${type}-${hit.entity_id}`}
                    value={`${hit.title ?? ""} ${hit.subtitle ?? ""} ${hit.entity_id ?? ""}`}
                    disabled={!hit.url_path}
                    onSelect={() => {
                      if (!hit.url_path) return;
                      setOpen(false);
                      navigate({ href: hit.url_path });
                    }}
                  >
                    <div className="flex w-full items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{hit.title ?? "Untitled"}</span>
                          {hit.is_archived ? (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              Archived
                            </Badge>
                          ) : null}
                        </div>
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
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
