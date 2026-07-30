/**
 * Phase 8D — preventive maintenance schedules.
 *
 * Schedules produce planned jobs; jobs own no money. The generator is
 * idempotent, so re-running it never duplicates a planned visit.
 */

import { useState } from "react";
import { CalendarClock, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { formatDate, titleCase } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import { usePropertyOptions } from "@/modules/operations/queries";
import type { MaintenanceScheduleSummary } from "@/modules/maintenance/queries";
import { scheduleFrequencies, scheduleKinds } from "@/modules/maintenance/schemas";
import type { MaintenanceActions } from "@/modules/maintenance/server";

const NONE = "__none__";

type Form = {
  scheduleId?: string;
  title: string;
  scheduleKind: string;
  frequency: string;
  intervalDays: string;
  startDate: string;
  endDate: string;
  leadTimeDays: string;
  priority: string;
  propertyId: string;
  assetLabel: string;
  responsibleName: string;
  notes: string;
};

const empty: Form = {
  title: "",
  scheduleKind: "preventive",
  frequency: "annual",
  intervalDays: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  leadTimeDays: "14",
  priority: "medium",
  propertyId: NONE,
  assetLabel: "",
  responsibleName: "",
  notes: "",
};

export function MaintenanceSchedulesPanel({
  companyId,
  schedules,
  capabilities,
  actions,
  isLoading,
}: {
  companyId: string | undefined;
  schedules: MaintenanceScheduleSummary[];
  capabilities: CommitmentCapabilities;
  actions: MaintenanceActions;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const { data: properties = [] } = usePropertyOptions(companyId);

  const openEditor = (row?: MaintenanceScheduleSummary) => {
    setForm(
      row
        ? {
            scheduleId: row.schedule_id,
            title: row.title,
            scheduleKind: row.schedule_kind,
            frequency: row.frequency,
            intervalDays: row.interval_days ? String(row.interval_days) : "",
            startDate: row.start_date,
            endDate: row.end_date ?? "",
            leadTimeDays: String(row.lead_time_days),
            priority: row.priority,
            propertyId: row.property_id ?? NONE,
            assetLabel: row.asset_label ?? "",
            responsibleName: row.responsible_name ?? "",
            notes: row.notes ?? "",
          }
        : empty,
    );
    setOpen(true);
  };

  const save = async () => {
    if (!companyId) return;
    await actions.run("upsertSchedule", {
      companyId,
      scheduleId: form.scheduleId,
      title: form.title,
      scheduleKind: form.scheduleKind,
      frequency: form.frequency,
      intervalDays: form.intervalDays ? Number(form.intervalDays) : undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      leadTimeDays: Number(form.leadTimeDays || 14),
      priority: form.priority,
      propertyId: form.propertyId === NONE ? undefined : form.propertyId,
      assetLabel: form.assetLabel || undefined,
      responsibleName: form.responsibleName || undefined,
      notes: form.notes || undefined,
      isActive: true,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Preventive schedules</CardTitle>
          <CardDescription>
            Recurring inspections and planned maintenance. Generated jobs carry no money —
            expenditure still requires a quotation, a commitment and an approval.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {capabilities.canRecord ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => companyId && actions.run("generateJobs", { companyId, horizonMonths: 12 })}
              disabled={actions.isPending || !companyId}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Generate planned jobs
            </Button>
          ) : null}
          {capabilities.canRecord ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => openEditor()}>
                  <Plus className="mr-2 h-4 w-4" /> New schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {form.scheduleId ? "Edit schedule" : "New maintenance schedule"}
                  </DialogTitle>
                  <DialogDescription>
                    Plans the recurrence only. Costs enter later through a commitment.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="ms-title">Title</Label>
                    <Input
                      id="ms-title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Kind</Label>
                    <Select
                      value={form.scheduleKind}
                      onValueChange={(v) => setForm({ ...form, scheduleKind: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduleKinds.map((k) => (
                          <SelectItem key={k} value={k}>
                            {titleCase(k)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(v) => setForm({ ...form, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduleFrequencies.map((f) => (
                          <SelectItem key={f} value={f}>
                            {titleCase(f)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.frequency === "custom_days" ? (
                    <div>
                      <Label htmlFor="ms-interval">Interval (days)</Label>
                      <Input
                        id="ms-interval"
                        type="number"
                        value={form.intervalDays}
                        onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
                      />
                    </div>
                  ) : null}
                  <div>
                    <Label htmlFor="ms-start">First occurrence</Label>
                    <Input
                      id="ms-start"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ms-end">Ends (optional)</Label>
                    <Input
                      id="ms-end"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ms-lead">Lead time (days)</Label>
                    <Input
                      id="ms-lead"
                      type="number"
                      value={form.leadTimeDays}
                      onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm({ ...form, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["low", "medium", "high", "urgent"].map((p) => (
                          <SelectItem key={p} value={p}>
                            {titleCase(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Property</Label>
                    <Select
                      value={form.propertyId}
                      onValueChange={(v) => setForm({ ...form, propertyId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Portfolio-wide" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Portfolio-wide</SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ms-asset">Asset</Label>
                    <Input
                      id="ms-asset"
                      value={form.assetLabel}
                      onChange={(e) => setForm({ ...form, assetLabel: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ms-owner">Responsible</Label>
                    <Input
                      id="ms-owner"
                      value={form.responsibleName}
                      onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="ms-notes">Notes</Label>
                    <Textarea
                      id="ms-notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={save} disabled={form.title.trim().length < 2 || actions.isPending}>
                    Save schedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Schedule</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next planned</TableHead>
              <TableHead className="text-right">Open jobs</TableHead>
              <TableHead className="text-right">Total jobs</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading schedules…</TableCell>
              </TableRow>
            ) : schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No preventive schedules yet.</TableCell>
              </TableRow>
            ) : (
              schedules.map((s) => (
                <TableRow key={s.schedule_id}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium underline-offset-4 hover:underline disabled:no-underline"
                      disabled={!capabilities.canRecord || Boolean(s.archived_at)}
                      onClick={() => openEditor(s)}
                    >
                      {s.title}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {s.property_name ?? "Portfolio-wide"}
                      {s.asset_label ? ` · ${s.asset_label}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{titleCase(s.schedule_kind)}</Badge>
                  </TableCell>
                  <TableCell>
                    {titleCase(s.frequency)}
                    {s.frequency === "custom_days" && s.interval_days
                      ? ` (${s.interval_days}d)`
                      : ""}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(s.next_planned_date)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{s.open_count}</TableCell>
                  <TableCell className="text-right">{s.job_count}</TableCell>
                  <TableCell className="text-right">
                    {capabilities.canManage && !s.archived_at ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          actions.run("archiveSchedule", { scheduleId: s.schedule_id })
                        }
                        disabled={actions.isPending}
                      >
                        Archive
                      </Button>
                    ) : s.archived_at ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
