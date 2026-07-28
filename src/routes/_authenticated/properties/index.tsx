import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, LayoutGrid, Plus, Rows3, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { hasAnyRole, useWorkspace } from "@/hooks/use-workspace";
import { formatArea, formatDate, formatMoney, formatPercent, titleCase } from "@/lib/format";
import {
  ARCHIVED_STATUSES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from "@/modules/realestate/constants";
import { fullAddress, usePropertyRegister, type RegisterProperty } from "@/modules/realestate/queries";

export const Route = createFileRoute("/_authenticated/properties/")({
  head: () => ({
    meta: [
      { title: "Property register — Pedra Rioja" },
      {
        name: "description",
        content:
          "Every property in the Pedra Rioja portfolio with valuation, debt, equity, rent and occupancy derived live from the register.",
      },
      { property: "og:title", content: "Property register — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Every property in the Pedra Rioja portfolio with valuation, debt, equity, rent and occupancy derived live from the register.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertyRegisterPage,
});

type SortKey = "code" | "name" | "valuation" | "equity" | "rent" | "acquired";

function PropertyRegisterPage() {
  const { data: workspace } = useWorkspace();
  const canCreate = hasAnyRole(workspace?.roles, ["owner", "manager"]);
  const currency = workspace?.company?.base_currency ?? "EUR";

  const { data: properties, isLoading } = usePropertyRegister(workspace?.company?.id);

  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("code");
  const [showArchived, setShowArchived] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = (properties ?? []).filter((p) => {
      if (!showArchived && ARCHIVED_STATUSES.includes(p.status)) return false;
      if (type !== "all" && p.property_type !== type) return false;
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return [p.code, p.name, p.city, p.district, fullAddress(p), p.activeTenantName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const num = (v: unknown) => (v === null || v === undefined ? -Infinity : Number(v));
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "valuation":
          return num(b.summary?.current_valuation) - num(a.summary?.current_valuation);
        case "equity":
          return num(b.summary?.estimated_equity) - num(a.summary?.estimated_equity);
        case "rent":
          return num(b.summary?.monthly_rent) - num(a.summary?.monthly_rent);
        case "acquired":
          return (b.acquisition_date ?? "").localeCompare(a.acquisition_date ?? "");
        default:
          return (a.code ?? "").localeCompare(b.code ?? "");
      }
    });
  }, [properties, search, type, status, sort, showArchived]);

  return (
    <AppShell
      title="Property register"
      description="Every asset in the portfolio. Valuation, debt, equity, rent and occupancy are derived from the register — never typed in."
      actions={
        canCreate ? (
          <Button asChild size="sm">
            <Link to="/properties/new">
              <Plus className="size-4" /> New property
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, address or tenant"
            className="pl-9"
            aria-label="Search properties"
          />
        </div>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44" aria-label="Filter by type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {PROPERTY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROPERTY_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-48" aria-label="Sort properties">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="code">Sort: code</SelectItem>
            <SelectItem value="name">Sort: name</SelectItem>
            <SelectItem value="valuation">Sort: valuation</SelectItem>
            <SelectItem value="equity">Sort: equity</SelectItem>
            <SelectItem value="rent">Sort: rent</SelectItem>
            <SelectItem value="acquired">Sort: acquired</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
          <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="archived" className="text-sm text-muted-foreground">
            Show archived
          </Label>
        </div>

        <div className="flex rounded-md border border-border p-0.5">
          <Button
            variant={view === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("cards")}
            aria-label="Card view"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
            aria-label="Table view"
          >
            <Rows3 className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState hasAny={Boolean(properties?.length)} canCreate={canCreate} />
      ) : view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <PropertyCard key={p.id} property={p} currency={currency} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valuation</TableHead>
                  <TableHead className="text-right">Debt</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                  <TableHead className="text-right">Rent / mo</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">
                      <Link to="/properties/$propertyId" params={{ propertyId: p.id }}>
                        {p.code ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/properties/$propertyId"
                        params={{ propertyId: p.id }}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{fullAddress(p) || "No address"}</p>
                    </TableCell>
                    <TableCell className="text-sm">{titleCase(p.property_type)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(p.summary?.current_valuation, currency, "Not valued")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(p.summary?.outstanding_debt, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(p.summary?.estimated_equity, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(p.summary?.monthly_rent, currency)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.summary?.occupancy_pct === null || p.summary?.occupancy_pct === undefined
                        ? "No units"
                        : formatPercent(p.summary.occupancy_pct)}
                    </TableCell>
                    <TableCell className="text-sm">{p.activeTenantName ?? "Vacant"}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.activeProjects}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Showing {rows.length} of {properties?.length ?? 0} properties · figures derived from
        v_property_summary
      </p>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = PROPERTY_STATUSES.find((s) => s.value === status)?.label ?? titleCase(status);
  const variant = ARCHIVED_STATUSES.includes(status) ? "outline" : "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}

function PropertyCard({ property: p, currency }: { property: RegisterProperty; currency: string }) {
  return (
    <Link to="/properties/$propertyId" params={{ propertyId: p.id }} className="group">
      <Card className="h-full overflow-hidden py-0 transition-shadow group-hover:shadow-md">
        <div className="flex h-32 items-center justify-center border-b border-border bg-muted">
          <Building2 className="size-8 text-muted-foreground/50" />
        </div>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">{p.code ?? "—"}</p>
              <h2 className="truncate font-display text-lg font-semibold">{p.name}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {fullAddress(p) || "No address recorded"}
              </p>
            </div>
            <StatusBadge status={p.status} />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5">{titleCase(p.property_type)}</span>
            <span className="rounded bg-muted px-2 py-0.5">
              {p.summary?.occupancy_pct === null || p.summary?.occupancy_pct === undefined
                ? "No units"
                : `${formatPercent(p.summary.occupancy_pct)} let`}
            </span>
            {p.gross_area_m2 ? (
              <span className="rounded bg-muted px-2 py-0.5">{formatArea(p.gross_area_m2)}</span>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
            <Metric label="Valuation" value={formatMoney(p.summary?.current_valuation, currency, "Not valued")} />
            <Metric label="Debt" value={formatMoney(p.summary?.outstanding_debt, currency)} />
            <Metric label="Equity" value={formatMoney(p.summary?.estimated_equity, currency)} />
            <Metric label="Rent / mo" value={formatMoney(p.summary?.monthly_rent, currency)} />
          </dl>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{p.activeTenantName ? `Tenant: ${p.activeTenantName}` : "No active tenant"}</span>
            <span>
              {p.activeProjects} active project{p.activeProjects === 1 ? "" : "s"} ·{" "}
              {p.acquisition_date ? formatDate(p.acquisition_date) : "Not acquired"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function EmptyState({ hasAny, canCreate }: { hasAny: boolean; canCreate: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Building2 className="size-10 text-muted-foreground/40" />
        <h2 className="font-display text-xl font-semibold">
          {hasAny ? "No properties match these filters" : "The register is empty"}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {hasAny
            ? "Clear the search or filters, or enable archived properties to see disposed assets."
            : "Add the first property to generate its PR-code, Drive folder plan and timeline spine."}
        </p>
        {!hasAny && canCreate ? (
          <Button asChild className="mt-2">
            <Link to="/properties/new">
              <Plus className="size-4" /> Add a property
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
