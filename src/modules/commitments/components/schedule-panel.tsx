/**
 * Schedule panel — versioned expected-spend timetable.
 *
 * History is immutable: invoiced, paid, reconciled and superseded lines are
 * read-only and stay exactly as they were. A revision is a *new version* with
 * an effective date; only future scheduled lines are replaced. Any total that
 * exceeds the authorised amount is shown as an unapproved variance and must be
 * approved before the version can be activated.
 */

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type {
  CommitmentRow,
  ScheduleLineRow,
  ScheduleVersionRow,
} from "@/modules/commitments/queries";
import {
  IMMUTABLE_LINE_STATUSES,
  SCHEDULE_LINE_TYPES,
  SCHEDULE_TYPES,
  labelOf,
  monthlyLines,
  scheduleTotal,
  scheduleVersionSchema,
  type ScheduleLineInput,
} from "@/modules/commitments/schemas";
import type { CommitmentActions } from "@/modules/commitments/server";
import { StatusBadge } from "./status-badge";

type Draft = ScheduleLineInput & { key: string };

let seq = 0;
const nextKey = () => `line-${(seq += 1)}`;

function toDraft(lines: ScheduleLineInput[]): Draft[] {
  return lines.map((l) => ({ ...l, key: nextKey() }));
}

const emptyLine = (lineNo: number): Draft => ({
  key: nextKey(),
  lineNo,
  expectedDate: "",
  amount: 0,
  lineType: "instalment",
  isRetention: false,
  isContingency: false,
  description: null,
});

