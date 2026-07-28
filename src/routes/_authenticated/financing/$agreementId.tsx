import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasAnyRole, useWorkspace } from "@/hooks/use-workspace";
import { formatDate, formatMoney, formatMoneyPrecise, formatPercent, titleCase } from "@/lib/format";
import {
  useAgreement,
  useAgreementCashFlow,
  useAgreementSchedule,
  useAgreementVersions,
  useScheduleImports,
} from "@/modules/realestate/financing-queries";
import { setInstalmentState } from "@/modules/realestate/financing.functions";
import { ScheduleImportDialog } from "@/modules/realestate/components/schedule-import-dialog";

export const Route = createFileRoute("/_authenticated/financing/$agreementId")({
  head: () => ({
    meta: [
      { title: "Financing agreement — Pedra Rioja" },
      {
        name: "description",
        content:
          "Mortgage and leasing workspace: contract terms, versioned repayment schedules, instalment states and projected cash flow.",
      },
      { property: "og:title", content: "Financing agreement — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Mortgage and leasing workspace: contract terms, versioned repayment schedules, instalment states and projected cash flow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgreementWorkspace,
});

const LOCKED = new Set(["settled", "reconciled"]);

function AgreementWorkspace() {
  const { agreementId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const { data, isLoading } = useAgreement(agreementId);
  const schedule = useAgreementSchedule(agreementId);
  const versions = useAgreementVersions(agreementId);
  const imports = useScheduleImports(agreementId);
  const cashFlow = useAgreementCashFlow(agreementId);
  const queryClient = useQueryClient();
  const changeState = useServerFn(setInstalmentState);

  const canManage = hasAnyRole(workspace?.roles, ["owner", "manager"]);
  const canRecord = hasAnyRole(workspace?.roles, ["owner", "manager", "bookkeeper", "assistant"]);

  const state = useMutation({
    mutationFn: async (vars: { rowId: string; status: "settled" | "reconciled" | "scheduled" }) =>
      changeState({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financing-schedule", agreementId] });
      queryClient.invalidateQueries({ queryKey: ["financing-cash-flow", agreementId] });
      toast.success("Instalment updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AppShell title="Financing">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  const agreement = data?.agreement;
  if (!agreement) {
    return (
      <AppShell title="Agreement not found" description="This financing agreement is not available.">
        <Card>
          <CardContent className="py-12 text-center">
            <Button asChild variant="outline">
              <Link to="/properties">
                <ArrowLeft className="size-4" /> Back to register
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const summary = (data?.summary ?? {}) as Record<string, number | null>;
  const currency = agreement.currency ?? workspace?.company?.base_currency ?? "EUR";
  const property = data?.property ?? null;

  return (
    <AppShell
      title={`${agreement.lender} · ${titleCase(agreement.type)}`}
      description={
        property
          ? `${property.code ?? ""} ${property.name}`.trim()
          : "Agreement not linked to a property"
      }
      actions={
        <>
          {property ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/properties/$propertyId" params={{ propertyId: property.id }}>
                <ArrowLeft className="size-4" /> Property
              </Link>
            </Button>
          ) : null}
          {agreement.drive_folder_url ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(agreement.drive_folder_url!, "_blank")}
            >
              <ExternalLink className="size-4" /> Drive folder
            </Button>
          ) : null}
          {canManage ? <ScheduleImportDialog agreement={agreement} /> : null}
        </>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <Kpi label="Original principal" value={formatMoney(agreement.principal, currency)} />
        <Kpi label="Outstanding principal" value={formatMoney(summary.outstanding_principal, currency)} />
        <Kpi
          label="Rate"
          value={
            agreement.rate_type === "fixed"
              ? formatPercent(agreement.fixed_rate)
              : `${agreement.index_name ?? "Index"} ${agreement.index_tenor ?? ""} + ${formatPercent(agreement.spread)}`
          }
        />
        <Kpi label="Next instalment" value={formatDate(summary.next_due_date as unknown as string)} />
        <Kpi label="Maturity" value={formatDate(agreement.end_date)} />
        <Kpi label="Interest paid" value={formatMoney(summary.interest_settled, currency)} />
        <Kpi label="Interest remaining" value={formatMoney(summary.interest_remaining, currency)} />
        <Kpi label="Instalments locked" value={String(summary.locked_rows ?? 0)} />
        <Kpi label="Schedule versions" value={String(versions.data?.length ?? 0)} />
      </div>

      <Tabs defaultValue="schedule">
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
          <TabsTrigger value="imports">Imports</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardContent className="p-0">
              {schedule.data?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Commissions</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.data.map((r: Record<string, unknown>) => {
                      const locked = LOCKED.has(String(r.status));
                      return (
                        <TableRow key={String(r.id)}>
                          <TableCell>{String(r.period_no ?? "—")}</TableCell>
                          <TableCell>{formatDate(r.due_date as string)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(r.opening_balance as number, currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(r.principal as number, currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(r.interest as number, currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(r.commissions as number, currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(r.vat as number, currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatMoneyPrecise(r.total_payment as number, currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(r.closing_balance as number, currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={locked ? "default" : "secondary"} className="gap-1">
                              {locked ? <Lock className="size-3" /> : null}
                              {titleCase(String(r.status))}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canRecord && !locked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={state.isPending}
                                onClick={() =>
                                  state.mutate({ rowId: String(r.id), status: "settled" })
                                }
                              >
                                Mark settled
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No instalments yet — build or import a schedule to start the forecast.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
              {(
                [
                  ["Type", titleCase(agreement.type)],
                  ["Lender", agreement.lender],
                  ["Contract reference", agreement.reference ?? "—"],
                  ["Original principal", formatMoney(agreement.principal, currency)],
                  ["Start date", formatDate(agreement.start_date)],
                  ["Maturity", formatDate(agreement.end_date)],
                  ["Term", agreement.term_months ? `${agreement.term_months} months` : "—"],
                  ["Rate type", titleCase(agreement.rate_type)],
                  ["Fixed rate", formatPercent(agreement.fixed_rate)],
                  ["Index", agreement.index_name ?? "—"],
                  ["Index tenor", agreement.index_tenor ?? "—"],
                  ["Spread", formatPercent(agreement.spread)],
                  ["Repayment", titleCase(agreement.repayment_type)],
                  ["Grace months", String(agreement.grace_months ?? "—")],
                  ["Payment day", String(agreement.payment_day ?? "—")],
                  ["Status", titleCase(agreement.status)],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
                  <p className="mt-0.5 text-sm">{value}</p>
                </div>
              ))}
              {agreement.notes ? (
                <div className="sm:col-span-3">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Notes</p>
                  <p className="mt-0.5 text-sm">{agreement.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardContent className="p-0">
              {versions.data?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Effective from</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Rate applied</TableHead>
                      <TableHead>Superseded</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.data.map((v: Record<string, unknown>) => (
                      <TableRow key={String(v.id)}>
                        <TableCell className="font-medium">v{String(v.version_no)}</TableCell>
                        <TableCell>{formatDate(v.effective_from as string)}</TableCell>
                        <TableCell>{titleCase(String(v.reason))}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPercent(v.rate_applied as number)}
                        </TableCell>
                        <TableCell>{formatDate(v.superseded_at as string, "Current")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(v.notes as string) ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No schedule versions yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow">
          <Card>
            <CardContent className="p-0">
              {cashFlow.data?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Commissions</TableHead>
                      <TableHead className="text-right">Total outflow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlow.data.map((m: Record<string, unknown>, i) => (
                      <TableRow key={`${String(m.month)}-${i}`}>
                        <TableCell>{formatDate(m.month as string)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{titleCase(String(m.state))}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(m.principal as number, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(m.interest as number, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(m.vat as number, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(m.commissions as number, currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoneyPrecise(m.total as number, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Projected cash flow appears once a schedule is committed.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports">
          <Card>
            <CardContent className="p-0">
              {imports.data?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staged</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Effective from</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports.data.map((imp: Record<string, unknown>) => (
                      <TableRow key={String(imp.id)}>
                        <TableCell>{formatDate(imp.created_at as string)}</TableCell>
                        <TableCell>{titleCase(String(imp.source))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(imp.file_name as string) ?? "—"}
                        </TableCell>
                        <TableCell>{formatDate(imp.effective_from as string)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {String(imp.row_count ?? "—")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{titleCase(String(imp.status))}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No schedule imports recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
