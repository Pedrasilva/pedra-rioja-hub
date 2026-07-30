/**
 * Lease register — searchable, filterable list of lease contracts.
 * Presentation only: every figure comes from `v_lease_summary`.
 */

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import type { LeaseSummary } from "@/modules/leases/queries";
import { LEASE_STATUSES, LEASE_TYPES } from "@/modules/leases/schemas";

export function LeaseStatusBadge({ status }: { status: string }) {
  const variant =
    status === "active"
      ? "default"
      : status === "expiring" || status === "negotiation"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}

export function LeaseList({ rows }: { rows: LeaseSummary[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (type !== "all" && r.lease_type !== type) return false;
      if (!q) return true;
      return [r.code, r.title, r.tenant_name, r.property_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, status, type]);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div>
          <CardTitle className="font-display">Lease register</CardTitle>
          <CardDescription>
            Operational contracts. Rent shown here is a contract term; money is owned by
            bookkeeping and banking.
          </CardDescription>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            placeholder="Search lease, tenant or property…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search leases"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEASE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label="Filter by lease type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {LEASE_TYPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leases match this filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lease</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Rent</TableHead>
                <TableHead className="text-right">Area</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Next review</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.lease_id}>
                  <TableCell>
                    <Link
                      to="/leases/$leaseId"
                      params={{ leaseId: r.lease_id }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {r.code ?? r.title ?? "Lease"}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {titleCase(r.lease_type)} · v{r.version_no ?? 1}
                    </div>
                  </TableCell>
                  <TableCell>{r.property_name ?? "—"}</TableCell>
                  <TableCell>{r.tenant_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(r.total_periodic_charge, r.currency ?? "EUR")}
                    <div className="text-xs text-muted-foreground">
                      {titleCase(r.payment_frequency)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatArea(r.total_area_m2)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(r.start_date)} →{" "}
                    {r.is_open_ended ? "open-ended" : formatDate(r.end_date)}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(r.next_review_date)}</TableCell>
                  <TableCell>
                    <LeaseStatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
