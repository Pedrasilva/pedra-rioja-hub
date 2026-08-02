import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, FileCheck2, Landmark, ListPlus, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  applyDocumentExtraction,
  getLatestExtraction,
  requestDocumentExtraction,
} from "@/modules/realestate/extraction.functions";
import {
  applyBankStatementExtraction,
  applyInvoiceExtraction,
} from "@/modules/bookkeeping/extraction-bridge.functions";
import { StatementImportDialog } from "@/modules/banking/components/statement-import-dialog";
import { useBankAccountsList } from "@/modules/banking/queries";
import {
  LeaseScheduleImportDialog,
  type ExtractedInstallment,
} from "@/modules/realestate/components/lease-schedule-import-dialog";


type Props = {
  companyId: string;
  documentId: string;
  currency: string;
  propertyId?: string;
  disabled?: boolean;
};


/**
 * Per-document "Extract with Claude" button. Runs extraction on demand
 * (never automatically on upload, so nothing costs money or blocks the
 * upload flow unless the person asks for it), then shows the result in a
 * review dialog where every field stays editable before "Apply" writes
 * anything onto the document record. Kind-specific details (transactions,
 * instalments, loan terms) are shown read-only for now — they're reference
 * material, not yet wired into banking or financing records.
 */
export function DocumentExtractionButton({
  companyId,
  documentId,
  currency,
  propertyId,
  disabled,
}: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [stagedImportId, setStagedImportId] = useState<string | null>(null);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const bankAccounts = useBankAccountsList(companyId);


  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const requestFn = useServerFn(requestDocumentExtraction);
  const latestFn = useServerFn(getLatestExtraction);
  const applyFn = useServerFn(applyDocumentExtraction);

  const latest = useQuery({
    queryKey: ["document-extraction", documentId],
    queryFn: () => latestFn({ data: { companyId, documentId } }),
    enabled: open,
  });

  const [form, setForm] = useState({
    title: "",
    issueDate: "",
    expiryDate: "",
    amount: "",
    currency,
  });

  const run = useMutation({
    mutationFn: () => requestFn({ data: { companyId, documentId } }),
    onSuccess: (result) => {
      setForm({
        title: result.core_fields.title ?? "",
        issueDate: result.core_fields.issue_date ?? "",
        expiryDate: result.core_fields.expiry_date ?? "",
        amount: result.core_fields.amount != null ? String(result.core_fields.amount) : "",
        currency: result.core_fields.currency ?? currency,
      });
      queryClient.invalidateQueries({ queryKey: ["document-extraction", documentId] });
      toast.success("Extraction complete — review the fields below");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extraction = latest.data;

  const apply = useMutation({
    mutationFn: () => {
      if (!extraction) throw new Error("Nothing to apply yet");
      return applyFn({
        data: {
          companyId,
          documentId,
          extractionId: extraction.id,
          coreFields: {
            title: form.title || undefined,
            issueDate: form.issueDate || undefined,
            expiryDate: form.expiryDate || undefined,
            amount: form.amount ? Number(form.amount) : undefined,
            currency: form.currency || undefined,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Applied to the document");
      queryClient.invalidateQueries({ queryKey: ["document-extraction", documentId] });
      queryClient.invalidateQueries({ queryKey: ["entity-documents"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyInvoiceFn = useServerFn(applyInvoiceExtraction);
  const applyBankStatementFn = useServerFn(applyBankStatementExtraction);

  const applyInvoice = useMutation({
    mutationFn: () => {
      if (!extraction) throw new Error("Nothing to apply yet");
      return applyInvoiceFn({ data: { companyId, extractionId: extraction.id, propertyId } });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["financial-documents"] });
      queryClient.invalidateQueries({ queryKey: ["counterparties"] });
      if (result.counterpartyMatch === "matched") {
        toast.success(
          `Draft financial document created — matched to ${result.counterpartyName ?? "existing counterparty"} by tax number.`,
        );
      } else if (result.counterpartyMatch === "no_match") {
        toast.warning(
          `Draft created, but no counterparty matched tax number ${result.counterpartyNif ?? "?"} — create or link one in Bookkeeping.`,
        );
      } else if (result.counterpartyMatch === "ambiguous") {
        toast.warning(
          "Draft created, but multiple counterparties share that tax number — resolve in Bookkeeping.",
        );
      } else {
        toast.warning("Draft created, but no tax number was readable — set the counterparty manually.");
      }
      if (!result.directionConfirmed) {
        toast.info('Direction defaulted to "inbound" — neither party matched this company\'s tax number.');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyBankStatement = useMutation({
    mutationFn: () => {
      if (!extraction) throw new Error("Nothing to apply yet");
      if (!bankAccountId) throw new Error("Choose a bank account first");
      return applyBankStatementFn({
        data: { companyId, extractionId: extraction.id, bankAccountId },
      });
    },
    onSuccess: (result) => {
      setStagedImportId(result.importId);
      setStatementDialogOpen(true);
      toast.success(
        `${result.rowCount} line(s) staged${result.duplicateCount ? `, ${result.duplicateCount} suspected duplicate(s)` : ""} — review and confirm below.`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const result = (run.data ?? extraction?.extracted_json) as
    | {
        document_kind: string;
        summary: string;
        confidence: "high" | "medium" | "low";
        details: Record<string, unknown>;
      }
    | undefined;

  // Only lease schedules feed the financing schedule for now.
  const leaseInstallments: ExtractedInstallment[] =
    result?.document_kind === "lease_schedule" && Array.isArray(result.details?.installments)
      ? (result.details.installments as ExtractedInstallment[])
      : [];


  return (
    <>
      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)}>
        <Sparkles className="size-4" /> Extract
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Extract with Claude</DialogTitle>
            <DialogDescription>
              Reads the file straight from Drive. Review every field below — nothing is saved to the
              document until you press Apply.
            </DialogDescription>
          </DialogHeader>

          {!extraction && !run.data ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">No extraction yet for this document.</p>
              <Button onClick={() => run.mutate()} disabled={run.isPending}>
                {run.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Run extraction
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {result ? (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary">{result.document_kind.replace(/_/g, " ")}</Badge>
                    <Badge variant={result.confidence === "low" ? "destructive" : "outline"}>
                      {result.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{result.summary}</p>
                  {result.confidence === "low" ? (
                    <p className="mt-2 flex items-center gap-1.5 text-destructive">
                      <AlertTriangle className="size-3.5" /> Check the source file — this read may
                      be unreliable.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="ex-title">Title</Label>
                  <Input
                    id="ex-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ex-issue">Document date</Label>
                  <Input
                    id="ex-issue"
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ex-expiry">Expiry date</Label>
                  <Input
                    id="ex-expiry"
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ex-amount">Amount</Label>
                  <Input
                    id="ex-amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ex-currency">Currency</Label>
                  <Input
                    id="ex-currency"
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
                    }
                  />
                </div>
              </div>

              {result?.details ? (
                <div className="grid gap-2">
                  <Label>Details found (reference only, not yet auto-applied)</Label>
                  <Textarea
                    readOnly
                    rows={6}
                    className="font-mono text-xs"
                    value={JSON.stringify(result.details, null, 2)}
                  />
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                {leaseInstallments.length ? (
                  <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                    <ListPlus className="size-4" /> Import instalments to financing schedule
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => run.mutate()}
                  disabled={run.isPending}
                >
                  {run.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Re-run
                </Button>
              </div>

            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => apply.mutate()} disabled={!extraction || apply.isPending}>
              {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Apply to document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {importOpen ? (
        <LeaseScheduleImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          companyId={companyId}
          propertyId={propertyId}
          currency={form.currency || currency}
          installments={leaseInstallments}
          sourceLabel={form.title || "Document extraction"}
        />
      ) : null}
    </>

  );
}
