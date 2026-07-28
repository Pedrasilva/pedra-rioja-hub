import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeftRight, Ban, Landmark, RotateCcw, ShieldCheck, Wand2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatMoney, formatMoneyPrecise } from "@/lib/format";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  BATCH_STATUSES,
  labelOf,
  TX_RECONCILIATION_STATUSES,
} from "@/modules/banking/schemas";
import {
  useBankAccountBalances,
  useBankTransactions,
  useExpectedItems,
  useMatches,
  useReconciliationExceptions,
  useStatementImports,
  useTransfers,
  type BankTransaction,
} from "@/modules/banking/queries";
import {
  closeStatementBatch,
  createEntryFromTransaction,
  recordInternalTransfer,
  reverseBankMatch,
  setTransactionIgnored,
} from "@/modules/banking/banking.functions";
import { BankAccountDialog } from "@/modules/banking/components/account-dialog";
import { MatchDialog } from "@/modules/banking/components/match-dialog";
import { StatementImportDialog } from "@/modules/banking/components/statement-import-dialog";

export const Route = createFileRoute("/_authenticated/banking")({
  head: () => ({
    meta: [
      { title: "Banking — statement import and reconciliation" },
      {
        name: "description",
        content:
          "Import bank statements, review and stage every line, then reconcile actual movements against financing instalments, rents, taxes and committed costs.",
      },
      { property: "og:title", content: "Banking — statement import and reconciliation" },
      {
        property: "og:description",
        content:
          "Account balances, staged statement batches, suggested matches, confirmed reconciliations and closing-balance controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankingPage,
});

function BankingPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const currency = workspace?.company?.base_currency ?? "EUR";
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [matching, setMatching] = useState<BankTransaction | null>(null);
  const [transferPick, setTransferPick] = useState<string[]>([]);

  const filters = useMemo(
    () => ({
      bankAccountId: accountId || null,
      status: status || null,
      from: from || null,
      to: to || null,
      search: search || null,
    }),
    [accountId, status, from, to, search],
  );

  const balances = useBankAccountBalances(companyId);
  const transactions = useBankTransactions(companyId, filters);
  const expected = useExpectedItems(companyId, filters);
  const imports = useStatementImports(companyId, accountId || null);
  const matches = useMatches(companyId, filters);
  const exceptions = useReconciliationExceptions(companyId);
  const transfers = useTransfers(companyId);

  const reverse = useServerFn(reverseBankMatch);
  const ignore = useServerFn(setTransactionIgnored);
  const transfer = useServerFn(recordInternalTransfer);
  const convert = useServerFn(createEntryFromTransaction);
  const closeBatch = useServerFn(closeStatementBatch);

  const invalidate = () => {
    for (const key of [
      "bank-transactions",
      "bank-expected-items",
      "bank-matches",
      "bank-account-balances",
      "bank-exceptions",
      "bank-transfers",
      "bank-statement-imports",
      "cash-flow-entries",
      "cash-flow-monthly",
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const accounts = (balances.data ?? []).map((a) => ({
    id: a.bank_account_id,
    name: a.name,
    currency: a.currency,
  }));

  const totals = (balances.data ?? []).reduce(
    (acc, a) => ({
      balance: acc.balance + a.system_balance,
      unreconciled: acc.unreconciled + a.unreconciled_count,
      unreconciledValue: acc.unreconciledValue + a.unreconciled_value,
    }),
    { balance: 0, unreconciled: 0, unreconciledValue: 0 },
  );
  const expectedOutstanding = (expected.data ?? []).reduce(
    (s, e) => s + Math.abs(e.outstanding_amount),
    0,
  );

  function toggleTransferPick(id: string) {
    setTransferPick((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(-2),
    );
  }

  function pairTransfer() {
    if (transferPick.length !== 2) return;
    const rows = (transactions.data ?? []).filter((t) => transferPick.includes(t.id));
    const out = rows.find((t) => t.amount < 0);
    const inn = rows.find((t) => t.amount > 0);
    if (!out || !inn) {
      toast.error("Select one outgoing and one incoming movement");
      return;
    }
    act.mutate(async () => {
      await transfer({ data: { fromTransactionId: out.id, toTransactionId: inn.id } });
      setTransferPick([]);
      toast.success("Recorded as an internal transfer");
    });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Banking</h1>
            <p className="text-muted-foreground">
              Statement import, duplicate control and reconciliation against expected items.
            </p>
          </div>
          <div className="flex gap-2">
            {companyId && <BankAccountDialog companyId={companyId} currency={currency} />}
            <StatementImportDialog
              accounts={accounts}
              defaultAccountId={accountId || undefined}
              disabled={!accounts.length}
            />
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="System balance" value={formatMoney(totals.balance, currency)} />
          <SummaryCard
            label="Unreconciled movements"
            value={`${totals.unreconciled}`}
            hint={formatMoney(totals.unreconciledValue, currency)}
          />
          <SummaryCard
            label="Expected awaiting payment"
            value={formatMoney(expectedOutstanding, currency)}
            hint={`${expected.data?.length ?? 0} items`}
          />
          <SummaryCard
            label="Batches in review"
            value={`${(imports.data ?? []).filter((i) => i.status === "draft").length}`}
            hint={`${(imports.data ?? []).filter((i) => i.status === "committed").length} imported`}
          />
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            <div className="grid gap-1">
              <Label className="text-xs">Account</Label>
              <Select value={accountId || "all"} onValueChange={(v) => setAccountId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Status</Label>
              <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  {TX_RECONCILIATION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="grid flex-1 gap-1">
              <Label className="text-xs">Search</Label>
              <Input
                placeholder="Description or counterparty"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="expected">Expected items</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="matches">Confirmed matches</TabsTrigger>
            <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Landmark className="h-4 w-4" /> Account balances
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Movement</TableHead>
                      <TableHead className="text-right">System balance</TableHead>
                      <TableHead className="text-right">Unreconciled</TableHead>
                      <TableHead>Last movement</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(balances.data ?? []).map((a) => (
                      <TableRow key={a.bank_account_id}>
                        <TableCell>
                          <div className="font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.bank_name ?? "—"} · {a.status}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.iban ?? a.account_identifier ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(a.opening_balance, a.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(a.movement, a.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoneyPrecise(a.system_balance, a.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {a.unreconciled_count} ·{" "}
                          {formatMoney(a.unreconciled_value, a.currency)}
                        </TableCell>
                        <TableCell>{formatDate(a.last_transaction_date)}</TableCell>
                        <TableCell className="text-right">
                          {companyId && (
                            <BankAccountDialog
                              companyId={companyId}
                              currency={currency}
                              existing={{
                                id: a.bank_account_id,
                                name: a.name,
                                bank_name: a.bank_name,
                                iban: a.iban,
                                account_identifier: a.account_identifier,
                                bic: null,
                                currency: a.currency,
                                account_type: a.account_type,
                                opening_balance: a.opening_balance,
                                opening_balance_date: a.opening_balance_date,
                                drive_folder_url: null,
                                status: a.status,
                                notes: null,
                              }}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              }
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!balances.data?.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No bank accounts yet — add one to start importing statements.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {Boolean(transfers.data?.length) && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Internal transfers</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(transfers.data ?? []).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{formatDate(t.transfer_date)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(t.amount, currency)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.notes ?? "Excluded from portfolio income and expenditure"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="pt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-base">Bank transactions</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={transferPick.length !== 2}
                  onClick={pairTransfer}
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Pair as internal transfer
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Counterparty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Matched</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(transactions.data ?? []).map((t) => (
                      <TableRow
                        key={t.id}
                        className={transferPick.includes(t.id) ? "bg-accent/30" : ""}
                      >
                        <TableCell>{formatDate(t.transaction_date)}</TableCell>
                        <TableCell className="max-w-[24rem] truncate">
                          {t.description ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate">
                          {t.counterparty_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(t.amount, t.currency ?? currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatMoneyPrecise(t.matched_amount, t.currency ?? currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {labelOf(TX_RECONCILIATION_STATUSES, t.reconciliation_status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-x-1 text-right">
                          {t.reconciliation_status !== "reconciled" && (
                            <>
                              <Button size="sm" onClick={() => setMatching(t)}>
                                <Wand2 className="mr-1 h-3 w-3" />
                                Match
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleTransferPick(t.id)}
                              >
                                {transferPick.includes(t.id) ? "Unpick" : "Pick"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  act.mutate(async () => {
                                    await convert({
                                      data: {
                                        bankTransactionId: t.id,
                                        category: "other",
                                        vat: 0,
                                        description: t.description ?? undefined,
                                      },
                                    });
                                    toast.success("Cash-flow item created and reconciled");
                                  })
                                }
                              >
                                Create item
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  act.mutate(async () => {
                                    await ignore({
                                      data: {
                                        bankTransactionId: t.id,
                                        ignored: t.reconciliation_status !== "ignored",
                                      },
                                    });
                                  })
                                }
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!transactions.data?.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No transactions for these filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expected" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expected items awaiting payment</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expected</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(expected.data ?? []).map((e) => (
                      <TableRow key={e.entry_id}>
                        <TableCell>{formatDate(e.expected_date)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{e.description ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.counterparty_name ?? e.category ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{e.property_code ?? "—"}</TableCell>
                        <TableCell className="text-xs">{e.source_type ?? "manual"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(e.expected_amount, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(e.outstanding_amount, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!expected.data?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Nothing outstanding for these filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statement batches</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imported</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead className="text-right">Duplicates</TableHead>
                      <TableHead className="text-right">Statement closing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(imports.data ?? []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{formatDate(b.created_at)}</TableCell>
                        <TableCell className="max-w-[16rem] truncate">
                          {b.file_name ?? b.source}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(b.period_start)} → {formatDate(b.period_end)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.imported_count || b.row_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.duplicate_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.statement_closing_balance == null
                            ? "—"
                            : formatMoneyPrecise(b.statement_closing_balance, currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{labelOf(BATCH_STATUSES, b.status)}</Badge>
                          {b.balance_override_reason && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Override: {b.balance_override_reason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {b.status === "committed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                act.mutate(async () => {
                                  try {
                                    await closeBatch({ data: { importId: b.id } });
                                    toast.success("Batch marked fully reconciled");
                                  } catch (err) {
                                    const reason = window.prompt(
                                      `${(err as Error).message}\n\nRecord an override reason to close it anyway:`,
                                    );
                                    if (!reason) throw err;
                                    await closeBatch({
                                      data: { importId: b.id, overrideReason: reason },
                                    });
                                    toast.success("Batch closed with a recorded override");
                                  }
                                })
                              }
                            >
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              Close batch
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!imports.data?.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No statement batches yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confirmed matches</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Confirmed</TableHead>
                      <TableHead>Bank movement</TableHead>
                      <TableHead>Expected item</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(matches.data ?? []).map((m) => {
                      const tx = m.bank_transactions as {
                        transaction_date: string | null;
                        description: string | null;
                      } | null;
                      const entry = m.cash_flow_entries as { description: string | null } | null;
                      return (
                        <TableRow key={m.id}>
                          <TableCell>{formatDate(m.confirmed_at)}</TableCell>
                          <TableCell className="max-w-[18rem] truncate">
                            {formatDate(tx?.transaction_date)} · {tx?.description ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[18rem] truncate">
                            {entry?.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(m.allocated_amount, currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoneyPrecise(m.variance_amount, currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.status === "reversed" ? "outline" : "secondary"}>
                              {m.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {m.status === "confirmed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const reason = window.prompt("Reason for unreconciling?");
                                  if (!reason) return;
                                  act.mutate(async () => {
                                    await reverse({ data: { matchId: m.id, reason } });
                                    toast.success("Match reversed — the audit record is kept");
                                  });
                                }}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                Unreconcile
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!matches.data?.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          Nothing reconciled yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exceptions" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exceptions and variances</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bank movement</TableHead>
                      <TableHead>Expected item</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(exceptions.data ?? []).map((x) => (
                      <TableRow key={x.match_id}>
                        <TableCell>{formatDate(x.transaction_date)}</TableCell>
                        <TableCell className="max-w-[18rem] truncate">
                          {x.transaction_description ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[18rem] truncate">
                          {x.entry_description ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(x.allocated_amount, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(x.variance_amount, currency)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {x.variance_reason ?? x.match_type}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!exceptions.data?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No variances recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {matching && companyId && (
        <MatchDialog
          transaction={matching}
          companyId={companyId}
          currency={currency}
          onClose={() => setMatching(null)}
        />
      )}
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
