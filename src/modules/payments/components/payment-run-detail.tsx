/**
 * Payment run workspace — lifecycle, batches, instructions and bank exports.
 *
 * The run orchestrates execution only. Every amount shown is read from the
 * invoice behind the instruction, the approval is the generic engine's, and
 * the bank file is produced by an export adapter — none of which this screen
 * is allowed to shortcut.
 */

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import { generateExport } from "@/modules/payments/export-adapters";
import type {
  PaymentBatchSummary,
  PaymentInstructionDetail,
  PaymentRunExport,
  PaymentRunSummary,
} from "@/modules/payments/queries";
import type { PaymentCapabilities } from "@/modules/payments/capabilities";
import {
  EXPORT_FORMATS,
  PAYMENT_METHODS,
  PAYMENT_RUN_LIFECYCLE,
  labelOf,
  type ExportFormat,
} from "@/modules/payments/schemas";
import type { PaymentActions } from "@/modules/payments/server";
import { InstructionPicker } from "./instruction-picker";
import { InstructionStatusBadge, RunStatusBadge } from "./status-badge";

function download(fileName: string, mimeType: string, content: string) {
  if (typeof window === "undefined" || typeof URL.createObjectURL !== "function") return;
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function PaymentRunDetail({
  companyId,
  run,
  batches,
  instructions,
  exports: exportRows,
  actions,
  capabilities,
}: {
  companyId: string | undefined;
  run: PaymentRunSummary;
  batches: PaymentBatchSummary[];
  instructions: PaymentInstructionDetail[];
  exports: PaymentRunExport[];
  actions: PaymentActions;
  capabilities: PaymentCapabilities;
}) {
  const [format, setFormat] = useState<ExportFormat>("sepa_xml");
  const [reason, setReason] = useState("");

  const live = useMemo(
    () => instructions.filter((i) => i.status !== "cancelled"),
    [instructions],
  );

  const isDraft = run.status === "draft";
  const canBuild = capabilities.canRecord && isDraft;

  const runExport = async () => {
    const payload = {
      runReference: run.reference,
      runTitle: run.title,
      companyName: "Pedra Rioja",
      executionDate: run.scheduled_execution_date ?? new Date().toISOString().slice(0, 10),
      instructions: live.map((i) => ({
        instructionId: i.instruction_id,
        documentNumber: i.document_number,
        counterpartyName: i.counterparty_name,
        iban: null,
        currency: i.currency,
        amount: Number(i.outstanding_amount ?? 0),
        dueDate: i.due_date,
        reference: i.payment_reference,
        method: i.payment_method,
      })),
    };
    let file;
    try {
      file = generateExport(format, payload);
    } catch {
      return;
    }
    const result = await actions.run("export", {
      runId: run.payment_run_id,
      format,
      fileName: file.fileName,
      contentHash: file.contentHash,
    });
    if (result) download(file.fileName, file.mimeType, file.content);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              {run.reference} — {run.title}
            </CardTitle>
            <RunStatusBadge status={run.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="flex flex-wrap gap-2 text-xs">
            {PAYMENT_RUN_LIFECYCLE.map((step) => {
              const index = PAYMENT_RUN_LIFECYCLE.indexOf(step);
              const current = PAYMENT_RUN_LIFECYCLE.indexOf(run.status as never);
              const reached = current >= index && run.status !== "cancelled";
              return (
                <li
                  key={step}
                  className={cn(
                    "rounded-full border px-3 py-1",
                    reached
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {step.replace(/_/g, " ")}
                </li>
              );
            })}
          </ol>

          <dl className="grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Outstanding</dt>
              <dd className="font-medium">{formatMoneyPrecise(run.outstanding_total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Payments</dt>
              <dd className="font-medium">{run.instruction_count}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Scheduled</dt>
              <dd className="font-medium">{formatDate(run.scheduled_execution_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Executed</dt>
              <dd className="font-medium">{formatDate(run.actual_execution_date)}</dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            A payment run orchestrates execution only. It posts no accounting entry, creates no bank
            transaction and writes no cash-flow row — settlement is recorded when the payment is
            reconciled in banking.
          </p>

          <div className="flex flex-wrap items-end gap-2">
            {isDraft ? (
              <>
                <InstructionPicker
                  companyId={companyId}
                  runId={run.payment_run_id}
                  actions={actions}
                  instructions={instructions}
                  disabled={!capabilities.canRecord}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!capabilities.canRecord || live.length === 0 || actions.isPending}
                  onClick={() =>
                    actions.run("requestApproval", { runId: run.payment_run_id })
                  }
                >
                  Request authority to pay
                </Button>
              </>
            ) : null}

            {run.status === "approved" || run.status === "exported" ? (
              <div className="flex items-end gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Bank format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                    <SelectTrigger className="h-9 w-64" aria-label="Bank export format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPORT_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={runExport}
                  disabled={!capabilities.canRecord || actions.isPending}
                >
                  <Download className="size-4" /> Generate bank file
                </Button>
              </div>
            ) : null}

            {run.status === "exported" ? (
              <Button
                size="sm"
                disabled={!capabilities.canManage || actions.isPending}
                onClick={() => actions.run("execute", { runId: run.payment_run_id })}
              >
                Mark as executed
              </Button>
            ) : null}

            {run.status === "executed" ? (
              <Button
                size="sm"
                disabled={!capabilities.canManage || actions.isPending}
                onClick={() => actions.run("complete", { runId: run.payment_run_id })}
              >
                Complete run
              </Button>
            ) : null}

            {["draft", "pending_approval", "approved", "exported"].includes(run.status) ? (
              <div className="flex items-end gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs" htmlFor="cancel-reason">
                    Cancellation reason
                  </Label>
                  <Input
                    id="cancel-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-9 w-56"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!capabilities.canManage || reason.trim().length < 3 || actions.isPending}
                  onClick={() => actions.run("cancel", { runId: run.payment_run_id, reason })}
                >
                  Cancel run
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Batches appear as soon as invoices are added — one per supplier and currency.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Export</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.batch_id}>
                    <TableCell>{b.execution_order}</TableCell>
                    <TableCell className="font-medium">{b.counterparty_name ?? "—"}</TableCell>
                    <TableCell>{b.currency}</TableCell>
                    <TableCell>{b.export_status}</TableCell>
                    <TableCell className="text-right">{b.instruction_count}</TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(b.outstanding_total, b.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment instructions</CardTitle>
        </CardHeader>
        <CardContent>
          {instructions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No invoices in this run yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructions.map((i) => (
                  <TableRow key={i.instruction_id}>
                    <TableCell className="font-medium">{i.document_number ?? "—"}</TableCell>
                    <TableCell>{i.counterparty_name ?? "—"}</TableCell>
                    <TableCell>{formatDate(i.due_date)}</TableCell>
                    <TableCell>{labelOf(PAYMENT_METHODS, i.payment_method)}</TableCell>
                    <TableCell>
                      <InstructionStatusBadge status={i.status} />
                      {i.failure_reason ? (
                        <span className="ml-2 text-xs text-destructive">{i.failure_reason}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(i.outstanding_amount, i.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canBuild && i.status !== "cancelled" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actions.isPending}
                          onClick={() =>
                            actions.run("removeInstruction", { instructionId: i.instruction_id })
                          }
                        >
                          Remove
                        </Button>
                      ) : null}
                      {run.status === "executed" && i.status === "executed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!capabilities.canManage || actions.isPending}
                          onClick={() =>
                            actions.run("failInstruction", {
                              instructionId: i.instruction_id,
                              reason: "Returned by the bank",
                            })
                          }
                        >
                          Mark failed
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bank exports</CardTitle>
        </CardHeader>
        <CardContent>
          {exportRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No bank file has been generated for this run.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Generated</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportRows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.generated_at)}</TableCell>
                    <TableCell>{labelOf(EXPORT_FORMATS, e.format)}</TableCell>
                    <TableCell>{e.file_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{e.content_hash ?? "—"}</TableCell>
                    <TableCell className="text-right">{e.instruction_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
