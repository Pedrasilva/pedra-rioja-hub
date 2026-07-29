/**
 * Maintenance workspace.
 *
 * Maintenance owns the operational facts — what needs doing, how urgent it is,
 * who is responsible, when it is due. It never owns money: any cost is read
 * from the linked commitment's summary, so a job cannot disagree with the
 * ledger.
 */

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import type { CommitmentSummary, MaintenanceJobRow } from "@/modules/commitments/queries";
import { useSupplierOptions } from "@/modules/commitments/queries";
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  labelOf,
  maintenanceJobSchema,
  maintenanceUpdateSchema,
} from "@/modules/commitments/schemas";
import type { CommitmentActions } from "@/modules/commitments/server";
import { StatusBadge } from "./status-badge";

const NONE = "__none__";

const blank = {
  title: "",
  description: "",
  priority: "medium",
  status: "requested",
  targetDate: "",
  completionDate: "",
  responsibleName: "",
  counterpartyId: NONE,
  commitmentId: NONE,
  notes: "",
};

function MaintenanceDialog({
  companyId,
  actions,
  commitments,
  job,
  disabled,
}: {
  companyId: string | undefined;
  actions: CommitmentActions;
  commitments: CommitmentSummary[];
  job?: MaintenanceJobRow;
  disabled?: boolean;
}) {
  const editing = Boolean(job);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const { data: suppliers = [] } = useSupplierOptions(companyId);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      job
        ? {
            title: job.title ?? "",
            description: job.description ?? "",
            priority: job.priority ?? "medium",
            status: job.status ?? "requested",
            targetDate: job.target_date ?? "",
            completionDate: job.completion_date ?? "",
            responsibleName: job.responsible_name ?? "",
            counterpartyId: job.counterparty_id ?? NONE,
            commitmentId: job.commitment_id ?? NONE,
            notes: job.notes ?? "",
          }
        : blank,
    );
  }, [open, job]);

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError(null);
    const shared = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      targetDate: form.targetDate || null,
      responsibleName: form.responsibleName || null,
      counterpartyId: form.counterpartyId === NONE ? null : form.counterpartyId,
      commitmentId: form.commitmentId === NONE ? null : form.commitmentId,
      notes: form.notes || null,
    };
    const parsed = editing
      ? maintenanceUpdateSchema.safeParse({
          ...shared,
          jobId: job!.id,
          status: form.status,
          completionDate: form.completionDate || null,
        })
      : maintenanceJobSchema.safeParse({ ...shared, companyId });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    const result = await actions.run(editing ? "updateJob" : "createJob", parsed.data);
    if (result) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={editing ? "ghost" : "default"} disabled={disabled}>
          {editing ? (
            "Edit"
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" /> New job
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit maintenance job" : "New maintenance job"}</DialogTitle>
          <DialogDescription>
            Operational detail only. Costs are read from the linked commitment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="m-title">Title</Label>
            <Input id="m-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="m-priority">Priority</Label>
            <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger id="m-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {labelOf(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editing ? (
            <div>
              <Label htmlFor="m-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger id="m-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelOf(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div>
            <Label htmlFor="m-target">Target date</Label>
            <Input
              id="m-target"
              type="date"
              value={form.targetDate}
              onChange={(e) => set("targetDate", e.target.value)}
            />
          </div>
          {editing ? (
            <div>
              <Label htmlFor="m-completion">Completion date</Label>
              <Input
                id="m-completion"
                type="date"
                value={form.completionDate}
                onChange={(e) => set("completionDate", e.target.value)}
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor="m-responsible">Responsible</Label>
            <Input
              id="m-responsible"
              value={form.responsibleName}
              onChange={(e) => set("responsibleName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="m-counterparty">Contractor</Label>
            <Select value={form.counterpartyId} onValueChange={(v) => set("counterpartyId", v)}>
              <SelectTrigger id="m-counterparty">
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
            <Label htmlFor="m-commitment">Linked commitment</Label>
            <Select value={form.commitmentId} onValueChange={(v) => set("commitmentId", v)}>
              <SelectTrigger id="m-commitment">
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not linked</SelectItem>
                {commitments.map((c) => (
                  <SelectItem key={c.commitment_id} value={c.commitment_id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="m-description">Description</Label>
            <Textarea
              id="m-description"
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea
              id="m-notes"
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
            {editing ? "Save changes" : "Create job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenancePanel({
  companyId,
  jobs,
  commitments,
  capabilities,
  actions,
}: {
  companyId: string | undefined;
  jobs: MaintenanceJobRow[];
  commitments: CommitmentSummary[];
  capabilities: CommitmentCapabilities;
  actions: CommitmentActions;
}) {
  const [status, setStatus] = useState("all");
  const byCommitment = useMemo(
    () => new Map(commitments.map((c) => [c.commitment_id, c])),
    [commitments],
  );
  const visible = jobs.filter((j) => status === "all" || j.status === status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Maintenance</CardTitle>
            <CardDescription>
              Operational jobs. Committed and invoiced figures come from the linked commitment.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {MAINTENANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {labelOf(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MaintenanceDialog
              companyId={companyId}
              actions={actions}
              commitments={commitments}
              disabled={!capabilities.canRecord}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance jobs to show.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>Commitment</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((j) => {
                const c = j.commitment_id ? byCommitment.get(j.commitment_id) : null;
                return (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={j.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={j.status} />
                    </TableCell>
                    <TableCell>{formatDate(j.target_date)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.responsible_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c?.title ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c ? formatMoneyPrecise(c.approved_committed_amount, c.currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c ? formatMoneyPrecise(c.invoiced_amount, c.currency) : "—"}
                    </TableCell>
                    <TableCell>
                      {capabilities.canRecord ? (
                        <MaintenanceDialog
                          companyId={companyId}
                          actions={actions}
                          commitments={commitments}
                          job={j}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
