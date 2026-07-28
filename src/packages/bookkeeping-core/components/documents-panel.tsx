import { useMemo, useState } from "react";
import { Ban, FileText, Pencil, Plus, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoneyPrecise, titleCase } from "@/lib/format";
import { useCancelDocument, usePostDocument } from "../mutations";
import type { BookkeepingCapabilities } from "../capabilities";
import { useDimensionOptions } from "../host";
import {
  useClassifications,
  useCounterparties,
  useFinancialDocuments,
  useFinancialPeriods,
} from "../queries";
import type { FinancialDocument as DocumentRow } from "../types";
import { DOCUMENT_STATUSES, PAYMENT_STATES } from "../schemas";
import { DocumentEditorDialog } from "./document-editor";
import { SettlementPanel } from "./settlement-panel";
import { classificationLabel, OptionSelect } from "./selectors";

const statusVariant = (status: string) =>
  status === "posted" ? "default" : status === "cancelled" ? "outline" : "secondary";

export function DocumentsPanel({
  companyId,
  direction,
  capabilities,
}: {
  companyId: string;
  direction: "inbound" | "outbound";
  capabilities: BookkeepingCapabilities;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<string | null>(null);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [classificationId, setClassificationId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settling, setSettling] = useState<DocumentRow | null>(null);
  const [cancelling, setCancelling] = useState<DocumentRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const filters = useMemo(
    () => ({
      direction,
      search,
      status: status ?? undefined,
      paymentState: paymentState ?? undefined,
      counterpartyId,
      classificationId,
      propertyId,
      periodId,
      dueFrom: dueFrom || null,
      dueTo: dueTo || null,
    }),
    [
      direction,
      search,
      status,
      paymentState,
      counterpartyId,
      classificationId,
      propertyId,
      periodId,
      dueFrom,
      dueTo,
    ],
  );

  const { data: documents, isLoading } = useFinancialDocuments(companyId, filters);
  const { data: counterparties } = useCounterparties(companyId, {
    type: direction === "inbound" ? "supplier" : "client",
  });
  const { data: classifications } = useClassifications(companyId);
  const { options: properties } = useDimensionOptions("property");
  const { data: periods } = useFinancialPeriods(companyId);

  const post = usePostDocument();
  const cancel = useCancelDocument();

  const totals = (documents ?? []).reduce(
    (acc, d) => {
      if (d.status === "cancelled") return acc;
      acc.gross += Number(d.gross_amount);
      acc.outstanding += Number(d.outstanding_amount);
      return acc;
    },
    { gross: 0, outstanding: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <Label htmlFor="doc-search">Search</Label>
            <Input
              id="doc-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Number, ATCUD, counterparty"
            />
          </div>
          <div>
            <Label>Status</Label>
            <OptionSelect
              aria-label="Status filter"
              value={status}
              onChange={setStatus}
              noneLabel="All statuses"
              options={DOCUMENT_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
            />
          </div>
          <div>
            <Label>Payment state</Label>
            <OptionSelect
              aria-label="Payment state filter"
              value={paymentState}
              onChange={setPaymentState}
              noneLabel="All payment states"
              options={PAYMENT_STATES.map((s) => ({ value: s, label: titleCase(s) }))}
            />
          </div>
          <div>
            <Label>{direction === "inbound" ? "Supplier" : "Client"}</Label>
            <OptionSelect
              aria-label="Counterparty filter"
              value={counterpartyId}
              onChange={setCounterpartyId}
              noneLabel="All counterparties"
              options={(counterparties ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div>
            <Label>Classification</Label>
            <OptionSelect
              aria-label="Classification filter"
              value={classificationId}
              onChange={setClassificationId}
              noneLabel="All classifications"
              options={(classifications ?? []).map((c) => ({
                value: c.id,
                label: classificationLabel(c),
              }))}
            />
          </div>
          <div>
            <Label>Property</Label>
            <OptionSelect
              aria-label="Property filter"
              value={propertyId}
              onChange={setPropertyId}
              noneLabel="All properties"
              options={properties.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>
          <div>
            <Label>Period</Label>
            <OptionSelect
              aria-label="Period filter"
              value={periodId}
              onChange={setPeriodId}
              noneLabel="All periods"
              options={(periods ?? []).map((p) => ({ value: p.id, label: p.code }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="due-from">Due from</Label>
              <Input
                id="due-from"
                type="date"
                value={dueFrom}
                onChange={(e) => setDueFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="due-to">Due to</Label>
              <Input
                id="due-to"
                type="date"
                value={dueTo}
                onChange={(e) => setDueTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        {capabilities.canCreateDraft ? (
          <Button
            onClick={() => {
              setEditingId(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="size-4" />
            {direction === "inbound" ? "New purchase" : "New sale"}
          </Button>
        ) : null}
      </div>

      <div className="flex gap-6 text-sm">
        <span className="text-muted-foreground">
          {documents?.length ?? 0} documents · gross{" "}
          <strong className="text-foreground">{formatMoneyPrecise(totals.gross)}</strong> ·
          outstanding{" "}
          <strong className="text-foreground">{formatMoneyPrecise(totals.outstanding)}</strong>
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>{direction === "inbound" ? "Supplier" : "Client"}</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground">
                    Loading documents…
                  </TableCell>
                </TableRow>
              ) : (documents ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground">
                    No documents match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                documents!.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{formatDate(d.issue_date)}</TableCell>
                    <TableCell className="font-medium">
                      {[d.series, d.document_number].filter(Boolean).join(" ") || "—"}
                      <span className="block text-xs text-muted-foreground">
                        {titleCase(d.doc_type)}
                      </span>
                    </TableCell>
                    <TableCell>{d.counterparty_name ?? "—"}</TableCell>
                    <TableCell>{formatDate(d.due_date)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(Number(d.net_amount), d.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(Number(d.vat_amount), d.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(Number(d.gross_amount), d.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(Number(d.outstanding_amount), d.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(d.status)}>{titleCase(d.status)}</Badge>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {titleCase(d.payment_state)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Open document ${d.document_number ?? d.id}`}
                          onClick={() => {
                            setEditingId(d.id);
                            setEditorOpen(true);
                          }}
                        >
                          {d.status === "draft" && capabilities.canEditDraft ? (
                            <Pencil className="size-4" />
                          ) : (
                            <FileText className="size-4" />
                          )}
                        </Button>
                        {d.status === "draft" && capabilities.canPost ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={post.isPending}
                            onClick={() => post.mutate({ id: d.id })}
                          >
                            Post
                          </Button>
                        ) : null}
                        {d.status === "posted" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={`Settle document ${d.document_number ?? d.id}`}
                            onClick={() => setSettling(d)}
                          >
                            <Wallet className="size-4" />
                          </Button>
                        ) : null}
                        {d.status !== "cancelled" && capabilities.canCancel ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Cancel document ${d.document_number ?? d.id}`}
                            onClick={() => {
                              setCancelReason("");
                              setCancelling(d);
                            }}
                          >
                            <Ban className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editorOpen ? (
        <DocumentEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          companyId={companyId}
          direction={direction}
          documentId={editingId}
          capabilities={capabilities}
        />
      ) : null}

      <Dialog open={Boolean(settling)} onOpenChange={(o) => !o && setSettling(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Settlement — {[settling?.series, settling?.document_number].filter(Boolean).join(" ")}
            </DialogTitle>
          </DialogHeader>
          {settling ? (
            <SettlementPanel
              companyId={companyId}
              documentId={settling.id}
              capabilities={capabilities}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelling)} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cancelling keeps the document and its history — nothing is deleted. A reason is
            required and is stored on the audit trail.
          </p>
          <div>
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              Keep document
            </Button>
            <Button
              variant="destructive"
              disabled={cancelReason.trim().length < 3 || cancel.isPending}
              onClick={() =>
                cancel.mutate(
                  { id: cancelling!.id, reason: cancelReason.trim() },
                  { onSuccess: () => setCancelling(null) },
                )
              }
            >
              Cancel document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
