/**
 * Drawdown panel.
 *
 * A drawdown *consumes* commitment capacity against a posted supplier
 * document. It never edits the document, never changes an amount that
 * bookkeeping owns, and never deletes anything: an incorrect allocation is
 * reversed, which keeps both rows and shows the lineage between them.
 *
 * One document can be allocated across several commitments and can be drawn
 * partially, so the editor works on a list of allocation rows.
 */

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import type {
  CommitmentSummary,
  DocumentOption,
  DrawdownRow,
  ScheduleLineRow,
} from "@/modules/commitments/queries";
import { drawdownSchema, labelOf } from "@/modules/commitments/schemas";
import type { CommitmentActions } from "@/modules/commitments/server";
import { StatusBadge } from "./status-badge";

const NONE = "__none__";

type Allocation = {
  key: string;
  commitmentId: string;
  scheduleLineId: string;
  amount: string;
};

let seq = 0;
const nextKey = () => `alloc-${(seq += 1)}`;

export function DrawdownPanel({
  currency,
  summary,
  allSummaries,
  drawdowns,
  lines,
  documents,
  capabilities,
  actions,
}: {
  currency: string;
  summary: CommitmentSummary | null;
  allSummaries: CommitmentSummary[];
  drawdowns: DrawdownRow[];
  lines: ScheduleLineRow[];
  documents: DocumentOption[];
  capabilities: CommitmentCapabilities;
  actions: CommitmentActions;
}) {
  const [open, setOpen] = useState(false);
  const [documentId, setDocumentId] = useState("");
  const [drawdownDate, setDrawdownDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Allocation[]>([]);
  const [reversalReason, setReversalReason] = useState<Record<string, string>>({});

  const doc = documents.find((d) => d.id === documentId) ?? null;
  const allocated = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const documentTotal = Number(doc?.payable_amount ?? doc?.gross_amount ?? 0);
  const overAllocated = doc ? allocated - documentTotal > 0.005 : false;

  const drawdownById = useMemo(() => new Map(drawdowns.map((d) => [d.id, d])), [drawdowns]);
  const netDrawn = drawdowns
    .filter((d) => d.status === "active")
    .reduce((s, d) => s + Number(d.amount), 0);

  const openable = capabilities.canRecord && summary?.status === "active";

  function reset(commitmentId: string) {
    setError(null);
    setDocumentId("");
    setDrawdownDate(new Date().toISOString().slice(0, 10));
    setRows([{ key: nextKey(), commitmentId, scheduleLineId: NONE, amount: "" }]);
  }

  function update(key: string, patch: Partial<Allocation>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setError(null);
    if (!documentId) {
      setError("Select the posted supplier document this drawdown consumes");
      return;
    }
    const parsedRows = [];
    for (const r of rows) {
      const parsed = drawdownSchema.safeParse({
        commitmentId: r.commitmentId,
        documentId,
        amount: r.amount,
        scheduleLineId: r.scheduleLineId === NONE ? null : r.scheduleLineId,
        drawdownDate: drawdownDate || null,
        kind: "allocation",
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check the allocation lines");
        return;
      }
      parsedRows.push(parsed.data);
    }
    if (overAllocated) {
      setError("The allocated total exceeds the document's payable amount");
      return;
    }
    for (const payload of parsedRows) {
      const result = await actions.run("createDrawdown", payload);
      if (!result) return;
    }
    setOpen(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Drawdowns</CardTitle>
            <CardDescription>
              Posted supplier documents consume this commitment. Amounts stay owned by bookkeeping.
            </CardDescription>
          </div>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (v && summary) reset(summary.commitment_id);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={!openable}>
                <Plus className="mr-1.5 h-4 w-4" /> Record drawdown
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Record drawdown</DialogTitle>
                <DialogDescription>
                  Allocate a posted document across one or more active commitments. Partial
                  allocations are allowed.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="dd-document">Posted document</Label>
                  <Select value={documentId} onValueChange={setDocumentId}>
                    <SelectTrigger id="dd-document">
                      <SelectValue placeholder="Select a document" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.document_number ?? d.id.slice(0, 8)} · {d.counterparty_name ?? "—"} ·{" "}
                          {formatMoneyPrecise(d.payable_amount, d.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dd-date">Drawdown date</Label>
                  <Input
                    id="dd-date"
                    type="date"
                    value={drawdownDate}
                    onChange={(e) => setDrawdownDate(e.target.value)}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commitment</TableHead>
                    <TableHead>Schedule line</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const target = allSummaries.find((s) => s.commitment_id === r.commitmentId);
                    const lineOptions =
                      r.commitmentId === summary?.commitment_id
                        ? lines.filter((l) => l.status === "scheduled")
                        : [];
                    return (
                      <TableRow key={r.key}>
                        <TableCell>
                          <Select
                            value={r.commitmentId}
                            onValueChange={(v) =>
                              update(r.key, { commitmentId: v, scheduleLineId: NONE })
                            }
                          >
                            <SelectTrigger aria-label={`Commitment allocation ${i + 1}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allSummaries
                                .filter((s) => s.status === "active")
                                .map((s) => (
                                  <SelectItem key={s.commitment_id} value={s.commitment_id}>
                                    {s.title} ·{" "}
                                    {formatMoneyPrecise(s.available_drawdown, s.currency)} available
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={r.scheduleLineId}
                            onValueChange={(v) => update(r.key, { scheduleLineId: v })}
                          >
                            <SelectTrigger aria-label={`Schedule line allocation ${i + 1}`}>
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Unassigned</SelectItem>
                              {lineOptions.map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                  #{l.line_no} · {formatDate(l.expected_date)} ·{" "}
                                  {formatMoneyPrecise(l.amount, currency)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="decimal"
                            className="text-right"
                            aria-label={`Amount allocation ${i + 1}`}
                            value={r.amount}
                            onChange={(e) => update(r.key, { amount: e.target.value })}
                          />
                          {target ? (
                            <span className="text-xs text-muted-foreground">
                              {formatMoneyPrecise(target.available_drawdown, target.currency)}{" "}
                              available
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove allocation ${i + 1}`}
                            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRows((rs) => [
                      ...rs,
                      {
                        key: nextKey(),
                        commitmentId: summary?.commitment_id ?? "",
                        scheduleLineId: NONE,
                        amount: "",
                      },
                    ])
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add allocation
                </Button>
                <span>
                  <span className="text-muted-foreground">Allocated </span>
                  {formatMoneyPrecise(allocated, currency)}
                  {doc ? (
                    <>
                      <span className="text-muted-foreground"> of </span>
                      {formatMoneyPrecise(documentTotal, doc.currency)}
                    </>
                  ) : null}
                </span>
              </div>

              {overAllocated ? (
                <p role="alert" className="text-sm text-destructive">
                  The allocated total exceeds the document's payable amount.
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={actions.isPending}>
                  Record drawdown
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm">
          <span className="text-muted-foreground">Net drawn </span>
          {formatMoneyPrecise(netDrawn, currency)}
          {summary ? (
            <>
              <span className="text-muted-foreground"> · available </span>
              {formatMoneyPrecise(summary.available_drawdown, currency)}
            </>
          ) : null}
        </p>

        {drawdowns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been drawn down yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lineage</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {drawdowns.map((d) => {
                const original = d.reverses_drawdown_id
                  ? drawdownById.get(d.reverses_drawdown_id)
                  : null;
                return (
                  <TableRow key={d.id}>
                    <TableCell>{formatDate(d.drawdown_date)}</TableCell>
                    <TableCell>{labelOf(d.kind)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyPrecise(d.amount, currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {original
                        ? `Reverses ${formatMoneyPrecise(original.amount, currency)} of ${formatDate(original.drawdown_date)}`
                        : d.status === "reversed"
                          ? `Reversed${d.reversal_reason ? `: ${d.reversal_reason}` : ""}`
                          : "—"}
                    </TableCell>
                    <TableCell>
                      {capabilities.canManage && d.status === "active" && d.kind !== "reversal" ? (
                        <div className="flex items-center gap-2">
                          <Input
                            aria-label={`Reversal reason ${d.id}`}
                            placeholder="Reason"
                            className="h-8 w-40"
                            value={reversalReason[d.id] ?? ""}
                            onChange={(e) =>
                              setReversalReason((s) => ({ ...s, [d.id]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              actions.isPending || (reversalReason[d.id] ?? "").trim().length < 3
                            }
                            onClick={() =>
                              actions.run("reverseDrawdown", {
                                drawdownId: d.id,
                                reason: reversalReason[d.id],
                              })
                            }
                          >
                            Reverse
                          </Button>
                        </div>
                      ) : null}
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
