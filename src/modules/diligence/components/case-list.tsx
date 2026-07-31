/**
 * Phase 8F.3 — due-diligence register.
 *
 * Progress and blocking counts come straight from the derived view.
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
import { formatDate } from "@/lib/format";
import type { DiligenceCase } from "@/modules/diligence/queries";
import { DILIGENCE_STATUSES } from "@/modules/diligence/schemas";
import { CaseStatusBadge, RecommendationBadge } from "./status-badge";

export function DiligenceCaseList({ rows }: { rows: DiligenceCase[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return [r.reference, r.title, r.opportunity_reference, r.opportunity_title].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    });
  }, [rows, search, status]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Due-diligence cases</CardTitle>
        <div className="flex flex-wrap gap-2 pt-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases…"
            className="h-9 w-56"
            aria-label="Search due-diligence cases"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-48" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {DILIGENCE_STATUSES.map((s) => (
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
            No due-diligence case matches this view.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead className="text-right">Blocking left</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.case_id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/due-diligence/$caseId"
                      params={{ caseId: row.case_id }}
                      className="underline-offset-4 hover:underline"
                    >
                      {row.reference}
                    </Link>
                    <div className="text-xs text-muted-foreground">{row.title}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.opportunity_reference}
                    <div className="text-xs text-muted-foreground">{row.opportunity_title}</div>
                  </TableCell>
                  <TableCell>
                    <CaseStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <RecommendationBadge recommendation={row.recommendation} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.done_count}/{row.item_count} ({row.progress_pct}%)
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.blocking_outstanding}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(row.target_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
