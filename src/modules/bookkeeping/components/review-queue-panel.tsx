import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, CircleAlert, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  classificationLabel,
  formatDate,
  formatMoneyPrecise,
  OptionSelect,
  useClassifications,
  useCounterparties,
  useFinancialDocuments,
  type BookkeepingCapabilities,
  type FinancialDocument,
} from "@/packages/bookkeeping-core";
import {
  confirmDocumentClassification,
  confirmDocumentCounterparty,
  fileReviewedDocument,
  ignoreReviewedDocument,
  rejectReviewedDocument,
  reopenDocumentReview,
} from "@/modules/bookkeeping/review-queue.functions";

/**
 * Review queue — the human gate between an extracted document and bookkeeping
 * truth. Two checkpoints have to be cleared separately ("is this the right
 * supplier?" and "is this classified correctly?"), because they're genuinely
 * different judgements and one being right says nothing about the other.
 * Filing is always explicit; nothing posts itself.
 */
export function ReviewQueuePanel({
  companyId,
  capabilities,
}: {
  companyId: string;
  capabilities: BookkeepingCapabilities;
}) {
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const documents = useFinancialDocuments(companyId, { reviewStatus });
  const rows = documents.data ?? [];
  const selected = rows.find((d) => d.id === selectedId) ?? rows[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Documents to review</CardTitle>
          <Tabs value={reviewStatus} onValueChange={setReviewStatus}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="ignored">Ignored</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing {reviewStatus} right now.</p>
          ) : (
            rows.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedId(doc.id)}
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  selected?.id === doc.id
                    ? "border-primary bg-accent/40"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {doc.counterparty_name ?? "Unknown supplier"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.document_number ?? "No number"} · {formatDate(doc.issue_date)}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-sm tabular-nums">
                    {formatMoneyPrecise(doc.gross_amount, doc.currency)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <CheckpointBadge label="Supplier" done={doc.counterparty_confirmed} />
                  <CheckpointBadge label="Classification" done={doc.classification_confirmed} />
                  {!doc.direction_confirmed ? (
                    <Badge variant="destructive" className="gap-1">
                      <CircleAlert className="size-3" /> Direction
                    </Badge>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {selected ? (
        <ReviewDetail
          key={selected.id}
          companyId={companyId}
          doc={selected}
          capabilities={capabilities}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Select a document to review it.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CheckpointBadge({ label, done }: { label: string; done: boolean }) {
  return (
    <Badge variant={done ? "secondary" : "outline"} className="gap-1">
      {done ? <Check className="size-3" /> : null}
      {label}
      {done ? " confirmed" : " unconfirmed"}
    </Badge>
  );
}

function ReviewDetail({
  companyId,
  doc,
  capabilities,
}: {
  companyId: string;
  doc: FinancialDocument;
  capabilities: BookkeepingCapabilities;
}) {
  const queryClient = useQueryClient();
  const counterparties = useCounterparties(companyId, { status: "active" });
  const classifications = useClassifications(companyId);

  const [counterpartyId, setCounterpartyId] = useState<string | null>(doc.counterparty_id);
  const [counterpartyName, setCounterpartyName] = useState(doc.counterparty_name ?? "");
  const [direction, setDirection] = useState<"inbound" | "outbound">(
    doc.direction === "outbound" ? "outbound" : "inbound",
  );
  const [classificationId, setClassificationId] = useState<string | null>(doc.classification_id);
  const [reason, setReason] = useState("");

  const confirmSupplierFn = useServerFn(confirmDocumentCounterparty);
  const confirmClassFn = useServerFn(confirmDocumentClassification);
  const fileFn = useServerFn(fileReviewedDocument);
  const rejectFn = useServerFn(rejectReviewedDocument);
  const ignoreFn = useServerFn(ignoreReviewedDocument);
  const reopenFn = useServerFn(reopenDocumentReview);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["financial-documents"] });
    queryClient.invalidateQueries({ queryKey: ["financial-document", doc.id] });
  };
  const onError = (e: Error) => toast.error(e.message);

  const confirmSupplier = useMutation({
    mutationFn: () =>
      confirmSupplierFn({
        data: {
          companyId,
          documentId: doc.id,
          counterpartyId,
          ...(counterpartyName.trim() ? { counterpartyName: counterpartyName.trim() } : {}),
          direction,
        },
      }),
    onSuccess: () => {
      toast.success("Supplier confirmed");
      invalidate();
    },
    onError,
  });

  const confirmClassification = useMutation({
    mutationFn: () => {
      if (!classificationId) throw new Error("Pick a classification first");
      return confirmClassFn({ data: { companyId, documentId: doc.id, classificationId } });
    },
    onSuccess: () => {
      toast.success("Classification confirmed");
      invalidate();
    },
    onError,
  });

  const file = useMutation({
    mutationFn: () => fileFn({ data: { companyId, documentId: doc.id } }),
    onSuccess: () => {
      toast.success("Document filed");
      invalidate();
    },
    onError,
  });

  const reject = useMutation({
    mutationFn: () => rejectFn({ data: { companyId, documentId: doc.id, reason: reason.trim() } }),
    onSuccess: () => {
      toast.success("Document rejected");
      invalidate();
    },
    onError,
  });

  const ignore = useMutation({
    mutationFn: () =>
      ignoreFn({
        data: {
          companyId,
          documentId: doc.id,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Document ignored");
      invalidate();
    },
    onError,
  });

  const reopen = useMutation({
    mutationFn: () => reopenFn({ data: { companyId, documentId: doc.id } }),
    onSuccess: () => {
      toast.success("Back in the queue");
      invalidate();
    },
    onError,
  });

  const counterpartyOptions = useMemo(
    () => (counterparties.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [counterparties.data],
  );
  const classificationOptions = useMemo(
    () =>
      (classifications.data ?? []).map((c) => ({ value: c.id, label: classificationLabel(c) })),
    [classifications.data],
  );

  const readOnly = !capabilities.canEditDraft;
  const bothConfirmed =
    doc.counterparty_confirmed && doc.classification_confirmed && doc.direction_confirmed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {doc.counterparty_name ?? "Unknown supplier"} ·{" "}
          {formatMoneyPrecise(doc.gross_amount, doc.currency)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {doc.document_number ?? "No number"} · {formatDate(doc.issue_date)} · {doc.doc_type}
        </p>
        {doc.review_rejected_reason ? (
          <p className="text-sm text-destructive">{doc.review_rejected_reason}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Checkpoint 1 */}
        <section className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">1 · Supplier</h3>
            <CheckpointBadge label="Supplier" done={doc.counterparty_confirmed} />
          </div>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Counterparty</Label>
              <OptionSelect
                aria-label="Counterparty"
                value={counterpartyId}
                onChange={setCounterpartyId}
                options={counterpartyOptions}
                noneLabel="No counterparty"
                disabled={readOnly}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rq-name">Name on the document</Label>
              <Input
                id="rq-name"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="grid gap-2">
              <Label>Direction</Label>
              <OptionSelect
                aria-label="Direction"
                value={direction}
                onChange={(v) => setDirection(v === "outbound" ? "outbound" : "inbound")}
                options={[
                  { value: "inbound", label: "Money out — we received this invoice" },
                  { value: "outbound", label: "Money in — we issued this invoice" },
                ]}
                allowNone={false}
                disabled={readOnly}
              />
              {!doc.direction_confirmed ? (
                <p className="text-xs text-muted-foreground">
                  Direction was defaulted, not derived — confirm it here.
                </p>
              ) : null}
            </div>
          </div>
          <Button
            size="sm"
            disabled={readOnly || confirmSupplier.isPending}
            onClick={() => confirmSupplier.mutate()}
          >
            {confirmSupplier.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm supplier
          </Button>
        </section>

        {/* Checkpoint 2 */}
        <section className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">2 · Classification</h3>
            <CheckpointBadge label="Classification" done={doc.classification_confirmed} />
          </div>
          <div className="grid gap-2">
            <Label>Classification</Label>
            <OptionSelect
              aria-label="Classification"
              value={classificationId}
              onChange={setClassificationId}
              options={classificationOptions}
              noneLabel="Not classified"
              disabled={readOnly}
            />
            {doc.classification_confidence_pct != null && !doc.classification_confirmed ? (
              <p className="text-xs text-muted-foreground">
                Suggested automatically with {Math.round(doc.classification_confidence_pct)}%
                confidence — confirm or change it.
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            disabled={readOnly || confirmClassification.isPending}
            onClick={() => confirmClassification.mutate()}
          >
            {confirmClassification.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm classification
          </Button>
        </section>

        {/* Outcome */}
        <section className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="rq-reason">Reason (for reject or ignore)</Label>
            <Textarea
              id="rq-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={readOnly}
              placeholder="Why this document shouldn't be filed as it stands"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!capabilities.canPost || !bothConfirmed || file.isPending}
              onClick={() => file.mutate()}
            >
              {file.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              File document
            </Button>
            <Button
              variant="outline"
              disabled={readOnly || reason.trim().length < 3 || reject.isPending}
              onClick={() => reject.mutate()}
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              disabled={readOnly || ignore.isPending}
              onClick={() => ignore.mutate()}
            >
              Ignore
            </Button>
            {doc.review_status !== "pending" ? (
              <Button
                variant="ghost"
                disabled={readOnly || reopen.isPending}
                onClick={() => reopen.mutate()}
              >
                Reopen
              </Button>
            ) : null}
          </div>
          {!bothConfirmed ? (
            <p className="text-xs text-muted-foreground">
              Both checkpoints must be confirmed before this document can be filed.
            </p>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}
