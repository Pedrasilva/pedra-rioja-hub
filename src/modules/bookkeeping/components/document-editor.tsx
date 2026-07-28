import { useMemo, useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatMoneyPrecise } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useCreateDocument, useUpdateDocument } from "../mutations";
import type { BookkeepingCapabilities } from "../permissions";
import {
  useBookkeepingProjects,
  useBookkeepingProperties,
  useClassifications,
  useCounterparties,
  useFinancialDocument,
  useFinancialPeriods,
} from "../queries";
import {
  computeDocumentTotals,
  computeLine,
  DOCUMENT_TYPES,
  PT_VAT_PRESETS,
  round2,
} from "../schemas";
import { classificationLabel, OptionSelect } from "./selectors";

export type LineDraft = {
  lineNo: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
  vatCode: string | null;
  exemptionReason: string;
  classificationId: string | null;
  propertyId: string | null;
  projectId: string | null;
};

const newLine = (lineNo: number): LineDraft => ({
  lineNo,
  description: "",
  quantity: 1,
  unitPrice: 0,
  discountPct: 0,
  vatRate: 23,
  vatCode: "NOR",
  exemptionReason: "",
  classificationId: null,
  propertyId: null,
  projectId: null,
});

const num = (v: string) => (v === "" ? 0 : Number(v));

