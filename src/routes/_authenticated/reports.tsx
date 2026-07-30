import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDate, formatMoney, formatNumber, formatPercent, titleCase } from "@/lib/format";
import { useCashFlowMonthly } from "@/modules/cashflow/queries";
import { EmptyHint, Kpi } from "@/modules/executive/components/kpi";
import { InvestmentMetricsPanel } from "@/modules/executive/components/investment-metrics";
import {
  useCapexSummary,
  useCounterpartyAgeing,
  useDebtSummary,
  useDocumentJournal,
  useIncomeStatement,
  useInvestmentMetrics,
  usePropertyProfitability,
  useVatSummary,
} from "@/modules/executive/queries";
import {
  downloadCsv,
  portfolioTotals,
  presetRange,
  RANGE_PRESETS,
  summariseIncomeStatement,
  xirr,
  type RangePreset,
} from "@/modules/executive/report-utils";
import { usePropertyRegister } from "@/modules/realestate/queries";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Management reporting — Pedra Rioja" },
      {
        name: "description",
        content:
          "Income statement, property profitability, cash flow, debt, CapEx, VAT and journals for the property portfolio.",
      },
      { property: "og:title", content: "Management reporting — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Income statement, property profitability, cash flow, debt, CapEx, VAT and journals for the property portfolio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const currency = workspace?.company?.base_currency ?? "EUR";
  const money = (v: number | null | undefined) => formatMoney(v ?? 0, currency);

  const [preset, setPreset] = useState<RangePreset>("ytd");
  const [propertyId, setPropertyId] = useState<string>("all");
  const range = useMemo(() => presetRange(preset), [preset]);
  const scoped = { ...range, propertyId: propertyId === "all" ? null : propertyId };

  const properties = usePropertyRegister(companyId);

  if (!companyId) {
    return (
      <AppShell title="Management reporting" description="No company assigned yet.">
        <EmptyHint>Ask the workspace owner to assign you to a company.</EmptyHint>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Management reporting"
      description="Every figure is derived from posted documents, confirmed schedules and reconciled bank movements."
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-44">
            <Label className="mb-1 text-xs text-muted-foreground">Period</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-52">
            <Label className="mb-1 text-xs text-muted-foreground">Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {(properties.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {formatDate(range.from)} — {formatDate(range.to)}
      </p>

      <Tabs defaultValue="income">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="income">Income statement</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
          <TabsTrigger value="debt">Debt</TabsTrigger>
          <TabsTrigger value="capex">CapEx</TabsTrigger>
          <TabsTrigger value="ageing">Ageing</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-4">
          <IncomeStatementTab companyId={companyId} range={scoped} money={money} />
        </TabsContent>
        <TabsContent value="profitability" className="mt-4">
          <ProfitabilityTab companyId={companyId} range={scoped} money={money} />
        </TabsContent>
        <TabsContent value="cashflow" className="mt-4">
          <CashFlowTab companyId={companyId} from={range.from} money={money} />
        </TabsContent>
        <TabsContent value="debt" className="mt-4">
          <DebtTab companyId={companyId} money={money} />
        </TabsContent>
        <TabsContent value="capex" className="mt-4">
          <CapexTab companyId={companyId} money={money} />
        </TabsContent>
        <TabsContent value="ageing" className="mt-4">
          <AgeingTab companyId={companyId} money={money} />
        </TabsContent>
        <TabsContent value="vat" className="mt-4">
          <VatTab companyId={companyId} range={scoped} money={money} />
        </TabsContent>
        <TabsContent value="journal" className="mt-4">
          <JournalTab companyId={companyId} range={scoped} money={money} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

type Money = (v: number | null | undefined) => string;
type Scoped = { from: string; to: string; propertyId: string | null };

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Download className="size-4" /> Export CSV
    </Button>
  );
}

function Panel({
  title,
  description,
  onExport,
  children,
}: {
  title: string;
  description: string;
  onExport?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="font-display text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {onExport ? <ExportButton onClick={onExport} /> : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------- income */

function IncomeStatementTab({
  companyId,
  range,
  money,
}: {
  companyId: string;
  range: Scoped;
  money: Money;
}) {
  const q = useIncomeStatement(companyId, range);
  const summary = useMemo(
    () => summariseIncomeStatement((q.data ?? []) as never),
    [q.data],
  );

  if (q.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Income" value={money(summary.totalIncome)} tone="positive" />
        <Kpi label="Costs" value={money(summary.totalCosts)} />
        <Kpi
          label="Operating result"
          value={money(summary.operatingResult)}
          tone={summary.operatingResult >= 0 ? "positive" : "negative"}
        />
        <Kpi label="Margin" value={formatPercent(summary.margin)} />
      </div>

      <Panel
        title="Operational income statement"
        description="Posted documents grouped by classification. Net of VAT."
        onExport={() =>
          downloadCsv(`income-statement-${range.from}-${range.to}`, [...summary.income, ...summary.costs], [
            { key: "bucket", label: "Bucket", value: (r) => r.bucket },
            { key: "code", label: "Code", value: (r) => r.code },
            { key: "name", label: "Classification", value: (r) => r.name },
            { key: "net", label: "Net", value: (r) => r.net.toFixed(2) },
            { key: "vat", label: "VAT", value: (r) => r.vat.toFixed(2) },
            { key: "gross", label: "Gross", value: (r) => r.gross.toFixed(2) },
          ])
        }
      >
        {summary.income.length === 0 && summary.costs.length === 0 ? (
          <EmptyHint>No posted documents in this period.</EmptyHint>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classification</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Gross</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/40">
                <TableCell colSpan={4} className="text-xs font-semibold uppercase">
                  Income
                </TableCell>
              </TableRow>
              {summary.income.map((l) => (
                <TableRow key={`i-${l.code}`}>
                  <TableCell>
                    <span className="text-muted-foreground">{l.code}</span> {l.name}
                  </TableCell>
                  <TableCell className="text-right">{money(l.net)}</TableCell>
                  <TableCell className="text-right">{money(l.vat)}</TableCell>
                  <TableCell className="text-right">{money(l.gross)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40">
                <TableCell colSpan={4} className="text-xs font-semibold uppercase">
                  Costs
                </TableCell>
              </TableRow>
              {summary.costs.map((l) => (
                <TableRow key={`c-${l.code}`}>
                  <TableCell>
                    <span className="text-muted-foreground">{l.code}</span> {l.name}
                  </TableCell>
                  <TableCell className="text-right">{money(l.net)}</TableCell>
                  <TableCell className="text-right">{money(l.vat)}</TableCell>
                  <TableCell className="text-right">{money(l.gross)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Operating result</TableCell>
                <TableCell className="text-right font-semibold">
                  {money(summary.operatingResult)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------ profitability */

function ProfitabilityTab({
  companyId,
  range,
  money,
}: {
  companyId: string;
  range: Scoped;
  money: Money;
}) {
  const q = usePropertyProfitability(companyId, range);
  const rows = (q.data ?? []).filter(
    (r) => !range.propertyId || r.property_id === range.propertyId,
  );
  const totals = portfolioTotals(rows as never);

  const irr = useMemo(() => {
    const invested = rows.reduce((s, r) => s + (r.acquisition_total || 0), 0);
    const flows = [
      { date: range.from, amount: -invested },
      { date: range.to, amount: totals.netCashFlow + totals.value - totals.debt },
    ];
    return invested > 0 ? xirr(flows) : null;
  }, [rows, range.from, range.to, totals]);

  if (q.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Income" value={money(totals.income)} tone="positive" />
        <Kpi label="Net operating income" value={money(totals.noi)} />
        <Kpi label="Net cash flow" value={money(totals.netCashFlow)} />
        <Kpi label="Gross yield" value={formatPercent(totals.grossYield)} />
        <Kpi label="Net yield" value={formatPercent(totals.netYield)} />
        <Kpi
          label="Portfolio IRR"
          value={irr === null ? "Insufficient data" : formatPercent(irr)}
          hint="Simplified: capital in versus equity and cash out"
        />
      </div>

      <Panel
        title="Profitability by property"
        description="Income, costs, yield and return on invested capital for the selected period."
        onExport={() =>
          downloadCsv(`profitability-${range.from}-${range.to}`, rows, [
            { key: "code", label: "Code", value: (r) => r.property_code },
            { key: "name", label: "Property", value: (r) => r.property_name },
            { key: "rent", label: "Rental income", value: (r) => r.rental_income.toFixed(2) },
            { key: "other", label: "Other income", value: (r) => r.other_income.toFixed(2) },
            { key: "opex", label: "Operating costs", value: (r) => r.operating_costs.toFixed(2) },
            { key: "fin", label: "Financing costs", value: (r) => r.financing_costs.toFixed(2) },
            { key: "capex", label: "CapEx", value: (r) => r.capex_spend.toFixed(2) },
            { key: "tax", label: "Taxes", value: (r) => r.taxes.toFixed(2) },
            { key: "noi", label: "NOI", value: (r) => r.net_operating_income.toFixed(2) },
            { key: "ncf", label: "Net cash flow", value: (r) => r.net_cash_flow.toFixed(2) },
            { key: "gy", label: "Gross yield %", value: (r) => r.gross_yield },
            { key: "ny", label: "Net yield %", value: (r) => r.net_yield },
            { key: "roi", label: "ROI %", value: (r) => r.roi },
          ])
        }
      >
        {rows.length === 0 ? (
          <EmptyHint>No property activity in this period.</EmptyHint>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Opex</TableHead>
                  <TableHead className="text-right">Financing</TableHead>
                  <TableHead className="text-right">CapEx</TableHead>
                  <TableHead className="text-right">NOI</TableHead>
                  <TableHead className="text-right">Net cash</TableHead>
                  <TableHead className="text-right">Gross yield</TableHead>
                  <TableHead className="text-right">Net yield</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.property_id}>
                    <TableCell>
                      <p className="font-medium">{r.property_name}</p>
                      <p className="text-xs text-muted-foreground">{r.property_code}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {money(r.rental_income + r.other_income)}
                    </TableCell>
                    <TableCell className="text-right">{money(r.operating_costs)}</TableCell>
                    <TableCell className="text-right">{money(r.financing_costs)}</TableCell>
                    <TableCell className="text-right">{money(r.capex_spend)}</TableCell>
                    <TableCell className="text-right">{money(r.net_operating_income)}</TableCell>
                    <TableCell
                      className={`text-right ${r.net_cash_flow < 0 ? "text-destructive" : ""}`}
                    >
                      {money(r.net_cash_flow)}
                    </TableCell>
                    <TableCell className="text-right">{formatPercent(r.gross_yield)}</TableCell>
                    <TableCell className="text-right">{formatPercent(r.net_yield)}</TableCell>
                    <TableCell className="text-right">{formatPercent(r.roi)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- cash flow */

function CashFlowTab({
  companyId,
  from,
  money,
}: {
  companyId: string;
  from: string;
  money: Money;
}) {
  const q = useCashFlowMonthly(companyId, from, 12, { scenario: "base" });
  const rows = q.data ?? [];

  if (q.isLoading) return <Skeleton className="h-64" />;

  return (
    <Panel
      title="Cash flow statement"
      description="Twelve months from the start of the selected period. Actual, reconciled, committed and forecast combined."
      onExport={() =>
        downloadCsv(`cash-flow-${from}`, rows, [
          { key: "month", label: "Month", value: (r) => r.month },
          { key: "opening", label: "Opening", value: (r) => r.opening_balance.toFixed(2) },
          { key: "in", label: "Inflows", value: (r) => r.inflows.toFixed(2) },
          { key: "out", label: "Outflows", value: (r) => r.outflows.toFixed(2) },
          { key: "fin", label: "Financing", value: (r) => r.financing.toFixed(2) },
          { key: "net", label: "Net movement", value: (r) => r.net_movement.toFixed(2) },
          { key: "close", label: "Closing", value: (r) => r.closing_balance.toFixed(2) },
          { key: "var", label: "Variance", value: (r) => r.variance.toFixed(2) },
        ])
      }
    >
      {rows.length === 0 ? (
        <EmptyHint>No cash-flow entries for this window.</EmptyHint>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">Financing</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Closing</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.month}>
                  <TableCell>{formatDate(r.month)}</TableCell>
                  <TableCell className="text-right">{money(r.opening_balance)}</TableCell>
                  <TableCell className="text-right">{money(r.inflows)}</TableCell>
                  <TableCell className="text-right">{money(r.outflows)}</TableCell>
                  <TableCell className="text-right">{money(r.financing)}</TableCell>
                  <TableCell
                    className={`text-right ${r.net_movement < 0 ? "text-destructive" : ""}`}
                  >
                    {money(r.net_movement)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      r.closing_balance < 0 ? "text-destructive" : ""
                    }`}
                  >
                    {money(r.closing_balance)}
                  </TableCell>
                  <TableCell className="text-right">{money(r.variance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- debt */

function DebtTab({ companyId, money }: { companyId: string; money: Money }) {
  const q = useDebtSummary(companyId);
  const rows = q.data ?? [];
  if (q.isLoading) return <Skeleton className="h-64" />;

  return (
    <Panel
      title="Debt summary"
      description="Position by lender: drawn, repaid, outstanding and remaining cost."
      onExport={() =>
        downloadCsv("debt-summary", rows, [
          { key: "lender", label: "Lender", value: (r) => r.lender },
          { key: "count", label: "Agreements", value: (r) => r.agreement_count },
          { key: "orig", label: "Original", value: (r) => r.original_principal.toFixed(2) },
          { key: "out", label: "Outstanding", value: (r) => r.outstanding_principal.toFixed(2) },
          { key: "interest", label: "Interest paid", value: (r) => r.interest_paid.toFixed(2) },
          { key: "remaining", label: "Remaining cost", value: (r) => r.remaining_total.toFixed(2) },
          { key: "rate", label: "Rate %", value: (r) => r.weighted_rate },
          { key: "next", label: "Next due", value: (r) => r.next_due_date },
          { key: "maturity", label: "Latest maturity", value: (r) => r.latest_maturity },
        ])
      }
    >
      {rows.length === 0 ? (
        <EmptyHint>No financing agreements recorded.</EmptyHint>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Interest paid</TableHead>
                <TableHead className="text-right">Remaining cost</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Next due</TableHead>
                <TableHead className="text-right">Maturity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.lender ?? "unknown"}>
                  <TableCell>
                    <p className="font-medium">{r.lender ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(r.agreement_count)} agreement
                      {r.agreement_count === 1 ? "" : "s"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">{money(r.original_principal)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {money(r.outstanding_principal)}
                  </TableCell>
                  <TableCell className="text-right">{money(r.interest_paid)}</TableCell>
                  <TableCell className="text-right">{money(r.remaining_total)}</TableCell>
                  <TableCell className="text-right">{formatPercent(r.weighted_rate)}</TableCell>
                  <TableCell className="text-right">{formatDate(r.next_due_date)}</TableCell>
                  <TableCell className="text-right">{formatDate(r.latest_maturity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

    </Panel>
  );
}

/* --------------------------------------------------------------- capex */

function CapexTab({ companyId, money }: { companyId: string; money: Money }) {
  const q = useCapexSummary(companyId);
  const rows = q.data ?? [];
  if (q.isLoading) return <Skeleton className="h-64" />;

  return (
    <Panel
      title="CapEx and projects"
      description="Approved budget against committed, actual and forecast spend."
      onExport={() =>
        downloadCsv("capex-summary", rows, [
          { key: "name", label: "Project", value: (r) => r.name },
          { key: "property", label: "Property", value: (r) => r.property_name },
          { key: "status", label: "Status", value: (r) => r.status },
          { key: "budget", label: "Budget", value: (r) => r.budget_amount.toFixed(2) },
          { key: "committed", label: "Committed", value: (r) => r.committed_amount.toFixed(2) },
          { key: "actual", label: "Actual", value: (r) => r.actual_amount.toFixed(2) },
          { key: "remaining", label: "Remaining", value: (r) => r.remaining_budget.toFixed(2) },
        ])
      }
    >
      {rows.length === 0 ? (
        <EmptyHint>No projects recorded.</EmptyHint>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.project_id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.property_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{titleCase(r.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">{money(r.budget_amount)}</TableCell>
                <TableCell className="text-right">{money(r.committed_amount)}</TableCell>
                <TableCell className="text-right">{money(r.actual_amount)}</TableCell>
                <TableCell
                  className={`text-right ${r.remaining_budget < 0 ? "text-destructive" : ""}`}
                >
                  {money(r.remaining_budget)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------- ageing */

function AgeingTab({ companyId, money }: { companyId: string; money: Money }) {
  const [direction, setDirection] = useState<"inbound" | "outbound">("inbound");
  const q = useCounterpartyAgeing(companyId, direction);
  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="w-56">
        <Label className="mb-1 text-xs text-muted-foreground">Ledger</Label>
        <Select value={direction} onValueChange={(v) => setDirection(v as "inbound" | "outbound")}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inbound">Payable — supplier invoices</SelectItem>
            <SelectItem value="outbound">Receivable — client invoices</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Panel
        title={direction === "inbound" ? "Supplier ageing" : "Client ageing"}
        description="Outstanding balances bucketed by days past the due date."
        onExport={() =>
          downloadCsv(`ageing-${direction}`, rows, [
            { key: "name", label: "Counterparty", value: (r) => r.counterparty_name },
            { key: "total", label: "Outstanding", value: (r) => r.outstanding_amount.toFixed(2) },
            { key: "notdue", label: "Not due", value: (r) => r.not_due.toFixed(2) },
            { key: "d30", label: "1-30", value: (r) => r.due_1_30.toFixed(2) },
            { key: "d60", label: "31-60", value: (r) => r.due_31_60.toFixed(2) },
            { key: "d90", label: "61-90", value: (r) => r.due_61_90.toFixed(2) },
            { key: "d90p", label: "90+", value: (r) => r.due_over_90.toFixed(2) },
          ])
        }
      >
        {q.isLoading ? (
          <Skeleton className="h-40" />
        ) : rows.length === 0 ? (
          <EmptyHint>Nothing outstanding on this ledger.</EmptyHint>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Counterparty</TableHead>
                <TableHead className="text-right">Not due</TableHead>
                <TableHead className="text-right">1–30</TableHead>
                <TableHead className="text-right">31–60</TableHead>
                <TableHead className="text-right">61–90</TableHead>
                <TableHead className="text-right">90+</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.counterparty_id}-${r.direction}`}>
                  <TableCell className="font-medium">{r.counterparty_name}</TableCell>
                  <TableCell className="text-right">{money(r.not_due)}</TableCell>
                  <TableCell className="text-right">{money(r.due_1_30)}</TableCell>
                  <TableCell className="text-right">{money(r.due_31_60)}</TableCell>
                  <TableCell className="text-right">{money(r.due_61_90)}</TableCell>
                  <TableCell className="text-right text-destructive">
                    {money(r.due_over_90)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {money(r.outstanding_amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell colSpan={5} />
                <TableCell className="text-right font-semibold">
                  {money(rows.reduce((s, r) => s + r.outstanding_amount, 0))}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------------- VAT */

function VatTab({
  companyId,
  range,
  money,
}: {
  companyId: string;
  range: Scoped;
  money: Money;
}) {
  const q = useVatSummary(companyId, range);
  const rows = q.data ?? [];
  const outputVat = rows
    .filter((r) => r.direction === "outbound")
    .reduce((s, r) => s + r.vat_amount, 0);
  const inputVat = rows
    .filter((r) => r.direction === "inbound")
    .reduce((s, r) => s + r.vat_amount, 0);

  if (q.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Output VAT (charged)" value={money(outputVat)} />
        <Kpi label="Input VAT (recoverable)" value={money(inputVat)} />
        <Kpi
          label="Net VAT position"
          value={money(outputVat - inputVat)}
          tone={outputVat - inputVat >= 0 ? "negative" : "positive"}
          hint={outputVat - inputVat >= 0 ? "Payable to the tax authority" : "Recoverable"}
        />
      </div>

      <Panel
        title="VAT summary"
        description="Posted documents by direction, VAT code and rate for the selected period."
        onExport={() =>
          downloadCsv(`vat-${range.from}-${range.to}`, rows, [
            { key: "dir", label: "Direction", value: (r) => r.direction },
            { key: "code", label: "VAT code", value: (r) => r.vat_code },
            { key: "rate", label: "Rate %", value: (r) => r.vat_rate },
            { key: "net", label: "Net", value: (r) => r.net_amount.toFixed(2) },
            { key: "vat", label: "VAT", value: (r) => r.vat_amount.toFixed(2) },
            { key: "gross", label: "Gross", value: (r) => r.gross_amount.toFixed(2) },
          ])
        }
      >
        {rows.length === 0 ? (
          <EmptyHint>No posted documents with VAT in this period.</EmptyHint>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Direction</TableHead>
                <TableHead>VAT code</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Documents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.direction}-${r.vat_code}-${r.vat_rate}-${i}`}>
                  <TableCell>{r.direction === "inbound" ? "Purchases" : "Sales"}</TableCell>
                  <TableCell>{r.vat_code ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatPercent(r.vat_rate)}</TableCell>
                  <TableCell className="text-right">{money(r.net_amount)}</TableCell>
                  <TableCell className="text-right">{money(r.vat_amount)}</TableCell>
                  <TableCell className="text-right">{money(r.gross_amount)}</TableCell>
                  <TableCell className="text-right">{formatNumber(r.document_count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------- journal */

function JournalTab({
  companyId,
  range,
  money,
}: {
  companyId: string;
  range: Scoped;
  money: Money;
}) {
  const q = useDocumentJournal(companyId, { ...range, propertyId: null });
  const rows = q.data ?? [];
  if (q.isLoading) return <Skeleton className="h-64" />;

  return (
    <Panel
      title="Document journal"
      description="Chronological export of posted documents for the accountant."
      onExport={() =>
        downloadCsv(`journal-${range.from}-${range.to}`, rows, [
          { key: "date", label: "Issue date", value: (r) => r.issue_date },
          { key: "doc", label: "Document", value: (r) => r.document_number },
          { key: "atcud", label: "ATCUD", value: (r) => r.atcud },
          { key: "type", label: "Type", value: (r) => r.doc_type },
          { key: "dir", label: "Direction", value: (r) => r.direction },
          { key: "cp", label: "Counterparty", value: (r) => r.counterparty_name },
          { key: "nif", label: "NIF", value: (r) => r.counterparty_nif },
          { key: "class", label: "Classification", value: (r) => r.classification_name },
          { key: "prop", label: "Property", value: (r) => r.property_code },
          { key: "net", label: "Net", value: (r) => r.net_amount },
          { key: "vat", label: "VAT", value: (r) => r.vat_amount },
          { key: "gross", label: "Gross", value: (r) => r.gross_amount },
        ])
      }
    >
      {rows.length === 0 ? (
        <EmptyHint>No posted documents in this period.</EmptyHint>
      ) : (
        <div className="max-h-[32rem] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Gross</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.document_id}-${r.line_no}`}>
                  <TableCell>{formatDate(r.issue_date as string)}</TableCell>
                  <TableCell className="font-medium">{r.document_number}</TableCell>
                  <TableCell>{r.counterparty_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.classification_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{money(Number(r.net_amount ?? 0))}</TableCell>
                  <TableCell className="text-right">{money(Number(r.vat_amount ?? 0))}</TableCell>
                  <TableCell className="text-right">{money(Number(r.gross_amount ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
