/**
 * Opportunity workspace.
 *
 * The whole deal in one place: stage, activity, tasks, valuations, offers and
 * the commitments a person has explicitly linked. Nothing here writes an
 * accounting value. A commitment appears only when someone presses the button
 * for one, and the money then belongs to the commitment, not to the deal.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney, formatMoneyPrecise } from "@/lib/format";
import type { AcquisitionCapabilities } from "@/modules/acquisitions/capabilities";
import {
  useAcquisitionActivities,
  useAcquisitionCommitmentLinks,
  useAcquisitionOffers,
  useAcquisitionTasks,
  useAcquisitionValuations,
  useLinkableCommitments,
  useStageHistory,
  type AcquisitionOpportunity,
} from "@/modules/acquisitions/queries";
import {
  ACQUISITION_STAGES,
  ACTIVITY_TYPES,
  LINK_KINDS,
  OFFER_DECISIONS,
  OPPORTUNITY_TYPES,
  TASK_PRIORITIES,
  VALUATION_METHODS,
  labelOf,
  permittedMoves,
} from "@/modules/acquisitions/schemas";
import type { AcquisitionActions } from "@/modules/acquisitions/server";
import { OfferStatusBadge, StageBadge } from "./status-badge";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export function OpportunityDetail({
  opportunity,
  capabilities,
  actions,
}: {
  opportunity: AcquisitionOpportunity;
  capabilities: AcquisitionCapabilities;
  actions: AcquisitionActions;
}) {
  const id = opportunity.opportunity_id;
  const { data: activities = [] } = useAcquisitionActivities(id);
  const { data: tasks = [] } = useAcquisitionTasks(id);
  const { data: valuations = [] } = useAcquisitionValuations(id);
  const { data: offers = [] } = useAcquisitionOffers(id);
  const { data: links = [] } = useAcquisitionCommitmentLinks(id);
  const { data: history = [] } = useStageHistory(id);
  const { data: commitments = [] } = useLinkableCommitments(opportunity.company_id);

  const moves = permittedMoves(opportunity.stage, capabilities.canManage);
  const closed = ["offer_accepted", "offer_rejected", "withdrawn"].includes(opportunity.stage);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base">{opportunity.reference}</CardTitle>
            <StageBadge stage={opportunity.stage} />
            {opportunity.is_archived ? <Badge variant="outline">Archived</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Type" value={labelOf(OPPORTUNITY_TYPES, opportunity.opportunity_type)} />
            <Field label="Property link" value={labelOf(LINK_KINDS, opportunity.link_kind)} />
            <Field label="Property" value={opportunity.property_name} />
            <Field label="Location" value={opportunity.location} />
            <Field label="Source" value={opportunity.source} />
            <Field label="Contact" value={opportunity.contact_name} />
            <Field label="Email" value={opportunity.contact_email} />
            <Field label="Phone" value={opportunity.contact_phone} />
            <Field label="Probability" value={`${opportunity.probability}%`} />
            <Field label="Asking price" value={formatMoney(opportunity.asking_price)} />
            <Field label="Indicative offer" value={formatMoney(opportunity.indicative_offer)} />
            <Field label="Weighted estimate" value={formatMoney(opportunity.weighted_estimate)} />
            <Field label="Target acquisition" value={formatDate(opportunity.target_acquisition_date)} />
            <Field label="Expected closing" value={formatDate(opportunity.expected_closing_date)} />
            <Field label="Latest offer" value={formatMoney(opportunity.latest_offer_amount)} />
            <Field label="Latest valuation" value={formatMoney(opportunity.latest_valuation)} />
          </div>

          <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Every figure on this page is an indicative deal estimate. Nothing here posts a journal,
            creates a payment or reaches the portfolio; a commitment is only created when someone
            explicitly asks for one below.
          </p>

          {opportunity.notes ? <Field label="Notes" value={opportunity.notes} /> : null}

          <div className="flex flex-wrap items-center gap-2">
            {moves.map((stage) => (
              <StageMoveDialog
                key={stage}
                opportunityId={id}
                stage={stage}
                disabled={!capabilities.canRecord || opportunity.is_archived}
                actions={actions}
              />
            ))}
            {opportunity.is_archived ? (
              <Button
                size="sm"
                variant="outline"
                disabled={!capabilities.canManage || actions.isPending}
                onClick={() => actions.run("restore", { opportunityId: id })}
              >
                Restore
              </Button>
            ) : (
              <ArchiveDialog
                opportunityId={id}
                disabled={!capabilities.canArchive}
                actions={actions}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="activity">
        <TabsList className="flex-wrap">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="valuations">Valuations</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="commitments">Commitments</TabsTrigger>
          <TabsTrigger value="history">Stage history</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------ activity */}
        <TabsContent value="activity" className="pt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Activity timeline</CardTitle>
              <ActivityDialog
                opportunityId={id}
                disabled={!capabilities.canManageActivities || opportunity.is_archived}
                actions={actions}
              />
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              ) : (
                <ol className="space-y-3">
                  {activities.map((a) => (
                    <li key={a.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{labelOf(ACTIVITY_TYPES, a.activity_type)}</Badge>
                        <p className="text-sm font-medium">{a.summary}</p>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDate(a.occurred_at)}
                        </span>
                      </div>
                      {a.body ? (
                        <p className="pt-2 text-sm text-muted-foreground">{a.body}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------------------------------------- tasks */}
        <TabsContent value="tasks" className="pt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Tasks and reminders</CardTitle>
              <TaskDialog
                opportunityId={id}
                disabled={!capabilities.canRecord || opportunity.is_archived}
                actions={actions}
              />
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No tasks yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{formatDate(t.due_date)}</TableCell>
                        <TableCell>{labelOf(TASK_PRIORITIES, t.priority)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.status === "open" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!capabilities.canRecord || actions.isPending}
                              onClick={() =>
                                actions.run("taskStatus", { taskId: t.id, status: "completed" })
                              }
                            >
                              Complete
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- valuations */}
        <TabsContent value="valuations" className="pt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Valuations (informational)</CardTitle>
              <ValuationDialog
                opportunityId={id}
                disabled={!capabilities.canManageValuations || opportunity.is_archived}
                actions={actions}
              />
            </CardHeader>
            <CardContent>
              <p className="pb-3 text-xs text-muted-foreground">
                Deal-stage estimates only. They never feed the portfolio, an asset value or an
                investment metric.
              </p>
              {valuations.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No valuations recorded.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead className="text-right">Estimated value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuations.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>{formatDate(v.valued_on)}</TableCell>
                        <TableCell>{labelOf(VALUATION_METHODS, v.method)}</TableCell>
                        <TableCell className="text-muted-foreground">{v.comments ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {formatMoneyPrecise(v.estimated_value, v.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------- offers */}
        <TabsContent value="offers" className="pt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Offer history</CardTitle>
              <OfferDialog
                opportunityId={id}
                disabled={!capabilities.canManageOffers || opportunity.is_archived}
                actions={actions}
              />
            </CardHeader>
            <CardContent>
              {offers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No offers recorded.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.offer_no}</TableCell>
                        <TableCell>{formatDate(o.submitted_on)}</TableCell>
                        <TableCell>{formatDate(o.expires_on)}</TableCell>
                        <TableCell>
                          <OfferStatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoneyPrecise(o.amount, o.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {o.status === "submitted" ? (
                            <OfferDecisionDialog
                              offerId={o.id}
                              canAccept={capabilities.canAcceptOffer}
                              disabled={!capabilities.canManageOffers}
                              actions={actions}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(o.decided_on)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------------------------------- commitments */}
        <TabsContent value="commitments" className="pt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Linked commitments</CardTitle>
              <div className="flex gap-2">
                <LinkCommitmentDialog
                  opportunityId={id}
                  commitments={commitments}
                  disabled={!capabilities.canLinkCommitment || opportunity.is_archived}
                  actions={actions}
                />
                <CreateCommitmentDialog
                  opportunity={opportunity}
                  disabled={!capabilities.canCreateCommitment || opportunity.is_archived}
                  actions={actions}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="pb-3 text-xs text-muted-foreground">
                Commitments own the money. A deal never creates one implicitly — not on an accepted
                offer, not on a stage change. Someone has to ask for it here.
              </p>
              {links.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {closed && opportunity.stage === "offer_accepted"
                    ? "Offer accepted. Create a commitment when you are ready to authorise spend."
                    : "No commitments linked to this opportunity."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commitment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Linked</TableHead>
                      <TableHead className="text-right">Authorised</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((l) => (
                      <TableRow key={l.link_id}>
                        <TableCell className="font-medium">
                          <Link
                            to="/commitments/$commitmentId"
                            params={{ commitmentId: l.commitment_id }}
                            className="hover:underline"
                          >
                            {l.commitment_code ?? l.commitment_title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{l.commitment_status}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(l.linked_at)}</TableCell>
                        <TableCell className="text-right">
                          {formatMoneyPrecise(l.authorised_amount, l.commitment_currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!capabilities.canLinkCommitment || actions.isPending}
                            onClick={() => actions.run("unlinkCommitment", { linkId: l.link_id })}
                          >
                            Unlink
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- history */}
        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stage history</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{formatDate(h.occurred_at)}</TableCell>
                        <TableCell>{labelOf(ACQUISITION_STAGES, h.from_stage)}</TableCell>
                        <TableCell>
                          {labelOf(ACQUISITION_STAGES, h.to_stage)}
                          {h.is_reopen ? (
                            <Badge variant="secondary" className="ml-2">
                              Reopened
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{h.reason ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ dialogs */

function StageMoveDialog({
  opportunityId,
  stage,
  disabled,
  actions,
}: {
  opportunityId: string;
  stage: string;
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const label = labelOf(ACQUISITION_STAGES, stage);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          Move to {label.toLowerCase()}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to {label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            The move is recorded in the stage history with whatever reason you give.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`reason-${stage}`}>Reason</Label>
          <Textarea
            id={`reason-${stage}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={actions.isPending}
            onClick={async () => {
              const res = await actions.run("moveStage", {
                opportunityId,
                stage,
                reason: reason || undefined,
              });
              if (res) {
                setReason("");
                setOpen(false);
              }
            }}
          >
            Confirm move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveDialog({
  opportunityId,
  disabled,
  actions,
}: {
  opportunityId: string;
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" disabled={disabled}>
          Archive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive opportunity</DialogTitle>
          <DialogDescription>
            Archiving hides the deal from the active pipeline. Nothing is deleted and it can be
            restored.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="archive-reason">Reason</Label>
          <Textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={actions.isPending}
            onClick={async () => {
              const res = await actions.run("archive", {
                opportunityId,
                reason: reason || undefined,
              });
              if (res) setOpen(false);
            }}
          >
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivityDialog({
  opportunityId,
  disabled,
  actions,
}: {
  opportunityId: string;
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("note");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          Record activity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record activity</DialogTitle>
          <DialogDescription>
            Meetings, calls, broker discussions and internal reviews all land on the same timeline.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="act-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="act-type" aria-label="Activity type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="act-summary">Summary</Label>
            <Input
              id="act-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Site visit with the broker"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="act-body">Detail</Label>
            <Textarea
              id="act-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
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
              const res = await actions.run("activity", {
                opportunityId,
                activityType: type,
                summary,
                body: body || undefined,
              });
              if (res) {
                setSummary("");
                setBody("");
                setOpen(false);
              }
            }}
          >
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
  opportunityId,
  disabled,
  actions,
}: {
  opportunityId: string;
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("normal");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          Add task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>
            Tasks keep a deal moving. They carry no financial meaning.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Input
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Request the cadastral certificate"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="task-priority" aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={actions.isPending}
            onClick={async () => {
              const res = await actions.run("createTask", {
                opportunityId,
                description,
                dueDate: dueDate || undefined,
                priority,
              });
              if (res) {
                setDescription("");
                setDueDate("");
                setOpen(false);
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

function ValuationDialog({
  opportunityId,
  disabled,
  actions,
}: {
  opportunityId: string;
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [method, setMethod] = useState("desktop");
  const [valuedOn, setValuedOn] = useState("");
  const [comments, setComments] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          Record valuation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record valuation</DialogTitle>
          <DialogDescription>
            Informational only. This figure never becomes an asset value or an investment metric.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="val-amount">Estimated value</Label>
            <Input
              id="val-amount"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="val-method">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="val-method" aria-label="Valuation method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALUATION_METHODS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="val-date">Valued on</Label>
            <Input
              id="val-date"
              type="date"
              value={valuedOn}
              onChange={(e) => setValuedOn(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="val-comments">Comments</Label>
            <Textarea
              id="val-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
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
              const res = await actions.run("valuation", {
                opportunityId,
                estimatedValue: Number(value),
                method,
                valuedOn: valuedOn || undefined,
                comments: comments || undefined,
              });
              if (res) {
                setValue("");
                setComments("");
                setOpen(false);
              }
            }}
          >
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfferDialog({
  opportunityId,
  disabled,
  actions,
}: {
  opportunityId: string;
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submittedOn, setSubmittedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          Record offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record offer</DialogTitle>
          <DialogDescription>
            Each offer is kept in full history. Recording one commits no money.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="offer-amount">Amount</Label>
            <Input
              id="offer-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="offer-submitted">Submitted on</Label>
            <Input
              id="offer-submitted"
              type="date"
              value={submittedOn}
              onChange={(e) => setSubmittedOn(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="offer-expires">Expires on</Label>
            <Input
              id="offer-expires"
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="offer-notes">Negotiation notes</Label>
            <Textarea
              id="offer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
              const res = await actions.run("offer", {
                opportunityId,
                amount: Number(amount),
                submittedOn: submittedOn || undefined,
                expiresOn: expiresOn || undefined,
                negotiationNotes: notes || undefined,
              });
              if (res) {
                setAmount("");
                setNotes("");
                setOpen(false);
              }
            }}
          >
            Record offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfferDecisionDialog({
  offerId,
  canAccept,
  disabled,
  actions,
}: {
  offerId: string;
  canAccept: boolean;
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState("rejected");
  const [notes, setNotes] = useState("");
  const options = OFFER_DECISIONS.filter((d) => canAccept || d.value !== "accepted");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          Decide
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record offer decision</DialogTitle>
          <DialogDescription>
            Accepting an offer moves the deal on. It does not create a commitment, a payment or an
            accounting entry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="offer-decision">Decision</Label>
            <Select value={decision} onValueChange={setDecision}>
              <SelectTrigger id="offer-decision" aria-label="Offer decision">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="offer-decision-notes">Notes</Label>
            <Textarea
              id="offer-decision-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
              const res = await actions.run("offerDecision", {
                offerId,
                decision,
                notes: notes || undefined,
              });
              if (res) {
                setNotes("");
                setOpen(false);
              }
            }}
          >
            Record decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkCommitmentDialog({
  opportunityId,
  commitments,
  disabled,
  actions,
}: {
  opportunityId: string;
  commitments: { id: string; code: string | null; title: string }[];
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [commitmentId, setCommitmentId] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          Link commitment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link an existing commitment</DialogTitle>
          <DialogDescription>
            Linking records the relationship. The commitment keeps its own approval, amount and
            lifecycle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="link-commitment">Commitment</Label>
            <Select value={commitmentId} onValueChange={setCommitmentId}>
              <SelectTrigger id="link-commitment" aria-label="Commitment">
                <SelectValue placeholder="Choose a commitment" />
              </SelectTrigger>
              <SelectContent>
                {commitments.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code ? `${c.code} — ${c.title}` : c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link-reason">Reason</Label>
            <Textarea
              id="link-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={actions.isPending || !commitmentId}
            onClick={async () => {
              const res = await actions.run("linkCommitment", {
                opportunityId,
                commitmentId,
                reason: reason || undefined,
              });
              if (res) {
                setCommitmentId("");
                setReason("");
                setOpen(false);
              }
            }}
          >
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCommitmentDialog({
  opportunity,
  disabled,
  actions,
}: {
  opportunity: AcquisitionOpportunity;
  disabled?: boolean;
  actions: AcquisitionActions;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`Acquisition — ${opportunity.title}`);
  const [amount, setAmount] = useState(
    opportunity.latest_offer_amount?.toString() ?? opportunity.indicative_offer?.toString() ?? "",
  );
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          Create commitment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a commitment from this deal</DialogTitle>
          <DialogDescription>
            This is the explicit hand-over into the financial lifecycle. A draft commitment is
            created through the commitment contract and goes through its own approval — the
            opportunity keeps no financial ownership.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cc-title">Commitment title</Label>
            <Input id="cc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cc-amount">Authorised amount</Label>
            <Input
              id="cc-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cc-notes">Notes</Label>
            <Textarea
              id="cc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
              const res = await actions.run("createCommitment", {
                opportunityId: opportunity.opportunity_id,
                title,
                authorisedAmount: amount === "" ? 0 : Number(amount),
                notes: notes || undefined,
              });
              if (res) {
                setNotes("");
                setOpen(false);
              }
            }}
          >
            Create commitment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
