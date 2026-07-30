/**
 * Acquisition opportunity editor.
 *
 * Every amount captured here is an indicative deal estimate. None of it is an
 * accounting value: it never posts, never commits and never reaches the
 * portfolio or valuation views (§5C, §5D).
 */

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type { AcquisitionOpportunity } from "@/modules/acquisitions/queries";
import {
  LINK_KINDS,
  OPPORTUNITY_TYPES,
  opportunityDraftSchema,
  opportunityUpdateSchema,
} from "@/modules/acquisitions/schemas";
import type { AcquisitionActions } from "@/modules/acquisitions/server";

const blank = {
  title: "",
  reference: "",
  opportunityType: "other",
  propertyName: "",
  address: "",
  location: "",
  source: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  probability: "",
  linkKind: "prospective_property",
  askingPrice: "",
  indicativeOffer: "",
  valuationAmount: "",
  targetAcquisitionDate: "",
  expectedClosingDate: "",
  notes: "",
};

type Form = typeof blank;

export function OpportunityDialog({
  companyId,
  actions,
  opportunity,
  disabled,
  onCreated,
}: {
  companyId: string | undefined;
  actions: AcquisitionActions;
  opportunity?: AcquisitionOpportunity | null;
  disabled?: boolean;
  onCreated?: (id: string) => void;
}) {
  const editing = Boolean(opportunity);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blank);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      opportunity
        ? {
            title: opportunity.title ?? "",
            reference: opportunity.reference ?? "",
            opportunityType: opportunity.opportunity_type ?? "other",
            propertyName: opportunity.property_name ?? "",
            address: opportunity.address ?? "",
            location: opportunity.location ?? "",
            source: opportunity.source ?? "",
            contactName: opportunity.contact_name ?? "",
            contactEmail: opportunity.contact_email ?? "",
            contactPhone: opportunity.contact_phone ?? "",
            probability: String(opportunity.probability ?? ""),
            linkKind: opportunity.link_kind ?? "prospective_property",
            askingPrice: opportunity.asking_price?.toString() ?? "",
            indicativeOffer: opportunity.indicative_offer?.toString() ?? "",
            valuationAmount: opportunity.valuation_amount?.toString() ?? "",
            targetAcquisitionDate: opportunity.target_acquisition_date ?? "",
            expectedClosingDate: opportunity.expected_closing_date ?? "",
            notes: opportunity.notes ?? "",
          }
        : blank,
    );
  }, [open, opportunity]);

  const set = (key: keyof Form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const payload = {
    title: form.title,
    opportunityType: form.opportunityType,
    propertyName: form.propertyName || undefined,
    address: form.address || undefined,
    location: form.location || undefined,
    source: form.source || undefined,
    contactName: form.contactName || undefined,
    contactEmail: form.contactEmail || undefined,
    contactPhone: form.contactPhone || undefined,
    probability: form.probability === "" ? undefined : Number(form.probability),
    linkKind: form.linkKind,
    askingPrice: form.askingPrice === "" ? undefined : Number(form.askingPrice),
    indicativeOffer: form.indicativeOffer === "" ? undefined : Number(form.indicativeOffer),
    valuationAmount: form.valuationAmount === "" ? undefined : Number(form.valuationAmount),
    targetAcquisitionDate: form.targetAcquisitionDate || undefined,
    expectedClosingDate: form.expectedClosingDate || undefined,
    notes: form.notes || undefined,
  };

  const submit = async () => {
    setError(null);
    if (editing && opportunity) {
      const parsed = opportunityUpdateSchema.safeParse({
        opportunityId: opportunity.opportunity_id,
        ...payload,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Check the form");
        return;
      }
      if (await actions.run("update", parsed.data)) setOpen(false);
      return;
    }

    const parsed = opportunityDraftSchema.safeParse({
      companyId,
      reference: form.reference || undefined,
      ...payload,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    const result = (await actions.run("create", parsed.data)) as
      | { result?: { id?: string } }
      | null;
    if (result) {
      setOpen(false);
      const id = result.result?.id;
      if (id) onCreated?.(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={editing ? "outline" : "default"} disabled={disabled}>
          {editing ? (
            "Edit opportunity"
          ) : (
            <>
              <Plus className="size-4" /> New opportunity
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit opportunity" : "New acquisition opportunity"}</DialogTitle>
          <DialogDescription>
            An opportunity is an operational deal record. Its figures are indicative estimates —
            they never post an entry, create a commitment or reach the portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ao-title">Title</Label>
            <Input
              id="ao-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Calle Mayor 14 — mixed use block"
            />
          </div>

          {editing ? null : (
            <div className="grid gap-2">
              <Label htmlFor="ao-reference">Reference</Label>
              <Input
                id="ao-reference"
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
                placeholder="Left blank, one is generated"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="ao-type">Opportunity type</Label>
            <Select
              value={form.opportunityType}
              onValueChange={(v) => set("opportunityType", v)}
            >
              <SelectTrigger id="ao-type" aria-label="Opportunity type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPPORTUNITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-link">Property link</Label>
            <Select value={form.linkKind} onValueChange={(v) => set("linkKind", v)}>
              <SelectTrigger id="ao-link" aria-label="Property link">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_KINDS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-property">Property name</Label>
            <Input
              id="ao-property"
              value={form.propertyName}
              onChange={(e) => set("propertyName", e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ao-address">Address</Label>
            <Input
              id="ao-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-location">Location</Label>
            <Input
              id="ao-location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Logroño"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-source">Source</Label>
            <Input
              id="ao-source"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="Broker, off-market, auction…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-contact">Contact name</Label>
            <Input
              id="ao-contact"
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-email">Contact email</Label>
            <Input
              id="ao-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-phone">Contact phone</Label>
            <Input
              id="ao-phone"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-probability">Probability (%)</Label>
            <Input
              id="ao-probability"
              type="number"
              min={0}
              max={100}
              value={form.probability}
              onChange={(e) => set("probability", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-asking">Asking price (indicative)</Label>
            <Input
              id="ao-asking"
              type="number"
              step="0.01"
              value={form.askingPrice}
              onChange={(e) => set("askingPrice", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-offer">Indicative offer</Label>
            <Input
              id="ao-offer"
              type="number"
              step="0.01"
              value={form.indicativeOffer}
              onChange={(e) => set("indicativeOffer", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-valuation">Indicative valuation</Label>
            <Input
              id="ao-valuation"
              type="number"
              step="0.01"
              value={form.valuationAmount}
              onChange={(e) => set("valuationAmount", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-target">Target acquisition date</Label>
            <Input
              id="ao-target"
              type="date"
              value={form.targetAcquisitionDate}
              onChange={(e) => set("targetAcquisitionDate", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ao-closing">Expected closing date</Label>
            <Input
              id="ao-closing"
              type="date"
              value={form.expectedClosingDate}
              onChange={(e) => set("expectedClosingDate", e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ao-notes">Notes</Label>
            <Textarea
              id="ao-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>

          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={actions.isPending}>
            {editing ? "Save changes" : "Create opportunity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
