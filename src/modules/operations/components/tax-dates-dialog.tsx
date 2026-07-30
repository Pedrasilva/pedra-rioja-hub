/**
 * Phase 8B — instalment dates for a tax schedule.
 *
 * Dates only. The amount owed is whatever the linked commitment authorises,
 * so this panel deliberately has no money field.
 */

import { useState } from "react";
import { CalendarPlus } from "lucide-react";

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
import { formatDate } from "@/lib/format";
import { OperationalBadge } from "./operational-badge";
import type { TaxScheduleDateRow } from "@/modules/operations/queries";
import type { OperationsActions } from "@/modules/operations/server";

export function TaxDatesDialog({
  scheduleId,
  title,
  dates,
  actions,
  canRecord,
}: {
  scheduleId: string;
  title: string;
  dates: TaxScheduleDateRow[];
  actions: OperationsActions;
  canRecord: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [label, setLabel] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!dueDate) {
      setError("A due date is required");
      return;
    }
    setError(null);
    const result = await actions.run("addTaxDate", {
      scheduleId,
      dueDate,
      label: label || null,
      reminderDate: reminderDate || null,
      notes: notes || null,
    });
    if (result) {
      setDueDate("");
      setLabel("");
      setReminderDate("");
      setNotes("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          Dates ({dates.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Instalment dates — {title}</DialogTitle>
          <DialogDescription>
            When each instalment falls due. What it costs comes from the commitment.
          </DialogDescription>
        </DialogHeader>

        {dates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No instalment dates recorded yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {dates.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-medium">{formatDate(d.due_date)}</span>
                <span className="flex-1 text-muted-foreground">{d.label ?? "Instalment"}</span>
                <OperationalBadge status={d.status} />
              </li>
            ))}
          </ul>
        )}

        {canRecord ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tax-due">Due date</Label>
              <Input
                id="tax-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tax-label">Label</Label>
              <Input
                id="tax-label"
                value={label}
                placeholder="First instalment"
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tax-remind">Remind on</Label>
              <Input
                id="tax-remind"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="tax-notes">Notes</Label>
              <Textarea
                id="tax-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive sm:col-span-2">
                {error}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <Button onClick={add} disabled={actions.isPending}>
                Add instalment date
              </Button>
            </div>
          </div>
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
