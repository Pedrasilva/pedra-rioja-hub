/**
 * Phase 8D — budget version workspace.
 *
 * Draft versions are editable; published versions are read-only for everyone
 * (the database refuses the write regardless of what this component renders).
 * All consumption figures below are derived from commitments.
 */

import { useMemo, useState } from "react";
import { Lock, Plus, Send, Trash2 } from "lucide-react";

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
import { Progress } from "@/components/ui/progress";
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
import { formatMoneyPrecise, formatPercent, titleCase } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import { usePropertyOptions } from "@/modules/operations/queries";
import {
  useDimensionValueOptions,
  useProjectOptions,
  type BudgetLinePerformance,
  type BudgetVersionSummary,
} from "@/modules/budgets/queries";
import { monthLabel, MONTH_LABELS } from "@/modules/budgets/schemas";
import type { BudgetActions } from "@/modules/budgets/server";

const NONE = "__none__";

type LineForm = {
  lineId?: string;
  label: string;
  plannedAmount: string;
  direction: string;
  periodMonth: string;
  dimensionValueId: string;
  propertyId: string;
  projectId: string;
  notes: string;
};

const emptyLine: LineForm = {
  label: "",
  plannedAmount: "0",
  direction: "outflow",
  periodMonth: NONE,
  dimensionValueId: NONE,
  propertyId: NONE,
  projectId: NONE,
  notes: "",
};

