import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { AgreementRow } from "@/modules/realestate/financing-queries";
import { getGmailStatus, syncInvoicesFromGmail } from "@/modules/realestate/gmail-sync.functions";
import type { SyncGmailInvoicesResult } from "@/modules/realestate/gmail-sync-schemas";

const STATUS_LABEL: Record<SyncGmailInvoicesResult["items"][number]["status"], string> = {
  created: "Attached + queued",
  skipped_duplicate: "Already synced",
  extraction_failed: "Attached, extraction failed",
  attach_failed: "Failed",
};

/** Pulls matching PDF invoices from Gmail into this agreement's Drive folder and documents. */
export function GmailSyncDialog({ agreement }: { agreement: AgreementRow }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(
    () => `has:attachment filename:pdf ${agreement.reference ?? agreement.code ?? agreement.lender}`,
  );
  const [autoExtract, setAutoExtract] = useState(true);
  const [result, setResult] = useState<SyncGmailInvoicesResult | null>(null);
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ["gmail-status"],
    queryFn: useServerFn(getGmailStatus),
    enabled: open,
  });

  const sync = useMutation({
    mutationFn: useServerFn(syncInvoicesFromGmail),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["financing-agreement", agreement.id] });
      queryClient.invalidateQueries({
        queryKey: ["entity-documents", "financing_agreements", agreement.id],
      });
      if (data.documentsCreated === 0) {
        toast.info("No new PDFs matched — nothing to sync.");
      } else {
        toast.success(`Synced ${data.documentsCreated} document(s) from Gmail.`);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Sync failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MailCheck className="size-4" /> Sync from Gmail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Sync invoices from Gmail</DialogTitle>
          <DialogDescription>
            Finds matching PDFs in Gmail, files them into this agreement&apos;s Drive folder, and
            (unless disabled) queues extraction for each one right away. Turning an extraction into
            a real bookkeeping entry still happens from the Extract dialog or the Review queue, same
            as any other document.
          </DialogDescription>
        </DialogHeader>

        {status.data && !status.data.configured ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Gmail isn&apos;t connected for this project yet. Link the Gmail connector first, the
            same way the Google Drive connector was linked.
          </p>
        ) : null}

        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">Gmail search query</Label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              Plain Gmail search syntax — e.g. add <code>from:millenniumbcp.pt</code> to narrow it
              to one sender.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto-extract"
              checked={autoExtract}
              onCheckedChange={(v) => setAutoExtract(v === true)}
            />
            <Label htmlFor="auto-extract" className="text-sm font-normal">
              Auto-extract each new PDF with Claude after attaching
            </Label>
          </div>
        </div>

        {result ? (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
            <p className="text-muted-foreground">
              Scanned {result.messagesScanned} message(s), found {result.attachmentsFound} PDF(s).
            </p>
            {result.items.map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="font-medium">{item.filename}</p>
                  {item.error ? <p className="text-xs text-destructive">{item.error}</p> : null}
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            onClick={() =>
              sync.mutate({
                data: {
                  companyId: agreement.company_id,
                  entityType: "financing_agreements",
                  entityId: agreement.id,
                  query,
                  autoExtract,
                  maxMessages: 25,
                },
              })
            }
            disabled={sync.isPending || !query.trim() || status.data?.configured === false}
          >
            {sync.isPending ? "Syncing…" : "Sync now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
