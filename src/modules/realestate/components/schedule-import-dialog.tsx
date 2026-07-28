import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Wand2 } from "lucide-react";
import * as XLSX from "xlsx";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import {
  buildReviewRows,
  generateSchedule,
  reviewRow,
  REVISION_REASONS,
  type ReviewRow,
} from "@/modules/realestate/financing-schemas";
import {
  commitScheduleImport,
  stageScheduleImport,
} from "@/modules/realestate/financing.functions";
import type { AgreementRow } from "@/modules/realestate/financing-queries";

type Props = { agreement: AgreementRow; disabled?: boolean };

/**
 * Two-step workflow: build or import instalments, review them, then confirm.
 * Nothing reaches the live schedule until "Confirm and commit" is pressed.
 */
export function ScheduleImportDialog({ agreement, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [source, setSource] = useState<"manual" | "csv" | "xlsx">("manual");
  const [fileName, setFileName] = useState<string>();
  const [importId, setImportId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [meta, setMeta] = useState({
    effectiveFrom: agreement.start_date ?? today,
    reason: "origination",
    notes: "",
    rateApplied: "",
  });
  const [gen, setGen] = useState({
    principal: String(agreement.principal ?? 0),
    annualRatePct: agreement.fixed_rate ? String(agreement.fixed_rate) : "3.5",
    termMonths: agreement.term_months ? String(agreement.term_months) : "240",
    firstDueDate: agreement.start_date ?? today,
    monthlyInsurance: "0",
    monthlyCommission: "0",
    vatRatePct: "23",
  });

  const stage = useServerFn(stageScheduleImport);
  const commit = useServerFn(commitScheduleImport);

  const included = rows.filter((r) => r.include);
  const totals = useMemo(
    () =>
      included.reduce(
        (acc, r) => ({
          principal: acc.principal + (r.principal ?? 0),
          interest: acc.interest + (r.interest ?? 0),
          vat: acc.vat + (r.vat ?? 0),
          commissions: acc.commissions + (r.commissions ?? 0),
          total: acc.total + (r.total_payment ?? 0),
        }),
        { principal: 0, interest: 0, vat: 0, commissions: 0, total: 0 },
      ),
    [included],
  );

  function reset() {
    setStep("input");
    setRows([]);
    setImportId(null);
    setFileName(undefined);
  }

  async function onFile(file: File) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
    const parsed = buildReviewRows(table as unknown[][]);
    if (!parsed.length) {
      toast.error("No instalments recognised in that file");
      return;
    }
    setRows(parsed);
    setFileName(file.name);
    setSource(file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx");
    setStep("review");
  }

  function onGenerate() {
    const generated = generateSchedule({
      principal: Number(gen.principal) || 0,
      annualRatePct: Number(gen.annualRatePct) || 0,
      termMonths: Number(gen.termMonths) || 0,
      firstDueDate: gen.firstDueDate,
      repaymentType: agreement.repayment_type ?? "annuity",
      monthlyInsurance: Number(gen.monthlyInsurance) || 0,
      monthlyCommission: Number(gen.monthlyCommission) || 0,
      vatRatePct: Number(gen.vatRatePct) || 0,
    });
    if (!generated.length) {
      toast.error("Check the principal, rate and term");
      return;
    }
    setRows(generated.map(reviewRow));
    setSource("manual");
    setFileName(undefined);
    setStep("review");
  }

  const stageMutation = useMutation({
    mutationFn: async () => {
      const res = (await stage({
        data: {
          agreementId: agreement.id,
          source,
          fileName,
          effectiveFrom: meta.effectiveFrom,
          reason: meta.reason,
          rateApplied: meta.rateApplied ? Number(meta.rateApplied) : undefined,
          notes: meta.notes || undefined,
          rows: included.map(({ issues: _i, include: _inc, ...r }) => r),
        },
      })) as { importId: string; errorCount: number };
      return res;
    },
    onSuccess: (res) => {
      setImportId(res.importId);
      toast.success("Import staged for confirmation");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!importId) throw new Error("Stage the import first");
      return commit({ data: { importId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financing-schedule", agreement.id] });
      queryClient.invalidateQueries({ queryKey: ["financing-versions", agreement.id] });
      queryClient.invalidateQueries({ queryKey: ["financing-imports", agreement.id] });
      queryClient.invalidateQueries({ queryKey: ["financing-cash-flow", agreement.id] });
      queryClient.invalidateQueries({ queryKey: ["financing-agreement", agreement.id] });
      toast.success("Schedule version committed");
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const blocking = included.filter((r) => r.issues.length > 0).length;

  return (
    <>
      <Button size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <FileSpreadsheet className="size-4" /> Build / import schedule
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {step === "input" ? "Build or import a repayment schedule" : "Review before committing"}
            </DialogTitle>
            <DialogDescription>
              A new version replaces only future, unreconciled instalments from the effective date.
              Settled and reconciled instalments are never touched.
            </DialogDescription>
          </DialogHeader>

          {step === "input" ? (
            <div className="space-y-6">
              <section className="rounded-lg border border-border p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <FileSpreadsheet className="size-4" /> Import a CSV or XLSX schedule
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Choose file
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Recognised columns: period, due date, opening balance, interest, principal, VAT,
                  commissions, insurance, fees, total, closing balance (English or Portuguese
                  headings). PDF extraction is not part of this phase.
                </p>
              </section>

              <section className="rounded-lg border border-border p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Wand2 className="size-4" /> Or build one from the contract terms
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["principal", "Principal"],
                      ["annualRatePct", "Annual rate %"],
                      ["termMonths", "Term (months)"],
                      ["firstDueDate", "First due date"],
                      ["monthlyInsurance", "Monthly insurance"],
                      ["monthlyCommission", "Monthly commission"],
                      ["vatRatePct", "VAT % on commission"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <Label className="mb-1.5 block text-sm">{label}</Label>
                      <Input
                        type={key === "firstDueDate" ? "date" : "text"}
                        value={gen[key]}
                        onChange={(e) => setGen((g) => ({ ...g, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <Button className="mt-3" size="sm" variant="outline" onClick={onGenerate}>
                  Generate instalments
                </Button>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <Label className="mb-1.5 block text-sm">Effective from</Label>
                  <Input
                    type="date"
                    value={meta.effectiveFrom}
                    onChange={(e) => setMeta((m) => ({ ...m, effectiveFrom: e.target.value }))}
                    disabled={Boolean(importId)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">Reason</Label>
                  <Select
                    value={meta.reason}
                    onValueChange={(v) => setMeta((m) => ({ ...m, reason: v }))}
                    disabled={Boolean(importId)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REVISION_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">Rate applied %</Label>
                  <Input
                    value={meta.rateApplied}
                    onChange={(e) => setMeta((m) => ({ ...m, rateApplied: e.target.value }))}
                    disabled={Boolean(importId)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">Notes</Label>
                  <Textarea
                    rows={1}
                    value={meta.notes}
                    onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
                    disabled={Boolean(importId)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
                <Badge variant="secondary">{included.length} instalments</Badge>
                <span>Principal {formatMoneyPrecise(totals.principal, agreement.currency)}</span>
                <span>Interest {formatMoneyPrecise(totals.interest, agreement.currency)}</span>
                <span>VAT {formatMoneyPrecise(totals.vat, agreement.currency)}</span>
                <span>Commissions {formatMoneyPrecise(totals.commissions, agreement.currency)}</span>
                <span className="font-medium">
                  Total cash {formatMoneyPrecise(totals.total, agreement.currency)}
                </span>
                {blocking ? (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="size-4" /> {blocking} row(s) with issues
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle2 className="size-4" /> All rows valid
                  </span>
                )}
              </div>

              <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>#</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Commissions</TableHead>
                      <TableHead className="text-right">Insurance</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={r.line_no} className={r.issues.length ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={r.include}
                            disabled={Boolean(importId)}
                            onCheckedChange={(v) =>
                              setRows((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, include: Boolean(v) } : p)),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>{r.period_no}</TableCell>
                        <TableCell>{formatDate(r.due_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(r.principal, agreement.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(r.interest, agreement.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(r.vat, agreement.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(r.commissions, agreement.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(r.insurance, agreement.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoneyPrecise(r.total_payment, agreement.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyPrecise(r.closing_balance, agreement.currency)}
                        </TableCell>
                        <TableCell className="text-xs text-destructive">
                          {r.issues.join("; ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step === "review" ? (
              <>
                <Button variant="outline" onClick={reset} disabled={commitMutation.isPending}>
                  Back
                </Button>
                {importId ? (
                  <Button onClick={() => commitMutation.mutate()} disabled={commitMutation.isPending}>
                    Confirm and commit
                  </Button>
                ) : (
                  <Button
                    onClick={() => stageMutation.mutate()}
                    disabled={stageMutation.isPending || blocking > 0 || !included.length}
                  >
                    Stage for confirmation
                  </Button>
                )}
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
