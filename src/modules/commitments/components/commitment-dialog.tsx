/**
 * Commitment draft editor.
 *
 * Creates and edits the *authorised promise* only. Amounts that have already
 * been invoiced or paid belong to bookkeeping and never appear here, and the
 * form closes itself as soon as the commitment leaves draft.
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
import { useSupplierOptions, type CommitmentRow } from "@/modules/commitments/queries";
import {
  COMMITMENT_TYPES,
  commitmentDraftSchema,
  commitmentUpdateSchema,
  labelOf,
} from "@/modules/commitments/schemas";
import type { CommitmentActions } from "@/modules/commitments/server";

const NONE = "__none__";

const blank = {
  title: "",
  commitmentType: "other",
  counterpartyId: NONE,
  authorisedAmount: "",
  currency: "EUR",
  description: "",
  startDate: "",
  endDate: "",
  notes: "",
};

export function CommitmentDialog({
  companyId,
  actions,
  commitment,
  disabled,
  onCreated,
}: {
  companyId: string | undefined;
  actions: CommitmentActions;
  commitment?: CommitmentRow | null;
  disabled?: boolean;
  onCreated?: (id: string) => void;
}) {
  const editing = Boolean(commitment);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const { data: suppliers = [] } = useSupplierOptions(companyId);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      commitment
        ? {
            title: commitment.title ?? "",
            commitmentType: commitment.commitment_type ?? "other",
            counterpartyId: commitment.counterparty_id ?? NONE,
            authorisedAmount: String(commitment.authorised_amount ?? ""),
            currency: commitment.currency ?? "EUR",
            description: commitment.description ?? "",
            startDate: commitment.start_date ?? "",
            endDate: commitment.end_date ?? "",
            notes: commitment.notes ?? "",
          }
        : blank,
    );
  }, [open, commitment]);

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError(null);
    const shared = {
      title: form.title,
      commitmentType: form.commitmentType,
      counterpartyId: form.counterpartyId === NONE ? null : form.counterpartyId,
      authorisedAmount: form.authorisedAmount === "" ? 0 : form.authorisedAmount,
      description: form.description || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes || null,
    };
    const parsed = editing
      ? commitmentUpdateSchema.safeParse({ ...shared, commitmentId: commitment!.id })
      : commitmentDraftSchema.safeParse({ ...shared, companyId, currency: form.currency });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    const result = (await actions.run(
      editing ? "updateDraft" : "createDraft",
      parsed.data,
    )) as { result?: { id?: string } } | null;
    if (!result) return;
    setOpen(false);
    if (!editing && result.result?.id) onCreated?.(result.result.id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={editing ? "outline" : "default"} size="sm" disabled={disabled}>
          {editing ? (
            "Edit draft"
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" /> New commitment
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit commitment draft" : "New commitment"}</DialogTitle>
          <DialogDescription>
            A commitment records what the company has promised to spend. Invoices and payments stay
            in bookkeeping and are linked later through drawdowns.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="c-title">Title</Label>
            <Input
              id="c-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Roof replacement — Block A"
            />
          </div>

          <div>
            <Label htmlFor="c-type">Type</Label>
            <Select value={form.commitmentType} onValueChange={(v) => set("commitmentType", v)}>
              <SelectTrigger id="c-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMITMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {labelOf(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="c-counterparty">Counterparty</Label>
            <Select value={form.counterpartyId} onValueChange={(v) => set("counterpartyId", v)}>
              <SelectTrigger id="c-counterparty">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not set</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="c-amount">Authorised amount</Label>
            <Input
              id="c-amount"
              inputMode="decimal"
              value={form.authorisedAmount}
              onChange={(e) => set("authorisedAmount", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="c-currency">Currency</Label>
            <Input
              id="c-currency"
              value={form.currency}
              disabled={editing}
              onChange={(e) => set("currency", e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <Label htmlFor="c-start">Start date</Label>
            <Input
              id="c-start"
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="c-end">End date</Label>
            <Input
              id="c-end"
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="c-description">Description</Label>
            <Textarea
              id="c-description"
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

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
            {editing ? "Save changes" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