export function DocumentEditorDialog({
  open,
  onOpenChange,
  companyId,
  direction,
  documentId,
  capabilities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  direction: "inbound" | "outbound";
  documentId?: string | null;
  capabilities: BookkeepingCapabilities;
}) {
  const { data: existing } = useFinancialDocument(documentId ?? undefined);
  const { data: counterparties } = useCounterparties(companyId, {
    type: direction === "inbound" ? "supplier" : "client",
  });
  const { data: classifications } = useClassifications(companyId);
  const { data: properties } = useBookkeepingProperties(companyId);
  const { data: projects } = useBookkeepingProjects(companyId);
  const { data: periods } = useFinancialPeriods(companyId);

  const create = useCreateDocument();
  const update = useUpdateDocument();

  const [header, setHeader] = useState({
    docType: "invoice",
    series: "",
    documentNumber: "",
    atcud: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    counterpartyId: null as string | null,
    periodId: null as string | null,
    taxPeriod: "",
    withholdingRate: "0",
    propertyId: null as string | null,
    projectId: null as string | null,
    notes: "",
  });
  const [lines, setLines] = useState<LineDraft[]>([newLine(1)]);
  const [drift, setDrift] = useState<string | null>(null);

  const seedKey = `${open}:${documentId ?? "new"}:${existing?.document?.id ?? ""}`;
  const [lastSeed, setLastSeed] = useState("");
  if (open && seedKey !== lastSeed) {
    setLastSeed(seedKey);
    setDrift(null);
    const doc = existing?.document;
    if (documentId && doc) {
      setHeader({
        docType: doc.doc_type,
        series: doc.series ?? "",
        documentNumber: doc.document_number ?? "",
        atcud: doc.atcud ?? "",
        issueDate: doc.issue_date,
        dueDate: doc.due_date ?? "",
        counterpartyId: doc.counterparty_id,
        periodId: doc.period_id,
        taxPeriod: doc.tax_period ?? "",
        withholdingRate: String(doc.withholding_rate ?? 0),
        propertyId: doc.property_id,
        projectId: doc.project_id,
        notes: doc.notes ?? "",
      });
      setLines(
        (existing?.lines ?? []).map((l, i) => ({
          lineNo: l.line_no ?? i + 1,
          description: l.description ?? "",
          quantity: Number(l.quantity),
          unitPrice: Number(l.unit_price),
          discountPct: Number(l.discount_pct),
          vatRate: Number(l.vat_rate),
          vatCode: l.vat_code,
          exemptionReason: "",
          classificationId: l.classification_id,
          propertyId: l.property_id,
          projectId: l.project_id,
        })),
      );
    } else if (!documentId) {
      setHeader((h) => ({ ...h, counterpartyId: null, documentNumber: "", atcud: "" }));
      setLines([newLine(1)]);
    }
  }

  const readOnly = Boolean(existing?.document && existing.document.status !== "draft");
  const totals = useMemo(
    () => computeDocumentTotals(lines, Number(header.withholdingRate) || 0),
    [lines, header.withholdingRate],
  );

  const missingExemption = lines.some(
    (l) => l.vatRate === 0 && !l.exemptionReason.trim() && (l.vatCode ?? "") === "ISE",
  );

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const payloadLines = lines.map((l) => ({
    lineNo: l.lineNo,
    description:
      l.vatRate === 0 && l.exemptionReason.trim()
        ? `${l.description} — VAT exempt: ${l.exemptionReason.trim()}`.trim()
        : l.description || null,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    vatRate: l.vatRate,
    vatCode: l.vatCode,
    vatRecoverable: true,
    classificationId: l.classificationId,
    propertyId: l.propertyId,
    projectId: l.projectId,
  }));

  const basePayload = {
    companyId,
    direction,
    docType: header.docType as "invoice",
    series: header.series || null,
    documentNumber: header.documentNumber || null,
    atcud: header.atcud || null,
    issueDate: header.issueDate,
    dueDate: header.dueDate || null,
    counterpartyId: header.counterpartyId,
    periodId: header.periodId,
    taxPeriod: header.taxPeriod || null,
    currency: "EUR",
    withholdingRate: Number(header.withholdingRate) || 0,
    propertyId: header.propertyId,
    projectId: header.projectId,
    notes: header.notes || null,
    lines: payloadLines,
  };

  /** The database owns the amounts; the preview must agree or we surface it. */
  const verifyTotals = async (id: string) => {
    const { data } = await supabase
      .from("financial_documents")
      .select("net_amount, vat_amount, gross_amount")
      .eq("id", id)
      .maybeSingle();
    if (!data) return;
    const dbGross = round2(Number(data.gross_amount));
    if (dbGross !== totals.gross) {
      setDrift(
        `Saved totals differ from the on-screen preview: the database calculated ${formatMoneyPrecise(
          dbGross,
        )} gross, the preview showed ${formatMoneyPrecise(
          totals.gross,
        )}. The database value is authoritative.`,
      );
    } else {
      setDrift(null);
      onOpenChange(false);
    }
  };

  const save = () => {
    if (missingExemption) return;
    if (documentId) {
      update.mutate({ ...basePayload, id: documentId }, { onSuccess: () => verifyTotals(documentId) });
    } else {
      create.mutate(basePayload, {
        onSuccess: (row) => {
          if (row?.id) void verifyTotals(row.id);
          else onOpenChange(false);
        },
      });
    }
  };

  const cpOptions = (counterparties ?? []).map((c) => ({ value: c.id, label: c.name }));
  const clOptions = (classifications ?? []).map((c) => ({
    value: c.id,
    label: classificationLabel(c),
  }));
  const propOptions = (properties ?? []).map((p) => ({
    value: p.id,
    label: `${p.code ? `${p.code} · ` : ""}${p.name}`,
  }));
  const projOptions = (projects ?? []).map((p) => ({ value: p.id, label: p.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {documentId ? "Edit document" : direction === "inbound" ? "New purchase" : "New sale"}
            {readOnly ? (
              <Badge variant="outline" className="ml-2">
                Read-only
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {drift ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>Totals mismatch</AlertTitle>
            <AlertDescription>{drift}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Document type</Label>
            <OptionSelect
              aria-label="Document type"
              allowNone={false}
              disabled={readOnly}
              value={header.docType}
              onChange={(v) => setHeader({ ...header, docType: v ?? "invoice" })}
              options={DOCUMENT_TYPES.map((d) => ({ value: d.value, label: d.label }))}
            />
          </div>
          <div>
            <Label>{direction === "inbound" ? "Supplier" : "Client"}</Label>
            <OptionSelect
              aria-label="Counterparty"
              disabled={readOnly}
              value={header.counterpartyId}
              onChange={(v) => setHeader({ ...header, counterpartyId: v })}
              options={cpOptions}
            />
          </div>
          <div>
            <Label htmlFor="doc-series">Series</Label>
            <Input
              id="doc-series"
              disabled={readOnly}
              value={header.series}
              onChange={(e) => setHeader({ ...header, series: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="doc-number">Document number</Label>
            <Input
              id="doc-number"
              disabled={readOnly}
              value={header.documentNumber}
              onChange={(e) => setHeader({ ...header, documentNumber: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="doc-atcud">ATCUD</Label>
            <Input
              id="doc-atcud"
              disabled={readOnly}
              value={header.atcud}
              onChange={(e) => setHeader({ ...header, atcud: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="doc-issue">Issue date</Label>
            <Input
              id="doc-issue"
              type="date"
              disabled={readOnly}
              value={header.issueDate}
              onChange={(e) => setHeader({ ...header, issueDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="doc-due">Due date</Label>
            <Input
              id="doc-due"
              type="date"
              disabled={readOnly}
              value={header.dueDate}
              onChange={(e) => setHeader({ ...header, dueDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Tax period</Label>
            <OptionSelect
              aria-label="Tax period"
              disabled={readOnly}
              value={header.periodId}
              onChange={(v) => setHeader({ ...header, periodId: v })}
              options={(periods ?? []).map((p) => ({ value: p.id, label: p.code }))}
            />
          </div>
          <div>
            <Label htmlFor="doc-wht">Withholding %</Label>
            <Input
              id="doc-wht"
              inputMode="decimal"
              disabled={readOnly}
              value={header.withholdingRate}
              onChange={(e) => setHeader({ ...header, withholdingRate: e.target.value })}
            />
          </div>
          <div>
            <Label>Property</Label>
            <OptionSelect
              aria-label="Property"
              disabled={readOnly}
              value={header.propertyId}
              onChange={(v) => setHeader({ ...header, propertyId: v })}
              options={propOptions}
            />
          </div>
          <div>
            <Label>Project</Label>
            <OptionSelect
              aria-label="Project"
              disabled={readOnly}
              value={header.projectId}
              onChange={(v) => setHeader({ ...header, projectId: v })}
              options={projOptions}
            />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="doc-notes">Notes</Label>
            <Textarea
              id="doc-notes"
              disabled={readOnly}
              value={header.notes}
              onChange={(e) => setHeader({ ...header, notes: e.target.value })}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Lines</h3>
            {!readOnly ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLines([...lines, newLine(lines.length + 1)])}
              >
                <Plus className="size-4" /> Add line
              </Button>
            ) : null}
          </div>

          {lines.map((l, i) => {
            const calc = computeLine(l);
            return (
              <div key={i} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Label htmlFor={`line-desc-${i}`}>Description</Label>
                  <Input
                    id={`line-desc-${i}`}
                    disabled={readOnly}
                    value={l.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label htmlFor={`line-qty-${i}`}>Qty</Label>
                  <Input
                    id={`line-qty-${i}`}
                    inputMode="decimal"
                    disabled={readOnly}
                    value={String(l.quantity)}
                    onChange={(e) => setLine(i, { quantity: num(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor={`line-price-${i}`}>Unit price</Label>
                  <Input
                    id={`line-price-${i}`}
                    inputMode="decimal"
                    disabled={readOnly}
                    value={String(l.unitPrice)}
                    onChange={(e) => setLine(i, { unitPrice: num(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label htmlFor={`line-disc-${i}`}>Disc %</Label>
                  <Input
                    id={`line-disc-${i}`}
                    inputMode="decimal"
                    disabled={readOnly}
                    value={String(l.discountPct)}
                    onChange={(e) => setLine(i, { discountPct: num(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>VAT</Label>
                  <OptionSelect
                    aria-label={`VAT preset line ${i + 1}`}
                    allowNone={false}
                    disabled={readOnly}
                    value={l.vatCode ?? "NOR"}
                    onChange={(v) => {
                      const preset = PT_VAT_PRESETS.find((p) => p.code === v);
                      setLine(i, { vatCode: v, vatRate: preset?.rate ?? 0 });
                    }}
                    options={PT_VAT_PRESETS.map((p) => ({ value: p.code, label: p.label }))}
                  />
                </div>
                <div className="flex items-end justify-between gap-2 md:col-span-2">
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Net {formatMoneyPrecise(calc.net)}</p>
                    <p className="font-medium">{formatMoneyPrecise(calc.gross)}</p>
                  </div>
                  {!readOnly && lines.length > 1 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove line ${i + 1}`}
                      onClick={() =>
                        setLines(
                          lines
                            .filter((_, idx) => idx !== i)
                            .map((line, idx) => ({ ...line, lineNo: idx + 1 })),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>

                {l.vatRate === 0 ? (
                  <div className="md:col-span-6">
                    <Label htmlFor={`line-exempt-${i}`}>VAT exemption reason</Label>
                    <Input
                      id={`line-exempt-${i}`}
                      disabled={readOnly}
                      value={l.exemptionReason}
                      onChange={(e) => setLine(i, { exemptionReason: e.target.value })}
                    />
                  </div>
                ) : null}
                <div className="md:col-span-3">
                  <Label>Classification</Label>
                  <OptionSelect
                    aria-label={`Classification line ${i + 1}`}
                    disabled={readOnly}
                    value={l.classificationId}
                    onChange={(v) => setLine(i, { classificationId: v })}
                    options={clOptions}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Property</Label>
                  <OptionSelect
                    aria-label={`Property line ${i + 1}`}
                    disabled={readOnly}
                    value={l.propertyId}
                    onChange={(v) => setLine(i, { propertyId: v })}
                    options={propOptions}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-md bg-muted/50 p-4 text-sm" data-testid="totals-preview">
          <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
            Live preview — database totals are authoritative
          </p>
          <div className="grid gap-2 sm:grid-cols-5">
            <Total label="Net" value={totals.net} />
            <Total label="VAT" value={totals.vat} />
            <Total label="Withholding" value={totals.withholding} />
            <Total label="Gross" value={totals.gross} />
            <Total label="Payable" value={totals.payable} />
          </div>
        </div>

        {missingExemption ? (
          <p className="text-xs text-destructive">
            A VAT exemption reason is required on every exempt line.
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!readOnly ? (
            <Button
              onClick={save}
              disabled={!capabilities.canCreateDraft || create.isPending || update.isPending}
            >
              {documentId ? "Save draft" : "Create draft"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium" data-testid={`total-${label.toLowerCase()}`}>
        {formatMoneyPrecise(value)}
      </p>
    </div>
  );
}