export function BudgetVersionPanel({
  companyId,
  version,
  versions,
  lines,
  capabilities,
  actions,
  onSelectVersion,
  isLoading,
}: {
  companyId: string | undefined;
  version: BudgetVersionSummary | undefined;
  versions: BudgetVersionSummary[];
  lines: BudgetLinePerformance[];
  capabilities: CommitmentCapabilities;
  actions: BudgetActions;
  onSelectVersion: (versionId: string) => void;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LineForm>(emptyLine);
  const [dimensionFilter, setDimensionFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");

  const { data: dimensionValues = [] } = useDimensionValueOptions(companyId);
  const { data: properties = [] } = usePropertyOptions(companyId);
  const { data: projects = [] } = useProjectOptions(companyId);

  const isDraft = version?.status === "draft";
  const editable = Boolean(isDraft && capabilities.canRecord);
  const currency = version?.currency ?? "EUR";

  const filtered = useMemo(
    () =>
      lines.filter((l) => {
        if (dimensionFilter !== "all" && l.dimension_value_id !== dimensionFilter) return false;
        if (propertyFilter !== "all" && l.property_id !== propertyFilter) return false;
        return true;
      }),
    [lines, dimensionFilter, propertyFilter],
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, l) => ({
          planned: acc.planned + Number(l.planned_amount ?? 0),
          committed: acc.committed + Number(l.committed_amount ?? 0),
          invoiced: acc.invoiced + Number(l.invoiced_amount ?? 0),
          paid: acc.paid + Number(l.paid_amount ?? 0),
        }),
        { planned: 0, committed: 0, invoiced: 0, paid: 0 },
      ),
    [filtered],
  );

  const openEditor = (line?: BudgetLinePerformance) => {
    setForm(
      line
        ? {
            lineId: line.line_id,
            label: line.label,
            plannedAmount: String(line.planned_amount ?? 0),
            direction: line.direction,
            periodMonth: line.period_month ? String(line.period_month) : NONE,
            dimensionValueId: line.dimension_value_id ?? NONE,
            propertyId: line.property_id ?? NONE,
            projectId: line.project_id ?? NONE,
            notes: line.notes ?? "",
          }
        : emptyLine,
    );
    setOpen(true);
  };

  const saveLine = async () => {
    if (!version) return;
    const dimension = dimensionValues.find((d) => d.id === form.dimensionValueId);
    await actions.run("upsertLine", {
      versionId: version.version_id,
      lineId: form.lineId,
      label: form.label,
      plannedAmount: form.plannedAmount,
      direction: form.direction,
      periodMonth: form.periodMonth === NONE ? undefined : Number(form.periodMonth),
      dimensionId: dimension?.dimension_id,
      dimensionValueId: form.dimensionValueId === NONE ? undefined : form.dimensionValueId,
      propertyId: form.propertyId === NONE ? undefined : form.propertyId,
      projectId: form.projectId === NONE ? undefined : form.projectId,
      notes: form.notes || undefined,
    });
    setOpen(false);
  };

  if (!version) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No version selected</CardTitle>
          <CardDescription>This budget has no versions yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const consumed = version.planned_amount
    ? (version.committed_amount / version.planned_amount) * 100
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Version {version.version_no}
              <Badge variant={version.status === "published" ? "default" : "secondary"}>
                {titleCase(version.status)}
              </Badge>
              {version.approval_status !== "not_requested" ? (
                <Badge variant="outline">Approval: {titleCase(version.approval_status)}</Badge>
              ) : null}
              {!isDraft ? <Lock className="h-4 w-4 text-muted-foreground" /> : null}
            </CardTitle>
            <CardDescription>
              {isDraft
                ? "Draft version — planned values can still be edited."
                : "Published versions are read-only. Create a new version to revise the plan."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={version.version_id} onValueChange={onSelectVersion}>
              <SelectTrigger className="w-52" aria-label="Version">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.version_id} value={v.version_id}>
                    v{v.version_no} · {titleCase(v.status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {capabilities.canRecord ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => actions.run("createVersion", { budgetId: version.budget_id })}
                disabled={actions.isPending}
              >
                New version
              </Button>
            ) : null}
            {editable ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => actions.run("requestApproval", { versionId: version.version_id })}
                disabled={actions.isPending}
              >
                <Send className="mr-2 h-4 w-4" /> Send for approval
              </Button>
            ) : null}
            {capabilities.canManage && (version.status === "draft" || version.status === "pending_approval") ? (
              <Button
                size="sm"
                onClick={() => actions.run("publishVersion", { versionId: version.version_id })}
                disabled={actions.isPending}
              >
                Publish
              </Button>
            ) : null}
            {capabilities.canManage && version.status !== "archived" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => actions.run("archiveVersion", { versionId: version.version_id })}
                disabled={actions.isPending}
              >
                Archive
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Budget", version.planned_amount],
            ["Committed", version.committed_amount],
            ["Invoiced", version.invoiced_amount],
            ["Paid", version.paid_amount],
            ["Remaining", version.remaining_amount],
            ["Variance", version.variance_amount],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="text-lg font-semibold">
                {formatMoneyPrecise(Number(value), currency)}
              </div>
            </div>
          ))}
          <div className="sm:col-span-3 lg:col-span-6">
            <Progress value={Math.max(0, Math.min(100, consumed))} />
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPercent(consumed)} of the plan is committed. Everything except Budget is
              derived from commitments.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Planned lines</CardTitle>
            <CardDescription>
              Attribution uses the Dimensions model — the only classification system in the app.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={dimensionFilter} onValueChange={setDimensionFilter}>
              <SelectTrigger className="w-52" aria-label="Dimension filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dimensions</SelectItem>
                {dimensionValues.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.dimension_name}: {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-48" aria-label="Property filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editable ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => openEditor()}>
                    <Plus className="mr-2 h-4 w-4" /> Add line
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{form.lineId ? "Edit budget line" : "Add budget line"}</DialogTitle>
                    <DialogDescription>
                      A budget line holds a planned value only. It creates no commitment, cash flow
                      or bookkeeping entry.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="line-label">Label</Label>
                      <Input
                        id="line-label"
                        value={form.label}
                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="line-amount">Planned amount</Label>
                      <Input
                        id="line-amount"
                        type="number"
                        step="0.01"
                        value={form.plannedAmount}
                        onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Direction</Label>
                      <Select
                        value={form.direction}
                        onValueChange={(v) => setForm({ ...form, direction: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outflow">Outflow</SelectItem>
                          <SelectItem value="inflow">Inflow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Period</Label>
                      <Select
                        value={form.periodMonth}
                        onValueChange={(v) => setForm({ ...form, periodMonth: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Full year</SelectItem>
                          {MONTH_LABELS.map((m, i) => (
                            <SelectItem key={m} value={String(i + 1)}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Dimension value</Label>
                      <Select
                        value={form.dimensionValueId}
                        onValueChange={(v) => setForm({ ...form, dimensionValueId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unattributed" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Unattributed</SelectItem>
                          {dimensionValues.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.dimension_name}: {d.label}
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
                          <SelectValue placeholder="Inherit from budget" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Inherit from budget</SelectItem>
                          {properties.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Project</Label>
                      <Select
                        value={form.projectId}
                        onValueChange={(v) => setForm({ ...form, projectId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>None</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="line-notes">Notes</Label>
                      <Textarea
                        id="line-notes"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={saveLine}
                      disabled={form.label.trim().length === 0 || actions.isPending}
                    >
                      Save line
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
                <TableHead>#</TableHead>
                <TableHead>Line</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Dimension</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                {editable ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11}>Loading lines…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>No budget lines yet.</TableCell>
                </TableRow>
              ) : (
                filtered.map((l) => (
                  <TableRow key={l.line_id}>
                    <TableCell>{l.line_no}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium underline-offset-4 hover:underline disabled:no-underline"
                        disabled={!editable}
                        onClick={() => openEditor(l)}
                      >
                        {l.label}
                      </button>
                      <div className="text-xs text-muted-foreground">{titleCase(l.direction)}</div>
                    </TableCell>
                    <TableCell>{monthLabel(l.period_month)}</TableCell>
                    <TableCell>{l.dimension_value_label ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(l.planned_amount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(l.committed_amount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(l.invoiced_amount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(l.paid_amount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(l.remaining_amount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(l.variance_amount, currency)}
                    </TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove ${l.label}`}
                          onClick={() => actions.run("deleteLine", { lineId: l.line_id })}
                          disabled={actions.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
            {filtered.length > 0 ? (
              <TableBody>
                <TableRow className="font-medium">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(totals.planned, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(totals.committed, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(totals.invoiced, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(totals.paid, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(totals.planned - totals.committed, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(totals.committed - totals.planned, currency)}
                  </TableCell>
                  {editable ? <TableCell /> : null}
                </TableRow>
              </TableBody>
            ) : null}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
