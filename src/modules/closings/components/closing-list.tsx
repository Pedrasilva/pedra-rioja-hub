/**
 * Phase 8F.4 — closing register.
 *
 * `agreed_price` is an indicative deal figure, never an accounting balance.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatDate, formatMoney } from "@/lib/format";
import type { ClosingCase } from "@/modules/closings/queries";
import { CLOSING_STATUSES } from "@/modules/closings/schemas";
import { ClosingStatusBadge, HandoverBadge } from "./status-badge";

export function ClosingList({ rows }: { rows: ClosingCase[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return [r.reference, r.title, r.opportunity_reference, r.notary_name].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    });
  }, [rows, search, status]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Closings</CardTitle>
        <div className="flex flex-wrap gap-2 pt-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search closings…"
            className="h-9 w-56"
            aria-label="Search closings"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-48" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CLOSING_STATUSES.map((s) => (
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
          <p className="py-8 text-center text-sm text-muted-foreground">
            No closing matches this view.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Conditions</TableHead>
                <TableHead>Handover</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Agreed price</TableHead>
                <TableHead>Property</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.closing_id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/closings/$closingId"
                      params={{ closingId: row.closing_id }}
                      className="underline-offset-4 hover:underline"
                    >
                      {row.reference}
                    </Link>
                    <div className="text-xs text-muted-foreground">{row.title}</div>
                  </TableCell>
                  <TableCell className="text-sm">{row.opportunity_reference}</TableCell>
                  <TableCell>
                    <ClosingStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.conditions_met}/{row.condition_count}
                  </TableCell>
                  <TableCell>
                    <HandoverBadge status={row.handover_status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(row.actual_completion_date ?? row.target_completion_date)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(row.agreed_price, row.currency)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.property_id ? (
                      <Link
                        to="/properties/$propertyId"
                        params={{ propertyId: row.property_id }}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.property_name ?? "View"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
