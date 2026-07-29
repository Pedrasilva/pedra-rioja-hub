/**
 * Commitment register — the searchable list of authorised spend.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

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
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import type { CommitmentSummary } from "@/modules/commitments/queries";
import { COMMITMENT_STATUSES, COMMITMENT_TYPES, labelOf } from "@/modules/commitments/schemas";
import { StatusBadge } from "./status-badge";

export function CommitmentList({ rows }: { rows: CommitmentSummary[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (type !== "all" && r.commitment_type !== type) return false;
      if (!q) return true;
      return [r.title, r.code, r.counterparty_name].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    });
  }, [rows, search, status, type]);

  const totals = visible.reduce(
    (acc, r) => ({
      authorised: acc.authorised + Number(r.authorised_amount),
      committed: acc.committed + Number(r.approved_committed_amount),
      invoiced: acc.invoiced + Number(r.invoiced_amount),
      remaining: acc.remaining + Number(r.remaining_commitment),
    }),
    { authorised: 0, committed: 0, invoiced: 0, remaining: 0 },
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commitments</CardTitle>
        <CardDescription>
          Every authorised promise to spend, and how much of it has been consumed.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          <Input
            className="w-56"
            placeholder="Search title, code or counterparty"
            aria-label="Search commitments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {COMMITMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {labelOf(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-48" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {COMMITMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {labelOf(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commitments match these filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commitment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="text-right">Authorised</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.commitment_id}>
                  <TableCell>
                    <Link
                      to="/commitments/$commitmentId"
                      params={{ commitmentId: r.commitment_id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.title}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {r.counterparty_name ?? "No counterparty"}
                      {r.end_date ? ` · ends ${formatDate(r.end_date)}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>{labelOf(r.commitment_type)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.approval_status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyPrecise(r.authorised_amount, r.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyPrecise(r.approved_committed_amount, r.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyPrecise(r.invoiced_amount, r.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyPrecise(r.remaining_commitment, r.currency)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      Number(r.unapproved_variance) > 0 ? "text-destructive" : ""
                    }`}
                  >
                    {formatMoneyPrecise(r.unapproved_variance, r.currency)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium">
                <TableCell colSpan={4}>Total ({visible.length})</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyPrecise(totals.authorised)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyPrecise(totals.committed)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyPrecise(totals.invoiced)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyPrecise(totals.remaining)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
