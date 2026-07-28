import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatMoney, formatMoneyPrecise } from "@/lib/format";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  addMonthsIso,
  CASH_FLOW_CATEGORIES,
  CASH_FLOW_STATES,
  HORIZONS,
  labelOf,
  monthStart,
  RECURRENCE_FREQUENCIES,
} from "@/modules/cashflow/schemas";
import {
  useBankAccounts,
  useCashFlowEntries,
  useCashFlowFilterOptions,
  useCashFlowMonthly,
  useRecurringRules,
  useScenarios,
  type CashFlowFilters,
} from "@/modules/cashflow/queries";
import {
  generateOccurrences,
  setCashFlowEntryInclusion,
} from "@/modules/cashflow/cashflow.functions";
import { NewCashFlowItemDialog } from "@/modules/cashflow/components/entry-dialog";
import { NewRecurringRuleDialog } from "@/modules/cashflow/components/rule-dialog";

export const Route = createFileRoute("/_authenticated/cash-flow")({
  head: () => ({
    meta: [
      { title: "Cash flow — Pedra Rioja portfolio liquidity" },
      {
        name: "description",
        content:
          "Monthly portfolio cash-flow engine: financing instalments, recurring obligations, projects, taxes and scenarios with projected closing balances.",
      },
      { property: "og:title", content: "Cash flow — Pedra Rioja portfolio liquidity" },
      {
        property: "og:description",
        content:
          "Actual, reconciled, committed and forecast cash movements with 12 to 60 month liquidity projections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CashFlowPage,
});

const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(new Date(iso));

function CashFlowPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const currency = workspace?.company?.base_currency ?? "EUR";
  const queryClient = useQueryClient();

  const [months, setMonths] = useState<number>(12);
  const [scenario, setScenario] = useState("base");
  const [propertyId, setPropertyId] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const from = monthStart();
  const through = addMonthsIso(from, months);

  const filters: CashFlowFilters = useMemo(
    () => ({
      scenario,
      propertyId: propertyId || null,
      bankAccountId: bankAccountId || null,
      projectId: projectId || null,
      category: category || null,
      states: state ? [state] : null,
      includeInactive,
    }),
    [scenario, propertyId, bankAccountId, projectId, category, state, includeInactive],
  );

  const monthly = useCashFlowMonthly(companyId, from, months, filters);
  const entries = useCashFlowEntries(companyId, from, through, filters);
  const rules = useRecurringRules(companyId);
  const scenarios = useScenarios(companyId);
  const accounts = useBankAccounts(companyId);
  const options = useCashFlowFilterOptions(companyId);

  const generate = useServerFn(generateOccurrences);
  const setInclusion = useServerFn(setCashFlowEntryInclusion);

  const project = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company in this workspace");
      return generate({ data: { companyId, through } });
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow-monthly"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-entries"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-rules"] });
      toast.success(
        r.created > 0
          ? `${r.created} new occurrence(s) projected to ${formatDate(through)}`
          : "Already projected to this horizon — no duplicates created",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleInclusion = useMutation({
    mutationFn: async (v: { entryId: string; isIncluded: boolean }) =>
      setInclusion({ data: v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow-monthly"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-entries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = monthly.data ?? [];
  const closing = rows.at(-1)?.closing_balance ?? 0;
  const totalIn = rows.reduce((s, r) => s + r.inflows, 0);
  const totalOut = rows.reduce((s, r) => s + r.outflows, 0);
  const totalVariance = rows.reduce((s, r) => s + r.variance, 0);
  const lowest = rows.length ? Math.min(...rows.map((r) => r.closing_balance)) : 0;

  return (
    <AppShell
      title="Cash flow"
      description="Portfolio liquidity from every module — financing, recurring obligations, projects, taxes and manual scenario items."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => project.mutate()}
            disabled={project.isPending}
          >
            <RefreshCw className="size-4" /> Project horizon
          </Button>
          <NewRecurringRuleDialog horizonThrough={through} />
          <NewCashFlowItemDialog />
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Expected inflows" value={formatMoney(totalIn, currency)} />
        <Kpi label="Expected outflows" value={formatMoney(totalOut, currency)} />
        <Kpi
          label={`Projected balance in ${months} months`}
          value={formatMoney(closing, currency)}
        />
        <Kpi
          label="Lowest projected balance"
          value={formatMoney(lowest, currency)}
          tone={lowest < 0 ? "warning" : "default"}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-3 xl:grid-cols-7">
          <Filter label="Scenario">
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(scenarios.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.code}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="Horizon">
            <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} months
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="Property">
            <AllSelect
              value={propertyId}
              onChange={setPropertyId}
              allLabel="All properties"
              items={(options.data?.properties ?? []).map((p) => ({
                value: p.id,
                label: [p.code, p.name].filter(Boolean).join(" — "),
              }))}
            />
          </Filter>
          <Filter label="Bank account">
            <AllSelect
              value={bankAccountId}
              onChange={setBankAccountId}
              allLabel="All accounts"
              items={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
            />
          </Filter>
          <Filter label="Project">
            <AllSelect
              value={projectId}
              onChange={setProjectId}
              allLabel="All projects"
              items={(options.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))}
            />
          </Filter>
          <Filter label="Category">
            <AllSelect
              value={category}
              onChange={setCategory}
              allLabel="All categories"
              items={CASH_FLOW_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
          </Filter>
          <Filter label="Status">
            <AllSelect
              value={state}
              onChange={setState}
              allLabel="All statuses"
              items={CASH_FLOW_STATES.map((s) => ({ value: s.value, label: s.label }))}
            />
          </Filter>
          <div className="flex items-end gap-2 sm:col-span-3 xl:col-span-7">
            <Switch
              id="include-inactive"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
            <Label htmlFor="include-inactive" className="text-sm font-normal">
              Include archived and sold assets
            </Label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="monthly" className="mt-6">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="rules">Recurring rules</TabsTrigger>
          <TabsTrigger value="accounts">Bank accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Monthly projection · variance {formatMoney(totalVariance, currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Inflows</TableHead>
                    <TableHead className="text-right">Outflows</TableHead>
                    <TableHead className="text-right">Financing</TableHead>
                    <TableHead className="text-right">Recurring</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                    <TableHead className="text-right">Taxes</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium">{monthLabel(r.month)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(r.opening_balance, currency)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(r.inflows, currency)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(r.outflows, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(r.financing, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(r.recurring, currency)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(r.projects, currency)}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.taxes, currency)}</TableCell>
                      <TableCell
                        className={
                          r.closing_balance < 0
                            ? "text-right font-semibold text-destructive"
                            : "text-right font-semibold"
                        }
                      >
                        {formatMoney(r.closing_balance, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(r.cumulative_liquidity, currency)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(r.variance, currency)}</TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && (
                    <TableRow>
                      <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                        Nothing projected yet for this scenario.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Cash-flow items to {formatDate(through)}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Included</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(entries.data ?? []).map((e) => (
                    <TableRow key={e.id} className={e.is_included ? "" : "opacity-50"}>
                      <TableCell>{formatDate(e.entry_date)}</TableCell>
                      <TableCell className="max-w-[22rem] truncate">{e.description}</TableCell>
                      <TableCell>{e.property_code ?? "—"}</TableCell>
                      <TableCell>{labelOf(CASH_FLOW_CATEGORIES, e.category)}</TableCell>
                      <TableCell>
                        <Badge variant={e.state === "reconciled" ? "default" : "secondary"}>
                          {labelOf(CASH_FLOW_STATES, e.state)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.is_manual ? "Manual" : e.source_type?.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoneyPrecise(e.amount_net, e.currency ?? currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoneyPrecise(e.vat, e.currency ?? currency)}
                      </TableCell>
                      <TableCell
                        className={
                          e.direction === "inflow"
                            ? "text-right font-medium"
                            : "text-right font-medium text-destructive"
                        }
                      >
                        {e.direction === "inflow" ? "+" : "−"}
                        {formatMoneyPrecise(e.amount_total, e.currency ?? currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={Boolean(e.is_included)}
                          onCheckedChange={(v) =>
                            toggleInclusion.mutate({ entryId: e.id as string, isIncluded: v })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!entries.data?.length && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                        No cash-flow items in this window.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Recurring obligations</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Until</TableHead>
                    <TableHead>Projected to</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rules.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        {labelOf(RECURRENCE_FREQUENCIES, r.frequency)}
                        {r.interval_count > 1 ? ` ×${r.interval_count}` : ""}
                      </TableCell>
                      <TableCell>{labelOf(CASH_FLOW_CATEGORIES, r.category)}</TableCell>
                      <TableCell>
                        {(r.properties as { name?: string } | null)?.name ?? "Company"}
                      </TableCell>
                      <TableCell>{formatDate(r.start_date)}</TableCell>
                      <TableCell>{formatDate(r.end_date)}</TableCell>
                      <TableCell>{formatDate(r.last_generated_through)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoneyPrecise(r.amount_total, r.currency ?? currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rules.data?.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        No recurring rules yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Bank accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Opening balances anchor the projection. Statement import, matching and automatic
                reconciliation arrive in the next phase on this same ledger.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Opening date</TableHead>
                    <TableHead className="text-right">Opening balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(accounts.data ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.bank_name ?? "—"}</TableCell>
                      <TableCell>{a.iban ?? "—"}</TableCell>
                      <TableCell>{formatDate(a.opening_balance_date)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoneyPrecise(a.opening_balance, a.currency ?? currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!accounts.data?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No bank accounts registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <p
          className={
            tone === "warning"
              ? "mt-2 font-display text-2xl font-semibold text-destructive"
              : "mt-2 font-display text-2xl font-semibold"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}

function AllSelect({
  value,
  onChange,
  allLabel,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  items: { value: string; label: string }[];
}) {
  return (
    <Select value={value || "__all"} onValueChange={(v) => onChange(v === "__all" ? "" : v)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">{allLabel}</SelectItem>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
