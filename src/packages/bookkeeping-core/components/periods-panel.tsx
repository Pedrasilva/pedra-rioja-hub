import { useState } from "react";
import { Lock, Plus, RefreshCw, Unlock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { formatDate, formatMoneyPrecise, titleCase } from "../format";
import {
  useClosePeriod,
  useCreatePeriod,
  useRecomputePeriodTotals,
  useReopenPeriod,
} from "../mutations";
import type { BookkeepingCapabilities } from "../capabilities";
import { useFinancialPeriods, usePeriodDocuments, usePeriodTotals } from "../queries";
import { OptionSelect } from "./selectors";

export function PeriodsPanel({
  companyId,
  capabilities,
}: {
  companyId: string;
  capabilities: BookkeepingCapabilities;
}) {
  const { data: periods } = useFinancialPeriods(companyId);
  const create = useCreatePeriod();
  const recompute = useRecomputePeriodTotals();
  const closePeriod = useClosePeriod();
  const reopenPeriod = useReopenPeriod();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    code: "",
    periodType: "quarter",
    periodStart: "",
    periodEnd: "",
  });

  const activeId = selected ?? periods?.[0]?.id ?? null;
  const activePeriod = (periods ?? []).find((p) => p.id === activeId) ?? null;
  const { data: totals } = usePeriodTotals(activeId ?? undefined);
  const { data: docs } = usePeriodDocuments(companyId, activeId ?? undefined);

  const docSummary = (docs ?? []).reduce(
    (acc, d) => {
      acc.count += 1;
      acc.vat += Number(d.vat_amount);
      acc.gross += Number(d.gross_amount);
      if (d.status === "draft") acc.drafts += 1;
      return acc;
    },
    { count: 0, drafts: 0, vat: 0, gross: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Periods are a reporting lens for VAT and management reviews — totals are recomputed from
          posted documents, never typed in.
        </p>
        {capabilities.canManage ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New period
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Periods</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(periods ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No periods defined yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  periods!.map((p) => (
                    <TableRow
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      className={p.id === activeId ? "bg-muted/60" : "cursor-pointer"}
                    >
                      <TableCell className="font-medium">{p.code}</TableCell>
                      <TableCell className="text-xs">
                        {formatDate(p.period_start)} → {formatDate(p.period_end)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "open" ? "secondary" : "outline"}>
                          {titleCase(p.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Period totals</CardTitle>
            <div className="flex gap-2">
              {capabilities.canRecomputePeriods && activeId ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={recompute.isPending}
                  onClick={() => recompute.mutate({ periodId: activeId })}
                >
                  <RefreshCw className="size-4" /> Recompute
                </Button>
              ) : null}
              {capabilities.canClosePeriods && activePeriod ? (
                activePeriod.status === "open" ? (
                  <Button
                    size="sm"
                    disabled={closePeriod.isPending || docSummary.drafts > 0}
                    title={
                      docSummary.drafts > 0
                        ? "Post or cancel the remaining drafts before closing"
                        : undefined
                    }
                    onClick={() => closePeriod.mutate({ periodId: activePeriod.id })}
                  >
                    <Lock className="size-4" /> Close period
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reopenPeriod.isPending}
                    onClick={() => {
                      const reason = window.prompt("Why is this period being reopened?");
                      if (reason && reason.trim().length >= 3)
                        reopenPeriod.mutate({ periodId: activePeriod.id, reason: reason.trim() });
                    }}
                  >
                    <Unlock className="size-4" /> Reopen
                  </Button>
                )
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Documents" value={String(docSummary.count)} />
              <Figure label="Drafts" value={String(docSummary.drafts)} />
              <Figure label="VAT" value={formatMoneyPrecise(docSummary.vat)} />
              <Figure label="Gross" value={formatMoneyPrecise(docSummary.gross)} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bucket</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(totals ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No totals computed for this period yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  totals!.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{titleCase(t.bucket)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoneyPrecise(Number(t.net_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoneyPrecise(Number(t.vat_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoneyPrecise(Number(t.gross_amount))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New period</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="period-code">Code</Label>
              <Input
                id="period-code"
                placeholder="2026-Q3"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <OptionSelect
                aria-label="Period type"
                allowNone={false}
                value={draft.periodType}
                onChange={(v) => setDraft({ ...draft, periodType: v ?? "quarter" })}
                options={[
                  { value: "month", label: "Month" },
                  { value: "quarter", label: "Quarter" },
                  { value: "year", label: "Year" },
                ]}
              />
            </div>
            <div>
              <Label htmlFor="period-start">Start</Label>
              <Input
                id="period-start"
                type="date"
                value={draft.periodStart}
                onChange={(e) => setDraft({ ...draft, periodStart: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="period-end">End</Label>
              <Input
                id="period-end"
                type="date"
                value={draft.periodEnd}
                onChange={(e) => setDraft({ ...draft, periodEnd: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !draft.code.trim() || !draft.periodStart || !draft.periodEnd || create.isPending
              }
              onClick={() =>
                create.mutate(
                  {
                    companyId,
                    code: draft.code.trim(),
                    periodType: draft.periodType as "quarter",
                    periodStart: draft.periodStart,
                    periodEnd: draft.periodEnd,
                    notes: null,
                  },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              Create period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
