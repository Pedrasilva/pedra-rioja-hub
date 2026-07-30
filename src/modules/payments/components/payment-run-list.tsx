/**
 * Payment run register — every settlement session and where it stands.
 *
 * Totals are read from the derived view, which sums the outstanding amounts on
 * the invoices behind each instruction. Nothing is recomputed here.
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
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import type { PaymentRunSummary } from "@/modules/payments/queries";
import { PAYMENT_RUN_STATUSES } from "@/modules/payments/schemas";
import { RunStatusBadge } from "./status-badge";

export function PaymentRunList({ rows }: { rows: PaymentRunSummary[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return [r.reference, r.title, r.description].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [rows, search, status]);

  const outstanding = visible.reduce((sum, r) => sum + Number(r.outstanding_total ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Payment runs</CardTitle>
        <div className="flex flex-wrap gap-2 pt-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search runs…"
            className="h-9 w-56"
            aria-label="Search payment runs"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-48" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PAYMENT_RUN_STATUSES.map((s) => (
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
            No payment runs yet. Create one to group approved supplier invoices for settlement.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.payment_run_id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/payments/$runId"
                      params={{ runId: r.payment_run_id }}
                      className="hover:underline"
                    >
                      {r.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>
                    <RunStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>{formatDate(r.scheduled_execution_date)}</TableCell>
                  <TableCell className="text-right">{r.instruction_count}</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(r.outstanding_total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} className="text-right text-sm text-muted-foreground">
                  Total outstanding in view
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatMoneyPrecise(outstanding)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
