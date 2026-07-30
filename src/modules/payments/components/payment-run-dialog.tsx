/**
 * Payment run editor — reference, title, schedule.
 *
 * A run carries no amount of its own; the money follows the documents added
 * to it, so this form only describes the settlement session.
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
import { Textarea } from "@/components/ui/textarea";
import type { PaymentRunSummary } from "@/modules/payments/queries";
import { paymentRunDraftSchema, paymentRunUpdateSchema } from "@/modules/payments/schemas";
import type { PaymentActions } from "@/modules/payments/server";

const blank = { title: "", reference: "", description: "", scheduledExecutionDate: "" };

export function PaymentRunDialog({
  companyId,
  actions,
  run,
  disabled,
  onCreated,
}: {
  companyId: string | undefined;
  actions: PaymentActions;
  run?: PaymentRunSummary | null;
  disabled?: boolean;
  onCreated?: (id: string) => void;
}) {
  const editing = Boolean(run);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      run
        ? {
            title: run.title ?? "",
            reference: run.reference ?? "",
            description: run.description ?? "",
            scheduledExecutionDate: run.scheduled_execution_date ?? "",
          }
        : blank,
    );
  }, [open, run]);

  const set = (key: keyof typeof blank, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError(null);
    if (editing && run) {
      const parsed = paymentRunUpdateSchema.safeParse({
        runId: run.payment_run_id,
        title: form.title || undefined,
        description: form.description || undefined,
        scheduledExecutionDate: form.scheduledExecutionDate || undefined,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Check the form");
        return;
      }
      const result = await actions.run("updateRun", parsed.data);
      if (result) setOpen(false);
      return;
    }

    const parsed = paymentRunDraftSchema.safeParse({
      companyId,
      title: form.title,
      reference: form.reference || undefined,
      description: form.description || undefined,
      scheduledExecutionDate: form.scheduledExecutionDate || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    const result = (await actions.run("createRun", parsed.data)) as
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
          {editing ? "Edit run" : <><Plus className="size-4" /> New payment run</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit payment run" : "New payment run"}</DialogTitle>
          <DialogDescription>
            A payment run groups approved supplier invoices into one settlement session. It never
            changes an invoice or posts an accounting entry.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pr-title">Title</Label>
            <Input
              id="pr-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="February supplier payments"
            />
          </div>
          {editing ? null : (
            <div className="grid gap-2">
              <Label htmlFor="pr-reference">Reference</Label>
              <Input
                id="pr-reference"
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
                placeholder="Left blank, one is generated"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="pr-date">Scheduled execution date</Label>
            <Input
              id="pr-date"
              type="date"
              value={form.scheduledExecutionDate}
              onChange={(e) => set("scheduledExecutionDate", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pr-description">Description</Label>
            <Textarea
              id="pr-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={actions.isPending}>
            {editing ? "Save" : "Create run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
