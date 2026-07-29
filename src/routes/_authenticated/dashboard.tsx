import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDate, formatMoney, formatNumber, formatPercent, titleCase } from "@/lib/format";
import { AlertsPanel } from "@/modules/executive/components/alerts-panel";
import { EmptyHint, Kpi, Section } from "@/modules/executive/components/kpi";
import {
  useExecutiveAlerts,
  useExecutiveSnapshot,
  useLiquidityForecast,
} from "@/modules/executive/queries";
import { buildInsights } from "@/modules/executive/report-utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Executive dashboard — Pedra Rioja" },
      {
        name: "description",
        content:
          "Portfolio value, liquidity, debt, income, costs and alerts for the Pedra Rioja property company.",
      },
      { property: "og:title", content: "Executive dashboard — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Portfolio value, liquidity, debt, income, costs and alerts for the Pedra Rioja property company.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const currency = workspace?.company?.base_currency ?? "EUR";

  const snapshot = useExecutiveSnapshot(companyId);
  const alerts = useExecutiveAlerts(companyId);
  const forecast = useLiquidityForecast(companyId, "base");

  const s = snapshot.data;
  const insights = s
    ? buildInsights({
        totalCash: s.liquidity.total_cash,
        forecast: forecast.data ?? [],
        monthlyRent: s.portfolio.monthly_rent,
        operatingCosts12m: s.income_costs.operating_costs_12m,
        financingCosts12m: s.income_costs.financing_costs_12m,
        projects: s.projects.items.map((p) => ({
          name: p.name,
          budget: p.budget,
          committed: p.committed,
          actual: p.actual,
        })),
        occupancyPct: s.portfolio.occupancy_pct,
        weightedRate: s.financing.weighted_rate,
        totalDebt: s.financing.total_debt,
      })
    : [];

  const money = (v: number | null | undefined) => formatMoney(v ?? 0, currency);

  if (!companyId) {
    return (
      <AppShell title="Executive dashboard" description="No company is assigned to your account yet.">
        <EmptyHint>Ask the workspace owner to assign you to a company.</EmptyHint>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Good day${workspace?.fullName ? `, ${workspace.fullName.split(" ")[0]}` : ""}`}
      description={`${workspace?.company?.name ?? "Portfolio"} — position, liquidity and what needs a decision today.`}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/reports">
            Reports <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      }
    >
      {snapshot.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : null}

      {s ? (
        <div className="space-y-8">
          <AlertsPanel
            alerts={alerts.data ?? []}
            insights={insights}
            isLoading={alerts.isLoading}
          />

          <Section title="Portfolio" description="What the company owns and what it is worth.">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Kpi
                label="Portfolio value"
                value={money(s.portfolio.portfolio_value)}
                hint={`${formatNumber(s.portfolio.property_count)} properties · ${formatNumber(
                  s.portfolio.unit_count,
                )} units`}
              />
              <Kpi
                label="Estimated equity"
                value={money(s.portfolio.estimated_equity)}
                tone={s.portfolio.estimated_equity >= 0 ? "positive" : "negative"}
                hint="Value less outstanding debt"
              />
              <Kpi
                label="Outstanding debt"
                value={money(s.portfolio.outstanding_debt)}
                hint={`Weighted rate ${formatPercent(s.financing.weighted_rate)}`}
              />
              <Kpi
                label="Occupancy"
                value={
                  s.portfolio.occupancy_pct === null
                    ? "—"
                    : formatPercent(s.portfolio.occupancy_pct)
                }
                hint={`${formatNumber(s.portfolio.income_producing)} income-producing`}
              />
              <Kpi
                label="Contracted rent"
                value={`${money(s.portfolio.monthly_rent)}/mo`}
                hint={`${money(s.portfolio.monthly_rent * 12)} annualised`}
              />
              <Kpi
                label="Under works"
                value={formatNumber(s.portfolio.under_works)}
                tone="muted"
                hint={`${formatNumber(s.projects.active_count)} active projects`}
              />
            </div>
          </Section>

          <Section
            title="Liquidity"
            description="Cash today and the projected balance on committed and forecast movements."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardDescription>Cash across accounts</CardDescription>
                  <CardTitle className="font-display text-3xl">
                    {money(s.liquidity.total_cash)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {s.liquidity.accounts.length === 0 ? (
                    <EmptyHint>No bank accounts recorded.</EmptyHint>
                  ) : (
                    s.liquidity.accounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.bank_name ?? "—"}
                            {a.unreconciled_count
                              ? ` · ${a.unreconciled_count} unreconciled`
                              : ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium">
                          {formatMoney(a.balance, a.currency)}
                        </span>
                      </div>
                    ))
                  )}
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link to="/banking">Open banking</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg">Projected balance</CardTitle>
                  <CardDescription>Base scenario, committed and forecast included.</CardDescription>
                </CardHeader>
                <CardContent>
                  {forecast.isLoading ? (
                    <Skeleton className="h-24" />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-4">
                      {(forecast.data ?? []).map((h) => (
                        <div key={h.horizon_days} className="rounded-md border px-3 py-3">
                          <p className="text-xs tracking-wide text-muted-foreground uppercase">
                            {h.horizon_days} days
                          </p>
                          <p
                            className={`font-display text-xl font-semibold ${
                              h.projected_balance < 0 ? "text-destructive" : ""
                            }`}
                          >
                            {money(h.projected_balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {money(h.inflows)} in · {money(h.outflows)} out
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section title="Financing" description="Debt by lender, cost of debt and maturities.">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg">Lenders</CardTitle>
                  <CardDescription>
                    {money(s.financing.total_debt)} drawn · weighted rate{" "}
                    {formatPercent(s.financing.weighted_rate)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {s.financing.lenders.length === 0 ? (
                    <EmptyHint>No financing agreements recorded.</EmptyHint>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lender</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Next due</TableHead>
                          <TableHead className="text-right">Maturity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.financing.lenders.map((l) => (
                          <TableRow key={l.lender}>
                            <TableCell className="font-medium">{l.lender}</TableCell>
                            <TableCell className="text-right">{money(l.outstanding)}</TableCell>
                            <TableCell className="text-right">{formatPercent(l.rate)}</TableCell>
                            <TableCell className="text-right">
                              {formatDate(l.next_due_date)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatDate(l.earliest_maturity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg">Maturity profile</CardTitle>
                  <CardDescription>Outstanding principal by year of maturity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.maturity.length === 0 ? (
                    <EmptyHint>Nothing maturing.</EmptyHint>
                  ) : (
                    s.maturity.map((m) => {
                      const max = Math.max(...s.maturity.map((x) => x.outstanding), 1);
                      return (
                        <div key={m.year} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{m.year}</span>
                            <span className="font-medium">{money(m.outstanding)}</span>
                          </div>
                          <Progress value={(m.outstanding / max) * 100} />
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section
            title="Income and costs"
            description="Last twelve months, from posted documents and reconciled movements."
          >
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Kpi label="Rental income" value={money(s.income_costs.rental_income_12m)} tone="positive" />
              <Kpi label="Other income" value={money(s.income_costs.other_income_12m)} />
              <Kpi label="Operating costs" value={money(s.income_costs.operating_costs_12m)} />
              <Kpi label="Financing costs" value={money(s.income_costs.financing_costs_12m)} />
              <Kpi label="CapEx" value={money(s.income_costs.capex_12m)} />
              <Kpi label="Taxes" value={money(s.income_costs.taxes_12m)} />
            </div>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="font-display text-lg">Upcoming costs</CardTitle>
                    <CardDescription>Committed and forecast outflows, next 60 days.</CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/cash-flow">Cash flow</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {s.upcoming_costs.length === 0 ? (
                  <EmptyHint>Nothing scheduled in the next 60 days.</EmptyHint>
                ) : (
                  <Table>
                    <TableBody>
                      {s.upcoming_costs.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="w-28 text-muted-foreground">
                            {formatDate(c.date)}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{c.description ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {titleCase(c.category)}
                              {c.counterparty_name ? ` · ${c.counterparty_name}` : ""}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">{money(Math.abs(c.amount))}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {titleCase(c.state)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="font-display text-lg">Bookkeeping</CardTitle>
                    <CardDescription>Drafts, outstanding balances and overdue items.</CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/bookkeeping">Open</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.bookkeeping ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Stat label="Drafts to post" value={formatNumber(s.bookkeeping.draft_count)} />
                      <Stat
                        label="Overdue"
                        value={`${formatNumber(s.bookkeeping.overdue_count)} · ${money(
                          s.bookkeeping.overdue_amount,
                        )}`}
                        tone={s.bookkeeping.overdue_count > 0 ? "negative" : "default"}
                      />
                      <Stat
                        label="Payable to suppliers"
                        value={money(s.bookkeeping.outstanding_supplier_amount)}
                      />
                      <Stat
                        label="Receivable from clients"
                        value={money(s.bookkeeping.outstanding_client_amount)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(s.bookkeeping.posted_count)} posted documents ·{" "}
                      {formatNumber(s.bookkeeping.cancelled_count)} cancelled
                    </p>
                  </>
                ) : (
                  <EmptyHint>No bookkeeping activity yet.</EmptyHint>
                )}

                <div className="border-t pt-3">
                  <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
                    Recent settlements
                  </p>
                  {s.recent_payments.length === 0 ? (
                    <EmptyHint>No payments recorded yet.</EmptyHint>
                  ) : (
                    <div className="space-y-1">
                      {s.recent_payments.map((p) => (
                        <div key={p.id} className="flex justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">
                            {p.counterparty_name ?? p.document_number ?? "Payment"}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {formatDate(p.date)} · {money(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Section title="Projects" description="Approved works, spend and remaining budget.">
            <Card>
              <CardContent className="pt-6">
                {s.projects.items.length === 0 ? (
                  <EmptyHint>No active projects.</EmptyHint>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Committed</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.projects.items.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.property_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">{money(p.budget)}</TableCell>
                          <TableCell className="text-right">{money(p.committed)}</TableCell>
                          <TableCell className="text-right">{money(p.actual)}</TableCell>
                          <TableCell
                            className={`text-right ${p.remaining < 0 ? "text-destructive" : ""}`}
                          >
                            {money(p.remaining)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatDate(p.target_end_date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Section>
        </div>
      ) : null}

      {snapshot.error ? (
        <EmptyHint>The dashboard could not be loaded. Please refresh.</EmptyHint>
      ) : null}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "negative";
}) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={`font-medium ${tone === "negative" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