export function SchedulePanel({
  commitment,
  versions,
  lines,
  capabilities,
  actions,
  projections,
}: {
  commitment: CommitmentRow;
  versions: ScheduleVersionRow[];
  lines: ScheduleLineRow[];
  capabilities: CommitmentCapabilities;
  actions: CommitmentActions;
  projections: { source_id: string; state: string; reconciliation_state: string }[];
}) {
  const current = versions.find((v) => v.is_current) ?? versions[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = versions.find((v) => v.id === selectedId) ?? current;

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [scheduleType, setScheduleType] = useState("custom");
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState<Draft[]>([]);
  const [months, setMonths] = useState("12");
  const [varianceReason, setVarianceReason] = useState("");

  const visibleLines = useMemo(
    () =>
      lines
        .filter((l) => (selected ? l.version_id === selected.id : true))
        .sort((a, b) => a.line_no - b.line_no),
    [lines, selected],
  );

  const projectionBySource = useMemo(
    () => new Map(projections.map((p) => [p.source_id, p])),
    [projections],
  );

  const frozenTotal = useMemo(
    () =>
      lines
        .filter((l) => ["invoiced", "paid", "reconciled"].includes(l.status))
        .reduce((s, l) => s + Number(l.amount), 0),
    [lines],
  );

  const draftTotal = scheduleTotal(draft);
  const projectedTotal = Math.round((frozenTotal + draftTotal) * 100) / 100;
  const variance = Math.round((projectedTotal - Number(commitment.authorised_amount)) * 100) / 100;

  function startRevision() {
    setError(null);
    setEditing(true);
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setScheduleType(current?.schedule_type ?? "custom");
    setReason("");
    const carryable = visibleLines
      .filter((l) => !IMMUTABLE_LINE_STATUSES.includes(l.status))
      .map<ScheduleLineInput>((l, i) => ({
        lineNo: i + 1,
        expectedDate: l.expected_date,
        amount: Number(l.amount),
        lineType: l.line_type as ScheduleLineInput["lineType"],
        isRetention: l.is_retention,
        isContingency: l.is_contingency,
        description: l.description,
      }));
    setDraft(carryable.length > 0 ? toDraft(carryable) : [emptyLine(1)]);
  }

  function renumber(rows: Draft[]) {
    return rows.map((r, i) => ({ ...r, lineNo: i + 1 }));
  }

  function updateLine(key: string, patch: Partial<Draft>) {
    setDraft((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function generateMonthly() {
    const start = effectiveFrom || new Date().toISOString().slice(0, 10);
    const remaining = Math.max(0, Number(commitment.authorised_amount) - frozenTotal);
    setDraft(toDraft(monthlyLines(start, Number(months) || 1, remaining)));
    setScheduleType("monthly");
  }

  async function saveVersion() {
    setError(null);
    const parsed = scheduleVersionSchema.safeParse({
      commitmentId: commitment.id,
      effectiveFrom,
      scheduleType,
      reason: reason || null,
      lines: draft.map(({ key: _key, ...l }) => l),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the schedule");
      return;
    }
    const result = await actions.run("createVersion", parsed.data);
    if (result) {
      setEditing(false);
      setSelectedId(null);
    }
  }

  const canEdit = capabilities.canManage && !["completed", "cancelled"].includes(commitment.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Schedule</CardTitle>
            <CardDescription>
              Expected spend over time. Revisions close the previous version and only replace
              future, untouched lines.
            </CardDescription>
          </div>
          {canEdit && !editing ? (
            <Button size="sm" variant="outline" onClick={startRevision}>
              <Plus className="mr-1.5 h-4 w-4" />
              {versions.length === 0 ? "Create schedule" : "Revise schedule"}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ------------------------------------------------------ versions */}
        {versions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Versions</p>
            <div className="flex flex-wrap gap-2">
              {versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  aria-pressed={selected?.id === v.id}
                  className={`rounded-md border px-3 py-1.5 text-left text-xs ${
                    selected?.id === v.id ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <span className="font-medium">v{v.version_no}</span>{" "}
                  <StatusBadge status={v.is_current ? "active" : v.status} className="ml-1" />
                  <span className="block text-muted-foreground">
                    From {formatDate(v.effective_from)} ·{" "}
                    {formatMoneyPrecise(v.total_amount, commitment.currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No schedule has been created yet.</p>
        )}

        {/* ------------------------------------------- selected version state */}
        {selected ? (
          <div className="space-y-3 rounded-md border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span>
                <span className="text-muted-foreground">Total </span>
                {formatMoneyPrecise(selected.total_amount, commitment.currency)}
              </span>
              <span>
                <span className="text-muted-foreground">Variance </span>
                {formatMoneyPrecise(selected.variance_amount, commitment.currency)}
              </span>
              <span>
                <span className="text-muted-foreground">Variance approved </span>
                {selected.variance_approved ? "Yes" : "No"}
              </span>
              <span>
                <span className="text-muted-foreground">Status </span>
                <StatusBadge status={selected.status} />
              </span>
            </div>
            {selected.reason ? (
              <p className="text-muted-foreground">Reason: {selected.reason}</p>
            ) : null}

            {selected.requires_approval && !selected.variance_approved ? (
              <div className="space-y-2 rounded-md border border-destructive/40 p-3">
                <p role="alert" className="text-destructive">
                  This version exceeds the authorised amount. The variance must be approved before
                  it can be activated.
                </p>
                {capabilities.canApprove ? (
                  <>
                    <Label htmlFor="variance-reason">Variance approval reason</Label>
                    <Input
                      id="variance-reason"
                      value={varianceReason}
                      onChange={(e) => setVarianceReason(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={actions.isPending || varianceReason.trim().length < 3}
                      onClick={() =>
                        actions.run("approveVariance", {
                          versionId: selected.id,
                          reason: varianceReason,
                        })
                      }
                    >
                      Approve variance
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}

            {selected.status === "draft" && capabilities.canManage ? (
              <Button
                size="sm"
                disabled={
                  actions.isPending || (selected.requires_approval && !selected.variance_approved)
                }
                onClick={() => actions.run("activateVersion", { versionId: selected.id })}
              >
                Activate version
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* --------------------------------------------------------- lines */}
        {visibleLines.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cash flow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLines.map((l) => {
                const projection = projectionBySource.get(l.id);
                return (
                  <TableRow key={l.id}>
                    <TableCell>{l.line_no}</TableCell>
                    <TableCell>{formatDate(l.expected_date)}</TableCell>
                    <TableCell>{labelOf(l.line_type)}</TableCell>
                    <TableCell className="text-muted-foreground">{l.description ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyPrecise(l.amount, commitment.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {projection
                        ? `${labelOf(projection.state)} · ${labelOf(projection.reconciliation_state)}`
                        : "Not projected"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}

        {/* -------------------------------------------------------- editor */}
        {editing ? (
          <div className="space-y-4 rounded-md border border-border p-3">
            <p className="text-sm font-medium">
              {versions.length === 0 ? "New schedule" : `New version (v${(current?.version_no ?? 0) + 1})`}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="effective-from">Effective from</Label>
                <Input
                  id="effective-from"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="schedule-type">Schedule type</Label>
                <Select value={scheduleType} onValueChange={setScheduleType}>
                  <SelectTrigger id="schedule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {labelOf(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="months">Spread over months</Label>
                <div className="flex gap-2">
                  <Input
                    id="months"
                    inputMode="numeric"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={generateMonthly}>
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="version-reason">Reason for this version</Label>
              <Textarea
                id="version-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Expected date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.map((l) => (
                  <TableRow key={l.key}>
                    <TableCell>{l.lineNo}</TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        aria-label={`Expected date line ${l.lineNo}`}
                        value={l.expectedDate}
                        onChange={(e) => updateLine(l.key, { expectedDate: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={l.lineType}
                        onValueChange={(v) =>
                          updateLine(l.key, {
                            lineType: v as ScheduleLineInput["lineType"],
                            isRetention: v === "retention",
                            isContingency: v === "contingency",
                          })
                        }
                      >
                        <SelectTrigger aria-label={`Line type line ${l.lineNo}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_LINE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {labelOf(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Description line ${l.lineNo}`}
                        value={l.description ?? ""}
                        onChange={(e) => updateLine(l.key, { description: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        className="text-right"
                        aria-label={`Amount line ${l.lineNo}`}
                        value={String(l.amount)}
                        onChange={(e) => updateLine(l.key, { amount: Number(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove line ${l.lineNo}`}
                        onClick={() =>
                          setDraft((rows) => renumber(rows.filter((r) => r.key !== l.key)))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraft((rows) => renumber([...rows, emptyLine(rows.length + 1)]))}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add line
            </Button>

            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Frozen history </span>
                {formatMoneyPrecise(frozenTotal, commitment.currency)}
              </p>
              <p>
                <span className="text-muted-foreground">New lines </span>
                {formatMoneyPrecise(draftTotal, commitment.currency)}
              </p>
              <p>
                <span className="text-muted-foreground">Schedule total </span>
                {formatMoneyPrecise(projectedTotal, commitment.currency)} vs authorised{" "}
                {formatMoneyPrecise(commitment.authorised_amount, commitment.currency)}
              </p>
              {variance > 0 ? (
                <p role="alert" className="text-destructive">
                  Over the authorised amount by{" "}
                  {formatMoneyPrecise(variance, commitment.currency)} — a variance approval will be
                  required.
                </p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button size="sm" onClick={saveVersion} disabled={actions.isPending}>
                Save version
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
