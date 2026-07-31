/**
 * Phase 8F.4 — open a closing against an accepted opportunity.
 *
 * The agreed price captured here is indicative. The authoritative amount stays
 * with the commitment and the posted documents (§5C, §5D).
 */

import { useState } from "react";

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
import type { ClosingActions } from "@/modules/closings/server";

export function ClosingDialog({
  opportunityId,
  dueDiligenceCaseId,
  actions,
  disabled,
  onCreated,
}: {
  opportunityId: string;
  dueDiligenceCaseId?: string | null;
  actions: ClosingActions;
  disabled?: boolean;
  onCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [price, setPrice] = useState("");

  async function submit() {
    const outcome = await actions.run("create", {
      opportunityId,
      title: title.trim() || null,
      dueDiligenceCaseId: dueDiligenceCaseId ?? null,
      targetCompletionDate: targetDate || null,
      agreedPrice: price === "" ? null : Number(price),
    });
    if (!outcome) return;
    setOpen(false);
    setTitle("");
    setTargetDate("");
    setPrice("");
    const id = (outcome.result as { id?: string } | null)?.id;
    if (id) onCreated?.(id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Open closing</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a closing</DialogTitle>
          <DialogDescription>
            A closing tracks the conditions and the hand-over. It never posts money: the agreed
            price below is a reference figure for the deal conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cl-title">Title</Label>
            <Input
              id="cl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to the opportunity title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl-target">Target completion date</Label>
            <Input
              id="cl-target"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl-price">Agreed price (indicative)</Label>
            <Input
              id="cl-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={actions.isPending}>
            Open closing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
