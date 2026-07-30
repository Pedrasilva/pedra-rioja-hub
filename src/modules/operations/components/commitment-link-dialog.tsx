/**
 * Phase 8B — linking an operational record to a commitment.
 *
 * Two paths, one rule. Either point at an existing commitment, or draft a new
 * one from the operational record. Either way the commitment becomes the owner
 * of the amount: this dialog captures a figure only when creating a draft, and
 * that figure is written to the commitment, never to the operational record.
 * A new commitment always starts as a draft, so the Phase 8A approval contract
 * still decides whether it ever reaches the cash-flow timeline.
 */

import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CommitmentSummary } from "@/modules/commitments/queries";
import { COMMITMENT_TYPES, labelOf } from "@/modules/commitments/schemas";
import {
  DEFAULT_COMMITMENT_TYPE,
  type OperationalEntityType,
} from "@/modules/operations/schemas";
import type { OperationsActions } from "@/modules/operations/server";

const NONE = "__none__";

export function CommitmentLinkDialog({
  entityType,
  entityId,
  row,
  commitments,
  actions,
}: {
  entityType: OperationalEntityType;
  entityId: string;
  row: { title: string; commitment_id: string | null; counterparty_id?: unknown };
  commitments: CommitmentSummary[];
  actions: OperationsActions;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState(NONE);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [commitmentType, setCommitmentType] = useState(DEFAULT_COMMITMENT_TYPE[entityType]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setExisting(row.commitment_id ?? NONE);
    setAmount("");
    setCurrency("EUR");
    setCommitmentType(DEFAULT_COMMITMENT_TYPE[entityType]);
    setStartDate("");
    setEndDate("");
    setNotes("");
  }, [open, row.commitment_id, entityType]);

  const available = commitments.filter((c) => c.archived_at === null);

  async function link() {
    setError(null);
    const result = await actions.run("linkCommitment", {
      entityType,
      entityId,
      commitmentId: existing === NONE ? null : existing,
    });
    if (result) setOpen(false);
  }

  async function draft() {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter the amount the commitment authorises");
      return;
    }
    const result = await actions.run("createCommitment", {
      entityType,
      entityId,
      title: row.title,
      commitmentType,
      authorisedAmount: parsed,
      currency,
      counterpartyId: (row.counterparty_id as string | null) ?? null,
      startDate: startDate || null,
      endDate: endDate || null,
      notes: notes || null,
    });
    if (result) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Banknote className="mr-1.5 h-4 w-4" />
          {row.commitment_id ? "Commitment" : "Commit"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Commitment for {row.title}</DialogTitle>
          <DialogDescription>
            The commitment owns the money. This record only keeps the reference, and a new
            commitment starts as a draft that still needs approval.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={row.commitment_id ? "existing" : "new"}>
          <TabsList>
            <TabsTrigger value="existing">Link existing</TabsTrigger>
            <TabsTrigger value="new">Draft new</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 pt-2">
            <div>
              <Label htmlFor="link-existing">Commitment</Label>
              <Select value={existing} onValueChange={setExisting}>
                <SelectTrigger id="link-existing">
                  <SelectValue placeholder="Not linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {available.map((c) => (
                    <SelectItem key={c.commitment_id} value={c.commitment_id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={link} disabled={actions.isPending}>
              Save link
            </Button>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="link-type">Commitment type</Label>
                <Select value={commitmentType} onValueChange={setCommitmentType}>
                  <SelectTrigger id="link-type">
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
                <Label htmlFor="link-amount">Authorised amount</Label>
                <Input
                  id="link-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="link-currency">Currency</Label>
                <Input
                  id="link-currency"
                  value={currency}
                  maxLength={3}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label htmlFor="link-start">Start date</Label>
                <Input
                  id="link-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="link-end">End date</Label>
                <Input
                  id="link-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="link-notes">Notes</Label>
                <Textarea
                  id="link-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={draft} disabled={actions.isPending}>
              Create draft commitment
            </Button>
          </TabsContent>
        </Tabs>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
