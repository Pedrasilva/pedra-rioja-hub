/**
 * Live rent roll — one row per let unit, derived entirely from `v_rent_roll`.
 *
 * Nothing here is recalculated or persisted: rent, service charge, annual rent,
 * expiry distance, review and break dates all arrive from the view. The client
 * only filters, sorts and totals what the database already decided.
 */

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatArea, formatDate, formatMoneyPrecise, titleCase } from "@/lib/format";
import type { RentRollRow } from "@/modules/leases/queries";
import { LEASE_STATUSES, OCCUPANCY_STATUSES } from "@/modules/leases/schemas";

const ALL = "all";

type SortKey = "property_name" | "unit_code" | "tenant_name" | "rent" | "annual_rent" | "end_date";

const HORIZONS: { value: string; label: string; days: number }[] = [
  { value: "90", label: "Next 90 days", days: 90 },
  { value: "180", label: "Next 6 months", days: 180 },
  { value: "365", label: "Next 12 months", days: 365 },
];

function withinDays(date: string | null | undefined, days: number) {
  if (!date) return false;
  const diff = (new Date(date).getTime() - Date.now()) / 86_400_000;
  return diff >= 0 && diff <= days;
}

export function RentRollTable({ rows }: { rows: RentRollRow[] }) {
  const [search, setSearch] = useState("");
  const [property, setProperty] = useState(ALL);
  const [tenant, setTenant] = useState(ALL);
  const [leaseStatus, setLeaseStatus] = useState(ALL);
  const [occupancy, setOccupancy] = useState(ALL);
  const [expiry, setExpiry] = useState(ALL);
  const [review, setReview] = useState(ALL);
  const [breakDate, setBreakDate] = useState(ALL);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({
    key: "property_name",
    asc: true,
  });

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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (property !== ALL && r.property_id !== property) return false;
      if (tenant !== ALL && r.tenant_id !== tenant) return false;
      if (leaseStatus !== ALL && r.lease_status !== leaseStatus) return false;
      if (occupancy !== ALL && r.occupancy_status !== occupancy) return false;
      if (expiry !== ALL && !withinDays(r.end_date, Number(expiry))) return false;
      if (review !== ALL && !withinDays(r.next_review_date, Number(review))) return false;
      if (breakDate !== ALL && !withinDays(r.next_break_date, Number(breakDate))) return false;
      if (!q) return true;
      return [r.property_name, r.unit_code, r.tenant_name, r.lease_code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const dir = sort.asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, search, property, tenant, leaseStatus, occupancy, expiry, review, breakDate, sort]);

  const totals = visible.reduce(
    (acc, r) => ({
      rent: acc.rent + (r.rent ?? 0),
      service: acc.service + (r.service_charge ?? 0),
      annual: acc.annual + (r.annual_rent ?? 0),
    }),
    { rent: 0, service: 0, annual: 0 },
  );
  const currency = visible[0]?.currency ?? "EUR";

  const sortButton = (key: SortKey, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-auto px-2 py-1 font-medium"
      onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))}
    >
      {label}
      {sort.key === key ? (sort.asc ? " ↑" : " ↓") : ""}
    </Button>
  );

  return (
    <Card>
      <CardHeader className="gap-4">
        <div>
          <CardTitle className="font-display">Rent roll</CardTitle>
          <CardDescription>
            Every figure is derived from the active lease version — nothing on this screen is
            stored.
          </CardDescription>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search property, unit or tenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search the rent roll"
          />
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
          <Select value={leaseStatus} onValueChange={setLeaseStatus}>
            <SelectTrigger aria-label="Filter by lease status">
              <SelectValue placeholder="Lease status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All lease statuses</SelectItem>
              {LEASE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={occupancy} onValueChange={setOccupancy}>
            <SelectTrigger aria-label="Filter by occupancy">
              <SelectValue placeholder="Occupancy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All occupancy states</SelectItem>
              {OCCUPANCY_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger aria-label="Filter by expiry">
              <SelectValue placeholder="Expiry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any expiry</SelectItem>
              {HORIZONS.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  Expiring {h.label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={review} onValueChange={setReview}>
            <SelectTrigger aria-label="Filter by rent review">
              <SelectValue placeholder="Rent review" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any review date</SelectItem>
              {HORIZONS.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  Review {h.label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={breakDate} onValueChange={setBreakDate}>
            <SelectTrigger aria-label="Filter by break date">
              <SelectValue placeholder="Break date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any break date</SelectItem>
              {HORIZONS.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  Break {h.label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "No let units yet. Activate a lease version to populate the rent roll."
              : "No rent-roll rows match this filter."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sortButton("property_name", "Property")}</TableHead>
                <TableHead>{sortButton("unit_code", "Unit")}</TableHead>
                <TableHead>{sortButton("tenant_name", "Tenant")}</TableHead>
                <TableHead>Lease</TableHead>
                <TableHead className="text-right">{sortButton("rent", "Rent")}</TableHead>
                <TableHead className="text-right">Service charge</TableHead>
                <TableHead className="text-right">Area</TableHead>
                <TableHead>{sortButton("end_date", "Term")}</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Break</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
                <TableHead>Occupancy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.rent_roll_id}>
                  <TableCell>
                    <Link
                      to="/properties/$propertyId"
                      params={{ propertyId: r.property_id }}
                      className="underline-offset-4 hover:underline"
                    >
                      {r.property_name ?? "Property"}
                    </Link>
                  </TableCell>
                  <TableCell>{r.unit_code ?? "—"}</TableCell>
                  <TableCell>
                    {r.tenant_id ? (
                      <Link
                        to="/tenants/$tenantId"
                        params={{ tenantId: r.tenant_id }}
                        className="underline-offset-4 hover:underline"
                      >
                        {r.tenant_name ?? "Tenant"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/leases/$leaseId"
                      params={{ leaseId: r.lease_id }}
                      className="underline-offset-4 hover:underline"
                    >
                      {r.lease_code ?? "Lease"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(r.rent, r.currency ?? "EUR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(r.service_charge, r.currency ?? "EUR")}
                  </TableCell>
                  <TableCell className="text-right">{formatArea(r.area_m2)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(r.start_date)} → {formatDate(r.end_date)}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(r.next_review_date)}</TableCell>
                  <TableCell className="text-sm">{formatDate(r.next_break_date)}</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(r.deposit_amount, r.currency ?? "EUR")}
                  </TableCell>
                  <TableCell>{titleCase(r.occupancy_status)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="font-medium">
                  Total ({visible.length} units · {formatMoneyPrecise(totals.annual, currency)} per
                  year)
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatMoneyPrecise(totals.rent, currency)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatMoneyPrecise(totals.service, currency)}
                </TableCell>
                <TableCell colSpan={6} />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
