/**
 * Capex financial summary.
 *
 * Projects own the budget and the business context; they never store spend.
 * Every money column below is read from `v_capex_summary`, which derives it
 * from commitments, documents and payments.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoneyPrecise, formatPercent } from "@/lib/format";
import type { CapexSummaryRow } from "@/modules/commitments/queries";
import { StatusBadge } from "./status-badge";

export function CapexPanel({ rows }: { rows: CapexSummaryRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Capex projects</CardTitle>
        <CardDescription>
          Budget is owned by the project. Committed, invoiced and paid figures are derived from the
          commitments and documents behind it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No capex projects yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="w-32">Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const currency = r.currency ?? "EUR";
                const over = Number(r.commitment_variance) > 0;
                return (
                  <TableRow key={r.project_id}>
                    <TableCell>
                      <span className="font-medium">{r.name}</span>
                      {r.property_name ? (
                        <span className="block text-xs text-muted-foreground">
                          {r.property_name}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyPrecise(r.budget_amount, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyPrecise(r.committed_amount, currency)}
                      <span className="block text-xs text-muted-foreground">
                        {r.active_commitments} active
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyPrecise(r.invoiced_amount, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyPrecise(r.paid_amount, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyPrecise(r.remaining_budget, currency)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${over ? "text-destructive" : ""}`}
                    >
                      {formatMoneyPrecise(r.commitment_variance, currency)}
                    </TableCell>
                    <TableCell>
                      <Progress value={Math.min(100, Math.max(0, Number(r.spend_pct ?? 0)))} />
                      <span className="text-xs text-muted-foreground">
                        {formatPercent(r.spend_pct)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
