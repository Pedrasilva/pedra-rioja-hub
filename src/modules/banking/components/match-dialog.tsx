import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Link2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import {
  DEFAULT_AMOUNT_TOLERANCE,
  DEFAULT_DATE_TOLERANCE,
} from "@/modules/banking/schemas";
import { confirmBankMatch, suggestMatches } from "@/modules/banking/banking.functions";
import { useExpectedItems, type BankTransaction } from "@/modules/banking/queries";

type Suggestion = {
  entry_id: string;
  description: string | null;
  expected_date: string | null;
  amount_total: number | string | null;
  outstanding: number | string | null;
  category: string | null;
  counterparty_name: string | null;
  source_type: string | null;
  score: number;
  reasons: string[] | null;
};

/**
 * Suggestions are scored server-side but never applied automatically — the
 * user confirms every allocation, and only settlement state changes.
 */
export function MatchDialog({
  transaction,
  companyId,
  currency,
  onClose,
}: {
  transaction: BankTransaction;
  companyId: string;
  currency: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amountTolerance, setAmountTolerance] = useState(String(DEFAULT_AMOUNT_TOLERANCE));
  const [dateTolerance, setDateTolerance] = useState(String(DEFAULT_DATE_TOLERANCE));
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const suggest = useServerFn(suggestMatches);
  const confirm = useServerFn(confirmBankMatch);

  const outstanding = Math.abs(transaction.amount) - Math.abs(transaction.matched_amount ?? 0);

  const suggestions = useQuery({
    queryKey: ["bank-suggestions", transaction.id, amountTolerance, dateTolerance],
    queryFn: async () =>
      (await suggest({
        data: {
          bankTransactionId: transaction.id,
          amountTolerance: Number(amountTolerance) || DEFAULT_AMOUNT_TOLERANCE,
          dateTolerance: Number(dateTolerance) || DEFAULT_DATE_TOLERANCE,
        },
      })) as Suggestion[],
  });

  const all = useExpectedItems(companyId, { search });
  const manualPool = useMemo(() => {
    const ids = new Set((suggestions.data ?? []).map((s) => s.entry_id));
    const term = search.trim().toLowerCase();
    return (all.data ?? [])
      .filter((e) => e.entry_id && !ids.has(e.entry_id))
      .filter((e) =>
        term
          ? `${e.description ?? ""} ${e.counterparty_name ?? ""} ${e.property_code ?? ""}`
              .toLowerCase()
              .includes(term)
          : false,
      )
      .slice(0, 20);
  }, [all.data, suggestions.data, search]);

  const allocatedTotal = Object.values(selected).reduce((s, v) => s + (Number(v) || 0), 0);
  const variance = Math.round((outstanding - allocatedTotal) * 100) / 100;

  function toggle(entryId: string, defaultAmount: number) {
    setSelected((prev) => {
      if (entryId in prev) {
        const next = { ...prev };
        delete next[entryId];
        return next;
      }
      const remaining = Math.max(
        0,
        Math.round((outstanding - Object.values(prev).reduce((s, v) => s + (Number(v) || 0), 0)) * 100) /
          100,
      );
      return { ...prev, [entryId]: String(Math.min(defaultAmount, remaining) || defaultAmount) };
    });
  }

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const allocations = Object.entries(selected)
        .map(([entryId, amount]) => ({ entryId, amount: Number(amount) }))
        .filter((a) => a.amount > 0);
      if (!allocations.length) throw new Error("Allocate at least one expected item");
      return confirm({
        data: {
          bankTransactionId: transaction.id,
          allocations: allocations.map((a) => ({
            ...a,
            matchType: allocations.length > 1 ? "allocation" : variance !== 0 ? "partial" : "manual",
            varianceReason: variance !== 0 ? notes || "Variance recorded at reconciliation" : undefined,
          })),
          notes: notes || undefined,
        },
      });
    },
    onSuccess: () => {
      for (const key of [
        "bank-transactions",
        "bank-expected-items",
        "bank-matches",
        "bank-account-balances",
        "bank-exceptions",
        "cash-flow-entries",
        "cash-flow-monthly",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success("Match confirmed");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: Suggestion[] = [
    ...(suggestions.data ?? []),
    ...manualPool.map((e) => ({
      entry_id: e.entry_id as string,
      description: e.description as string | null,
      expected_date: e.expected_date as string | null,
      amount_total: e.expected_amount,
      outstanding: e.outstanding_amount,
      category: e.category as string | null,
      counterparty_name: e.counterparty_name as string | null,
      source_type: e.source_type as string | null,
      score: 0,
      reasons: ["Manual search"],
    })),
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Reconcile bank movement</DialogTitle>
          <DialogDescription>
            {formatDate(transaction.transaction_date)} · {transaction.description ?? "—"} ·{" "}
            {formatMoneyPrecise(transaction.amount, currency)} — outstanding{" "}
            {formatMoneyPrecise(outstanding, currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">Amount tolerance</Label>
              <Input
                className="w-28"
                type="number"
                step="0.01"
                value={amountTolerance}
                onChange={(e) => setAmountTolerance(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Date tolerance (days)</Label>
              <Input
                className="w-28"
                type="number"
                value={dateTolerance}
                onChange={(e) => setDateTolerance(e.target.value)}
              />
            </div>
            <div className="grid flex-1 gap-1">
              <Label className="text-xs">Search all expected items</Label>
              <Input
                placeholder="Supplier, description or property code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[40vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Expected item</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Why</TableHead>
                  <TableHead className="w-32 text-right">Allocate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {suggestions.isLoading
                        ? "Looking for candidates…"
                        : "No suggestion within tolerance — widen the tolerances or search above."}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((s) => {
                  const out = Number(s.outstanding ?? s.amount_total ?? 0);
                  const checked = s.entry_id in selected;
                  return (
                    <TableRow key={s.entry_id}>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(s.entry_id, Math.abs(out))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.description ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.counterparty_name ?? s.category ?? "—"} · {s.source_type ?? "manual"}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(s.expected_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyPrecise(out, currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.score > 0 && (
                          <Badge variant="secondary" className="mr-1">
                            <Sparkles className="mr-1 h-3 w-3" />
                            {s.score}
                          </Badge>
                        )}
                        {(s.reasons ?? []).join(", ")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="h-8 text-right"
                          type="number"
                          step="0.01"
                          disabled={!checked}
                          value={selected[s.entry_id] ?? ""}
                          onChange={(e) =>
                            setSelected((p) => ({ ...p, [s.entry_id]: e.target.value }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Allocated {formatMoneyPrecise(allocatedTotal, currency)}</span>
            <Badge variant={Math.abs(variance) > 0.009 ? "destructive" : "secondary"}>
              Variance {formatMoneyPrecise(variance, currency)}
            </Badge>
            {Math.abs(variance) > 0.009 && (
              <span className="text-xs text-muted-foreground">
                Recorded as a partial settlement or bank fee — the expected amount stays owned by
                its source module.
              </span>
            )}
          </div>

          <div className="grid gap-1">
            <Label className="text-xs">Notes / variance reason</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
            <Link2 className="mr-2 h-4 w-4" />
            Confirm match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
