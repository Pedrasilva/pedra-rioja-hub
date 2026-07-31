/**
 * Phase 8F.4 — one closing: conditions precedent, hand-over tasks, the
 * readiness gate and the single conversion into a managed property.
 *
 * Every gate rendered here is presentation only; `closing_readiness` and the
 * SECURITY DEFINER functions decide and fail closed.
 */

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney } from "@/lib/format";
import type { ClosingCapabilities } from "@/modules/closings/capabilities";
import {
  useClosingConditions,
  useClosingEvents,
  useHandoverTasks,
  type ClosingCase,
  type ClosingCondition,
  type HandoverTask,
} from "@/modules/closings/queries";
import {
  CONDITION_CATEGORIES,
  CONDITION_STATUSES,
  HANDOVER_CATEGORIES,
  HANDOVER_TASK_STATUSES,
  PROPERTY_TYPES,
  RESPONSIBLE_PARTIES,
  closingReadiness,
} from "@/modules/closings/schemas";
import type { ClosingActions } from "@/modules/closings/server";
import { ClosingStatusBadge, ConditionBadge, HandoverBadge, TaskBadge } from "./status-badge";

export function ClosingDetail({
  record,
  capabilities,
  actions,
}: {
  record: ClosingCase;
  capabilities: ClosingCapabilities;
  actions: ClosingActions;
}) {
  const { data: conditions = [] } = useClosingConditions(record.closing_id);
  const { data: tasks = [] } = useHandoverTasks(record.closing_id);
  const { data: events = [] } = useClosingEvents(record.closing_id);
  const closed =
    record.status === "completed" || record.status === "cancelled" || record.is_archived;
  const readiness = closingReadiness(record);

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
                {record.due_diligence_case_id ? (
                  <>
                    {" · "}
                    <Link
                      to="/due-diligence/$caseId"
                      params={{ caseId: record.due_diligence_case_id }}
                      className="underline-offset-4 hover:underline"
                    >
                      {record.diligence_reference ?? "Due diligence"}
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ClosingStatusBadge status={record.status} />
              <HandoverBadge status={record.handover_status} />
              {record.property_id ? (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  Property created
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Figure
              label="Conditions"
              value={`${record.conditions_met}/${record.condition_count}`}
            />
            <Figure label="Blocking outstanding" value={String(record.blocking_outstanding)} />
            <Figure
              label="Handover"
              value={`${record.handover_tasks_done}/${record.handover_task_count}`}
            />
            <Figure
              label="Agreed price"
              value={formatMoney(record.agreed_price, record.currency)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Figure label="Target completion" value={formatDate(record.target_completion_date)} />
            <Figure label="Deed date" value={formatDate(record.deed_date)} />
            <Figure label="Possession" value={formatDate(record.possession_date)} />
            <Figure label="Notary" value={record.notary_name ?? "—"} />
          </div>

          {!readiness.isReady && !closed ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Not ready to close</p>
              <ul className="mt-1 list-disc pl-5">
                {readiness.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!closed && capabilities.canMarkReady && record.status !== "ready_to_close" ? (
              <Button
                disabled={!readiness.isReady || actions.isPending}
                onClick={() => actions.run("markReady", { closingId: record.closing_id })}
              >
                Mark ready to close
              </Button>
            ) : null}
            {!closed && capabilities.canComplete && record.status === "ready_to_close" ? (
              <CompleteClosingDialog record={record} actions={actions} />
            ) : null}
            {record.status === "completed" && !record.property_id && capabilities.canCreateProperty ? (
              <CreatePropertyDialog record={record} actions={actions} />
            ) : null}
            {!closed && capabilities.canCancel ? (
              <CancelClosingDialog record={record} actions={actions} />
            ) : null}
            {capabilities.canArchive && !record.is_archived ? (
              <Button
                variant="ghost"
                disabled={actions.isPending}
                onClick={() => actions.run("archive", { closingId: record.closing_id, reason: null })}
              >
                Archive
              </Button>
            ) : null}
            {capabilities.canArchive && record.is_archived ? (
              <Button
                variant="ghost"
                disabled={actions.isPending}
                onClick={() => actions.run("restore", { closingId: record.closing_id })}
              >
                Restore
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="conditions">
        <TabsList>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="handover">Handover</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="conditions" className="space-y-3 pt-4">
          {!closed && capabilities.canEdit ? (
            <ConditionDialog closingId={record.closing_id} actions={actions} />
          ) : null}
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conditions recorded yet.</p>
          ) : (
            conditions.map((condition) => (
              <ConditionRow
                key={condition.id}
                condition={condition}
                actions={actions}
                capabilities={capabilities}
                locked={closed}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="handover" className="space-y-3 pt-4">
          {!closed && capabilities.canEdit ? (
            <HandoverTaskDialog closingId={record.closing_id} actions={actions} />
          ) : null}
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No handover tasks yet.</p>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                actions={actions}
                capabilities={capabilities}
                locked={record.is_archived}
              />
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
                    <span className="text-muted-foreground"> · {formatDate(event.occurred_at)}</span>
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

function ConditionRow({
  condition,
  actions,
  capabilities,
  locked,
}: {
  condition: ClosingCondition;
  actions: ClosingActions;
  capabilities: ClosingCapabilities;
  locked: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-sm font-medium">
            {condition.title}
            {condition.is_blocking ? (
              <Badge variant="outline" className="ml-2 bg-accent/20 text-accent-foreground">
                Blocking
              </Badge>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {condition.category} · {condition.responsible_party}
            {condition.due_date ? ` · due ${formatDate(condition.due_date)}` : ""}
          </p>
          {condition.waiver_reason ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Waived — {condition.waiver_reason}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ConditionBadge status={condition.status} />
          {!locked && capabilities.canEdit ? (
            <Select
              value={condition.status}
              onValueChange={(status) => {
                if (status === "waived") return;
                actions.run("conditionStatus", { conditionId: condition.id, status });
              }}
            >
              <SelectTrigger className="h-9 w-40" aria-label={`Status for ${condition.title}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_STATUSES.filter((s) => s.value !== "waived").map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {!locked && capabilities.canWaive && condition.status !== "waived" ? (
            <WaiveConditionDialog condition={condition} actions={actions} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function WaiveConditionDialog({
  condition,
  actions,
}: {
  condition: ClosingCondition;
  actions: ClosingActions;
}) {
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
          <DialogTitle>Waive “{condition.title}”</DialogTitle>
          <DialogDescription>
            Waiving clears a condition precedent without it being satisfied. The reason stays on the
            record.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Waiver reason"
          placeholder="Why is this condition being waived?"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={reason.trim().length < 3 || actions.isPending}
            onClick={async () => {
              const ok = await actions.run("conditionStatus", {
                conditionId: condition.id,
                status: "waived",
                waiverReason: reason.trim(),
              });
              if (ok) setOpen(false);
            }}
          >
            Waive condition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskRow({
  task,
  actions,
  capabilities,
  locked,
}: {
  task: HandoverTask;
  actions: ClosingActions;
  capabilities: ClosingCapabilities;
  locked: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-sm font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.category}
            {task.due_date ? ` · due ${formatDate(task.due_date)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TaskBadge status={task.status} />
          {!locked && capabilities.canEdit ? (
            <Select
              value={task.status}
              onValueChange={(status) => actions.run("taskStatus", { taskId: task.id, status })}
            >
              <SelectTrigger className="h-9 w-40" aria-label={`Status for ${task.title}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HANDOVER_TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ConditionDialog({
  closingId,
  actions,
}: {
  closingId: string;
  actions: ClosingActions;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("legal");
  const [party, setParty] = useState("buyer");
  const [blocking, setBlocking] = useState(true);
  const [dueDate, setDueDate] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add condition</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a condition precedent</DialogTitle>
          <DialogDescription>
            Blocking conditions must be satisfied or waived before the closing can be marked ready.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cond-title">Title</Label>
            <Input id="cond-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cond-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="cond-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cond-party">Responsible party</Label>
              <Select value={party} onValueChange={setParty}>
                <SelectTrigger id="cond-party">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSIBLE_PARTIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cond-due">Due date</Label>
            <Input
              id="cond-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="cond-blocking"
              checked={blocking}
              onCheckedChange={(v) => setBlocking(v === true)}
            />
            <Label htmlFor="cond-blocking">Blocking condition</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || actions.isPending}
            onClick={async () => {
              const ok = await actions.run("addCondition", {
                closingId,
                title: title.trim(),
                category,
                responsibleParty: party,
                isBlocking: blocking,
                dueDate: dueDate || null,
              });
              if (ok) {
                setOpen(false);
                setTitle("");
              }
            }}
          >
            Add condition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HandoverTaskDialog({
  closingId,
  actions,
}: {
  closingId: string;
  actions: ClosingActions;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("keys");
  const [dueDate, setDueDate] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add handover task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a handover task</DialogTitle>
          <DialogDescription>
            Practical hand-over work: keys, meters, utilities, tenancy files and certificates.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="task-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HANDOVER_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || actions.isPending}
            onClick={async () => {
              const ok = await actions.run("addTask", {
                closingId,
                title: title.trim(),
                category,
                dueDate: dueDate || null,
              });
              if (ok) {
                setOpen(false);
                setTitle("");
              }
            }}
          >
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteClosingDialog({
  record,
  actions,
}: {
  record: ClosingCase;
  actions: ClosingActions;
}) {
  const [open, setOpen] = useState(false);
  const [completionDate, setCompletionDate] = useState("");
  const [deedDate, setDeedDate] = useState(record.deed_date ?? "");
  const [possessionDate, setPossessionDate] = useState(record.possession_date ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Complete closing</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete the closing</DialogTitle>
          <DialogDescription>
            Completion records that the deal has closed. It creates no journal, payment or cash-flow
            entry — those stay with the commitment and bookkeeping.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cl-complete">Completion date</Label>
            <Input
              id="cl-complete"
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl-deed">Deed date</Label>
            <Input
              id="cl-deed"
              type="date"
              value={deedDate}
              onChange={(e) => setDeedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl-possession">Possession date</Label>
            <Input
              id="cl-possession"
              type="date"
              value={possessionDate}
              onChange={(e) => setPossessionDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={actions.isPending}
            onClick={async () => {
              const ok = await actions.run("complete", {
                closingId: record.closing_id,
                actualCompletionDate: completionDate || null,
                deedDate: deedDate || null,
                possessionDate: possessionDate || null,
              });
              if (ok) setOpen(false);
            }}
          >
            Complete closing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelClosingDialog({
  record,
  actions,
}: {
  record: ClosingCase;
  actions: ClosingActions;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Cancel closing</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this closing</DialogTitle>
          <DialogDescription>
            The record stays, with the reason attached. Nothing downstream is deleted.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Cancellation reason"
          placeholder="Why is the closing being cancelled?"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Keep closing
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 3 || actions.isPending}
            onClick={async () => {
              const ok = await actions.run("cancel", {
                closingId: record.closing_id,
                reason: reason.trim(),
              });
              if (ok) setOpen(false);
            }}
          >
            Cancel closing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePropertyDialog({
  record,
  actions,
}: {
  record: ClosingCase;
  actions: ClosingActions;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(record.opportunity_title ?? "");
  const [code, setCode] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create managed property</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create the managed property</DialogTitle>
          <DialogDescription>
            This is the hand-over point: the acquired asset becomes a property in the register. It
            can only happen once per closing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prop-name">Name</Label>
            <Input id="prop-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prop-code">Code</Label>
              <Input id="prop-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-type">Property type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger id="prop-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-address">Address</Label>
            <Input
              id="prop-address"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prop-postal">Postal code</Label>
              <Input
                id="prop-postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-city">City</Label>
              <Input id="prop-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || actions.isPending}
            onClick={async () => {
              const ok = await actions.run("createProperty", {
                closingId: record.closing_id,
                name: name.trim(),
                code: code.trim() || null,
                propertyType,
                status: "owned",
                addressLine1: addressLine1.trim() || null,
                postalCode: postalCode.trim() || null,
                city: city.trim() || null,
              });
              if (ok) setOpen(false);
            }}
          >
            Create property
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
