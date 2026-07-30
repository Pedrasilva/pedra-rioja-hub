/**
 * Phase 8D — investment metrics.
 *
 * Read-only presentation of `v_investment_metrics`. Every ratio is computed in
 * the database; this component only formats and flags thresholds.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import type { InvestmentMetricRow } from "@/modules/executive/queries";

function dscrTone(value: number | null) {
  if (value === null) return "outline" as const;
  if (value < 1) return "destructive" as const;
  if (value < 1.25) return "secondary" as const;
  return "default" as const;
}

function ltvTone(value: number | null) {
  if (value === null) return "outline" as const;
  if (value > 80) return "destructive" as const;
  if (value > 60) return "secondary" as const;
  return "default" as const;
}

export function InvestmentMetricsPanel({
  rows,
  currency,
  isLoading,
}: {
  rows: InvestmentMetricRow[];
  currency: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment metrics</CardTitle>
        <CardDescription>
          DSCR, loan-to-value and cash-on-cash per financing agreement, derived from valuations,
          outstanding principal and the last twelve months of settled cash flow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Valuation</TableHead>
              <TableHead className="text-right">NOI (12m)</TableHead>
              <TableHead className="text-right">Debt service (12m)</TableHead>
              <TableHead className="text-right">DSCR</TableHead>
              <TableHead className="text-right">LTV</TableHead>
              <TableHead className="text-right">Cash-on-cash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9}>Loading metrics…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  No financing agreements yet — metrics appear once debt is recorded.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.agreement_id ?? `${row.property_id}`}>
                  <TableCell className="font-medium">{row.property_name ?? "—"}</TableCell>
                  <TableCell>{row.lender ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.outstanding_principal, row.currency ?? currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.current_valuation, row.currency ?? currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.net_operating_income_12m, row.currency ?? currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.debt_service_paid_12m, row.currency ?? currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={dscrTone(row.dscr)}>
                      {row.dscr === null ? "—" : formatNumber(row.dscr, 2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={ltvTone(row.ltv_pct)}>
                      {row.ltv_pct === null ? "—" : formatPercent(row.ltv_pct)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.cash_on_cash_pct === null ? "—" : formatPercent(row.cash_on_cash_pct)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
