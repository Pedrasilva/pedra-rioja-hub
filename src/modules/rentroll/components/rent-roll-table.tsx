/**
 * Live rent roll — one row per let unit, derived entirely from `v_rent_roll`.
 */

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export function RentRollTable({ rows }: { rows: RentRollRow[] }) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.property_name, r.unit_code, r.tenant_name, r.lease_code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const totals = visible.reduce(
    (acc, r) => ({
      rent: acc.rent + (r.rent ?? 0),
      service: acc.service + (r.service_charge ?? 0),
      annual: acc.annual + (r.annual_rent ?? 0),
    }),
    { rent: 0, service: 0, annual: 0 },
  );
  const currency = visible[0]?.currency ?? "EUR";

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
        <Input
          placeholder="Search property, unit or tenant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search the rent roll"
        />
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No let units yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Lease</TableHead>
                <TableHead className="text-right">Rent</TableHead>
                <TableHead className="text-right">Service charge</TableHead>
                <TableHead className="text-right">Area</TableHead>
                <TableHead>Term</TableHead>
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
