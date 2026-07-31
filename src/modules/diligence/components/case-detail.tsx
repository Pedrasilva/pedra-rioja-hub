/**
 * Phase 8F.3 — one due-diligence case: checklist, findings and the
 * recommendation that opens (or refuses) the Phase 8F.4 closing gate.
 *
 * Every gate shown here is presentation only; the database re-checks each one
 * and fails closed.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import type { DiligenceCapabilities } from "@/modules/diligence/capabilities";
import {
  useDiligenceEvents,
  useDiligenceItems,
  type DiligenceCase,
  type DiligenceItem,
} from "@/modules/diligence/queries";
import {
  DILIGENCE_ITEM_STATUSES,
  DILIGENCE_SECTIONS,
  RISK_LEVELS,
} from "@/modules/diligence/schemas";
import type { DiligenceActions } from "@/modules/diligence/server";
import { CaseStatusBadge, ItemStatusBadge, RecommendationBadge, RiskBadge } from "./status-badge";

export function DiligenceCaseDetail({
  record,
  capabilities,
  actions,
}: {
  record: DiligenceCase;
  capabilities: DiligenceCapabilities;
  actions: DiligenceActions;
}) {
  const { data: items = [] } = useDiligenceItems(record.case_id);
  const { data: events = [] } = useDiligenceEvents(record.case_id);
  const closed = record.status === "completed" || record.status === "abandoned" || record.is_archived;

  const sections = useMemo(() => {
    const map = new Map<string, DiligenceItem[]>();
    for (const item of items) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{record.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {record.reference} ·{" "}
                <Link
                  to="/acquisitions/$opportunityId"
                  params={{ opportunityId: record.opportunity_id }}
                  className="underline-offset-4 hover:underline"
                >
                  {record.opportunity_reference}
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CaseStatusBadge status={record.status} />
              <RecommendationBadge recommendation={record.recommendation} />
              {record.permits_completion ? (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  Closing gate open
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Figure label="Progress" value={`${record.done_count}/${record.item_count}`} />
            <Figure label="Blocking outstanding" value={String(record.blocking_outstanding)} />
            <Figure label="Failed items" value={String(record.failed_count)} />
            <Figure label="Target date" value={formatDate(record.target_date)} />
          </div>
          <Progress value={record.progress_pct} aria-label="Checklist progress" />
          {record.summary ? (
            <p className="text-sm text-muted-foreground">{record.summary}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!closed && capabilities.canEditItems ? (
              <AddItemDialog caseId={record.case_id} actions={actions} />
            ) : null}
            {!closed && capabilities.canComplete ? (
              <CompleteDialog record={record} actions={actions} />
            ) : null}
            {!closed && capabilities.canRecord && record.status !== "on_hold" ? (
              <Button
                variant="outline"
                disabled={actions.isPending}
                onClick={() =>
                  actions.run("caseStatus", {
                    caseId: record.case_id,
                    status: "on_hold",
                    reason: "Placed on hold",
                  })
                }
              >
                Put on hold
              </Button>
            ) : null}
            {!closed && capabilities.canRecord && record.status === "on_hold" ? (
              <Button
                variant="outline"
                disabled={actions.isPending}
                onClick={() =>
                  actions.run("caseStatus", {
                    caseId: record.case_id,
                    status: "in_progress",
                    reason: "Resumed",
                  })
                }
              >
                Resume
              </Button>
            ) : null}
            {capabilities.canArchive && !record.is_archived ? (
              <Button
                variant="ghost"
                disabled={actions.isPending}
                onClick={() => actions.run("archive", { caseId: record.case_id, reason: null })}
              >
                Archive
              </Button>
            ) : null}
            {capabilities.canArchive && record.is_archived ? (
              <Button
                variant="ghost"
                disabled={actions.isPending}
                onClick={() => actions.run("restore", { caseId: record.case_id })}
              >
                Restore
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4 pt-4">
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No checklist items yet. Add them one by one, or open the next case from a template.
            </p>
          ) : (
            sections.map(([section, rows]) => (
              <Card key={section}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{section}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rows.map((item) => (
                    <ChecklistRow
                      key={item.item_id}
                      item={item}
                      actions={actions}
                      capabilities={capabilities}
                      locked={closed}
                    />
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardContent className="space-y-3 pt-6">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="text-sm">
                    <span className="font-medium capitalize">
                      {(event.from_status ?? "new").replace(/_/g, " ")} →{" "}
                      {event.to_status.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatDate(event.occurred_at)}
                      {event.recommendation ? ` · ${event.recommendation.replace(/_/g, " ")}` : ""}
                    </span>
                    {event.reason ? (
                      <p className="text-xs text-muted-foreground">{event.reason}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}

function ChecklistRow({
  item,
  actions,
  capabilities,
  locked,
}: {
  item: DiligenceItem;
  actions: DiligenceActions;
  capabilities: DiligenceCapabilities;
  locked: boolean;
}) {
  const [findings, setFindings] = useState(item.findings ?? "");
  const [risk, setRisk] = useState(item.risk_level);

  function setStatus(status: string) {
    if (status === "waived") return;
    actions.run("itemStatus", {
      itemId: item.item_id,
      status,
      findings: findings.trim() || null,
      riskLevel: risk,
    });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {item.title}
            {item.is_blocking ? (
              <Badge variant="outline" className="ml-2 bg-accent/20 text-accent-foreground">
                Blocking
              </Badge>
            ) : null}
          </p>
          {item.description ? (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={item.risk_level} />
          <ItemStatusBadge status={item.status} />
        </div>
      </div>

      {!locked && capabilities.canEditItems ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Findings"
            className="min-h-16 text-sm"
            aria-label={`Findings for ${item.title}`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={risk} onValueChange={setRisk}>
              <SelectTrigger className="h-9 w-40" aria-label={`Risk level for ${item.title}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={item.status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-40" aria-label={`Status for ${item.title}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DILIGENCE_ITEM_STATUSES.filter((s) => s.value !== "waived").map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {capabilities.canWaive && item.status !== "waived" ? (
              <WaiveDialog item={item} actions={actions} />
            ) : null}
          </div>
        </div>
      ) : null}

      {item.status === "waived" && item.waiver_reason ? (
        <p className="mt-2 text-xs text-muted-foreground">Waived — {item.waiver_reason}</p>
      ) : null}
    </div>
  );
}

function WaiveDialog({ item, actions }: { item: DiligenceItem; actions: DiligenceActions }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Waive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waive “{item.title}”</DialogTitle>
          <DialogDescription>
            A waiver is a decision on the record. It clears the item without evidence, so the reason
            has to stand on its own.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this item being waived?"
          aria-label="Waiver reason"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={reason.trim().length < 3 || actions.isPending}
            onClick={async () => {
              const ok = await actions.run("itemStatus", {
                itemId: item.item_id,
                status: "waived",
                waiverReason: reason.trim(),
              });
              if (ok) setOpen(false);
            }}
          >
            Waive item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({ caseId, actions }: { caseId: string; actions: DiligenceActions }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState<string>(DILIGENCE_SECTIONS[0]);
  const [blocking, setBlocking] = useState(false);
  const [dueDate, setDueDate] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add checklist item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a checklist item</DialogTitle>
          <DialogDescription>
            Blocking items must be complete or explicitly waived before the case can be completed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-title">Title</Label>
            <Input id="item-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-section">Section</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger id="item-section">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DILIGENCE_SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-due">Due date</Label>
            <Input
              id="item-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="item-blocking"
              checked={blocking}
              onCheckedChange={(v) => setBlocking(v === true)}
            />
            <Label htmlFor="item-blocking">Blocking item</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || actions.isPending}
            onClick={async () => {
              const ok = await actions.run("addItem", {
                caseId,
                title: title.trim(),
                section,
                isBlocking: blocking,
                dueDate: dueDate || null,
              });
              if (ok) {
                setOpen(false);
                setTitle("");
              }
            }}
          >
            Add item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteDialog({
  record,
  actions,
}: {
  record: DiligenceCase;
  actions: DiligenceActions;
}) {
  const [open, setOpen] = useState(false);
  const [recommendation, setRecommendation] = useState("proceed");
  const [summary, setSummary] = useState("");
  const blocked = record.blocking_outstanding > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Complete due diligence</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete due diligence</DialogTitle>
          <DialogDescription>
            The recommendation is the hand-over to closing. Only “proceed” and “proceed with
            conditions” let a closing be marked ready.
          </DialogDescription>
        </DialogHeader>
        {blocked ? (
          <p className="text-sm text-destructive">
            {record.blocking_outstanding} blocking item(s) are still outstanding.
          </p>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dd-reco">Recommendation</Label>
            <Select value={recommendation} onValueChange={setRecommendation}>
              <SelectTrigger id="dd-reco">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proceed">Proceed</SelectItem>
                <SelectItem value="proceed_with_conditions">Proceed with conditions</SelectItem>
                <SelectItem value="renegotiate">Renegotiate</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="dd-summary">Summary</Label>
            <Textarea
              id="dd-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What did diligence conclude?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={blocked || actions.isPending}
            onClick={async () => {
              const ok = await actions.run("complete", {
                caseId: record.case_id,
                recommendation,
                summary: summary.trim() || null,
              });
              if (ok) setOpen(false);
            }}
          >
            Complete case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
