/**
 * Phase 8E — occupancy board.
 *
 * Reads the database-owned `v_unit_occupancy` view plus `vacancy_periods` and
 * `occupancy_history`. It introduces no second source of truth for occupancy
 * and owns no money: every figure shown here (target rent) belongs to the
 * vacancy record it came from, and contracted rent is only ever read from the
 * rent roll.
 */

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatArea, formatDate, formatMoneyPrecise, titleCase } from "@/lib/format";
import {
  useOccupancyHistory,
  useUnitOccupancy,
  useVacancyPeriods,
  type UnitOccupancyRow,
} from "@/modules/leases/queries";
import { OCCUPANCY_STATUSES } from "@/modules/leases/schemas";

const ALL = "all";
type Row = Record<string, unknown>;
const str = (row: Row, key: string) => (row[key] == null ? null : String(row[key]));

export function OccupancyStatusBadge({ status }: { status: string | null }) {
  const variant =
    status === "occupied"
      ? "secondary"
      : status === "vacant"
        ? "destructive"
        : ("outline" as const);
  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}

export function OccupancyBoard({ companyId }: { companyId: string | undefined }) {
  const units = useUnitOccupancy(companyId);
  const vacancies = useVacancyPeriods(companyId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [property, setProperty] = useState<string>(ALL);
  const [tenant, setTenant] = useState<string>(ALL);
  const [lease, setLease] = useState<string>(ALL);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const rows = useMemo(() => units.data ?? [], [units.data]);

  const properties = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.property_id, r.property_name ?? "Property"));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const tenants = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => r.tenant_id && map.set(r.tenant_id, r.tenant_name ?? "Tenant"));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const leases = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.lease_id && set.add(r.lease_id));
    return [...set];
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== ALL && r.occupancy_status !== status) return false;
      if (property !== ALL && r.property_id !== property) return false;
      if (tenant !== ALL && r.tenant_id !== tenant) return false;
      if (lease !== ALL && r.lease_id !== lease) return false;
      if (!q) return true;
      return [r.property_name, r.unit_code, r.unit_name, r.tenant_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, status, property, tenant, lease]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; units: UnitOccupancyRow[] }>();
    visible.forEach((r) => {
      const entry = map.get(r.property_id) ?? { name: r.property_name ?? "Property", units: [] };
      entry.units.push(r);
      map.set(r.property_id, entry);
    });
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [visible]);

  if (units.isLoading) {
    return <Skeleton className="h-72 w-full" data-testid="occupancy-loading" />;
  }

  if (units.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          Occupancy could not be loaded. {(units.error as Error)?.message}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => units.refetch()}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const counts = OCCUPANCY_STATUSES.map((s) => ({
    ...s,
    count: rows.filter((r) => r.occupancy_status === s.value).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map((s) => (
          <Card key={s.value}>
            <CardContent className="pt-6">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{s.label}</p>
              <p className="mt-1 font-display text-xl font-semibold">{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle className="font-display">Occupancy board</CardTitle>
            <CardDescription>
              Current state of every unit, grouped by property. Occupancy is an operational
              record — it owns no money.
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              placeholder="Search property, unit or tenant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search occupancy"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {OCCUPANCY_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={property} onValueChange={setProperty}>
              <SelectTrigger aria-label="Filter by property">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All properties</SelectItem>
                {properties.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tenant} onValueChange={setTenant}>
              <SelectTrigger aria-label="Filter by tenant">
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All tenants</SelectItem>
                {tenants.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lease} onValueChange={setLease}>
              <SelectTrigger aria-label="Filter by lease">
                <SelectValue placeholder="Lease" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All leases</SelectItem>
                {leases.map((id) => (
                  <SelectItem key={id} value={id}>
                    {rows.find((r) => r.lease_id === id)?.tenant_name ?? id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No units match this filter. Add units to a property to start tracking occupancy.
            </p>
          ) : (
            grouped.map(([propertyId, group]) => (
              <section key={propertyId} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-base font-semibold">
                    <Link
                      to="/properties/$propertyId"
                      params={{ propertyId }}
                      className="underline-offset-4 hover:underline"
                    >
                      {group.name}
                    </Link>
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {group.units.length} unit{group.units.length === 1 ? "" : "s"}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Since</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Lease</TableHead>
                      <TableHead className="text-right">Area</TableHead>
                      <TableHead>Marketing</TableHead>
                      <TableHead className="text-right">Target rent</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.units.map((u) => (
                      <TableRow key={u.unit_id}>
                        <TableCell>
                          <Link
                            to="/properties/$propertyId"
                            params={{ propertyId: u.property_id }}
                            search={{ tab: "details", record: u.unit_id }}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {u.unit_code ?? u.unit_name ?? "Unit"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <OccupancyStatusBadge status={u.occupancy_status} />
                        </TableCell>
                        <TableCell>{formatDate(u.status_since)}</TableCell>
                        <TableCell>
                          {u.tenant_id ? (
                            <Link
                              to="/tenants/$tenantId"
                              params={{ tenantId: u.tenant_id }}
                              className="underline-offset-4 hover:underline"
                            >
                              {u.tenant_name ?? "Tenant"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {u.lease_id ? (
                            <Link
                              to="/leases/$leaseId"
                              params={{ leaseId: u.lease_id }}
                              className="underline-offset-4 hover:underline"
                            >
                              Lease
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatArea(u.area_m2)}</TableCell>
                        <TableCell>{titleCase(u.marketing_status)}</TableCell>
                        <TableCell className="text-right">
                          {u.target_rent == null ? "—" : formatMoneyPrecise(u.target_rent, "EUR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSelectedUnit((c) => (c === u.unit_id ? null : u.unit_id))
                            }
                          >
                            {selectedUnit === u.unit_id ? "Hide timeline" : "Timeline"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {group.units.some((u) => u.unit_id === selectedUnit) && selectedUnit ? (
                  <OccupancyTimeline unitId={selectedUnit} />
                ) : null}
              </section>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Vacancy periods</CardTitle>
          <CardDescription>
            Void history and marketing state. Target rents are aspirations, not obligations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vacancies.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : vacancies.isError ? (
            <p className="text-sm text-destructive">Vacancy periods could not be loaded.</p>
          ) : (vacancies.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No vacancy periods recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Marketing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(vacancies.data ?? []).map((v) => {
                  const unit = v.property_units as { code?: string; name?: string } | null;
                  return (
                    <TableRow key={str(v, "id")}>
                      <TableCell>{unit?.code ?? unit?.name ?? "Unit"}</TableCell>
                      <TableCell>{formatDate(str(v, "vacancy_start"))}</TableCell>
                      <TableCell>{formatDate(str(v, "vacancy_end"))}</TableCell>
                      <TableCell>{titleCase(str(v, "reason"))}</TableCell>
                      <TableCell>{titleCase(str(v, "marketing_status"))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OccupancyTimeline({ unitId }: { unitId: string }) {
  const { data = [], isLoading, isError } = useOccupancyHistory(unitId);
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (isError) return <p className="text-sm text-destructive">Timeline could not be loaded.</p>;
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground">No occupancy history for this unit.</p>;
  return (
    <ol className="space-y-2 border-l border-border pl-4">
      {data.map((h) => (
        <li key={str(h, "id")} className="text-sm">
          <span className="font-medium">{titleCase(str(h, "status"))}</span>{" "}
          <span className="text-muted-foreground">
            {formatDate(str(h, "period_start"))} → {formatDate(str(h, "period_end"))}
          </span>
          {str(h, "reason") ? (
            <span className="text-muted-foreground"> · {str(h, "reason")}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
