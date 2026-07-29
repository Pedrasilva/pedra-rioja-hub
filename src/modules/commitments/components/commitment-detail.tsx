/**
 * Commitment workspace — one authorised promise, end to end.
 *
 * Shows the lifecycle and its allowed transitions, the derived variance
 * figures from `v_commitment_summary`, the versioned schedule, drawdowns and
 * the evidence attached to the commitment. No figure here is stored on the
 * commitment record itself.
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import {
  useApprovalHistory,
  useCommitment,
  useCommitmentProjections,
  useCommitmentSummaries,
  useCommitmentSummary,
  useDrawdowns,
  usePostedInboundDocuments,
  useScheduleLines,
  useScheduleVersions,
} from "@/modules/commitments/queries";
import {
  isCommitmentArchivable,
  isCommitmentEditable,
  labelOf,
} from "@/modules/commitments/schemas";
import type { CommitmentActions } from "@/modules/commitments/server";
import { AttachmentsPanel } from "@/packages/bookkeeping-core/components/attachments-panel";
import { ApprovalPanel } from "./approval-panel";
import { CommitmentDialog } from "./commitment-dialog";
import { DrawdownPanel } from "./drawdown-panel";
import { SchedulePanel } from "./schedule-panel";
import { StatusBadge } from "./status-badge";

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${tone === "warn" ? "text-destructive" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function CommitmentDetail({
  companyId,
  commitmentId,
  capabilities,
  userId,
  actions,
}: {
  companyId: string | undefined;
  commitmentId: string;
  capabilities: CommitmentCapabilities;
  userId: string | undefined;
  actions: CommitmentActions;
}) {
  const { data: commitment, isLoading } = useCommitment(companyId, commitmentId);
  const { data: summary = null } = useCommitmentSummary(companyId, commitmentId);
  const { data: summaries = [] } = useCommitmentSummaries(companyId);
  const { data: versions = [] } = useScheduleVersions(companyId, commitmentId);
  const { data: lines = [] } = useScheduleLines(companyId, commitmentId);
  const { data: drawdowns = [] } = useDrawdowns(companyId, commitmentId);
  const { data: documents = [] } = usePostedInboundDocuments(companyId);

  const approvalTargets = useMemo(
    () => [commitmentId, ...versions.map((v) => v.id)],
    [commitmentId, versions],
  );
  const { data: requests = [] } = useApprovalHistory(companyId, approvalTargets);
  const lineIds = useMemo(() => lines.map((l) => l.id), [lines]);
  const { data: projections = [] } = useCommitmentProjections(companyId, lineIds);

  const [archiveReason, setArchiveReason] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading commitment…</p>;
  if (!commitment) return <p className="text-sm text-muted-foreground">Commitment not found.</p>;

  const currency = commitment.currency ?? "EUR";
  const canActivate =
    capabilities.canManage &&
    commitment.status === "approved" &&
    commitment.approval_status === "approved";
  const canComplete = capabilities.canManage && commitment.status === "active";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{commitment.title}</CardTitle>
              <CardDescription>
                {labelOf(commitment.commitment_type)}
                {commitment.code ? ` · ${commitment.code}` : ""}
                {summary?.counterparty_name ? ` · ${summary.counterparty_name}` : ""}
                {commitment.start_date ? ` · from ${formatDate(commitment.start_date)}` : ""}
              </CardDescription>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <StatusBadge status={commitment.status} />
                <StatusBadge status={commitment.approval_status} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CommitmentDialog
                companyId={companyId}
                actions={actions}
                commitment={commitment}
                disabled={!capabilities.canRecord || !isCommitmentEditable(commitment.status)}
              />
              {canActivate ? (
                <Button
                  size="sm"
                  disabled={actions.isPending}
                  onClick={() => actions.run("activate", { commitmentId })}
                >
                  Activate
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {commitment.description ? (
            <p className="text-sm text-muted-foreground">{commitment.description}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Figure
              label="Authorised"
              value={formatMoneyPrecise(commitment.authorised_amount, currency)}
            />
            <Figure
              label="Scheduled"
              value={formatMoneyPrecise(summary?.scheduled_amount ?? 0, currency)}
            />
            <Figure
              label="Committed (cash flow)"
              value={formatMoneyPrecise(summary?.approved_committed_amount ?? 0, currency)}
            />
            <Figure
              label="Invoiced"
              value={formatMoneyPrecise(summary?.invoiced_amount ?? 0, currency)}
            />
            <Figure label="Paid" value={formatMoneyPrecise(summary?.paid_amount ?? 0, currency)} />
            <Figure
              label="Retained"
              value={formatMoneyPrecise(summary?.retained_amount ?? 0, currency)}
            />
            <Figure
              label="Available to draw"
              value={formatMoneyPrecise(summary?.available_drawdown ?? 0, currency)}
            />
            <Figure
              label="Unapproved variance"
              value={formatMoneyPrecise(summary?.unapproved_variance ?? 0, currency)}
              tone={Number(summary?.unapproved_variance ?? 0) > 0 ? "warn" : undefined}
            />
          </div>

          {Number(summary?.overdue_scheduled_amount ?? 0) > 0 ? (
            <p role="status" className="text-sm text-destructive">
              {formatMoneyPrecise(summary?.overdue_scheduled_amount, currency)} of scheduled spend
              is past its expected date and still uninvoiced.
            </p>
          ) : null}

          {commitment.cancellation_reason ? (
            <p className="text-sm text-muted-foreground">
              Archived: {commitment.cancellation_reason}
            </p>
          ) : null}
          {commitment.completion_notes ? (
            <p className="text-sm text-muted-foreground">
              Completion: {commitment.completion_notes}
            </p>
          ) : null}

          {capabilities.canManage && !["completed", "cancelled"].includes(commitment.status) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {canComplete ? (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <Label htmlFor="completion-notes">Completion notes</Label>
                  <Input
                    id="completion-notes"
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actions.isPending}
                    onClick={() =>
                      actions.run("complete", {
                        commitmentId,
                        notes: completionNotes || null,
                      })
                    }
                  >
                    Mark completed
                  </Button>
                </div>
              ) : null}
              {isCommitmentArchivable(commitment.status) ? (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <Label htmlFor="archive-reason">Archive reason</Label>
                  <Input
                    id="archive-reason"
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actions.isPending || archiveReason.trim().length < 3}
                    onClick={() =>
                      actions.run("archive", { commitmentId, reason: archiveReason })
                    }
                  >
                    Archive commitment
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Archiving cancels future projections. Nothing is deleted.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ApprovalPanel
        commitment={commitment}
        requests={requests}
        capabilities={capabilities}
        userId={userId}
        actions={actions}
      />

      <SchedulePanel
        commitment={commitment}
        versions={versions}
        lines={lines}
        capabilities={capabilities}
        actions={actions}
        projections={projections}
      />

      <DrawdownPanel
        currency={currency}
        summary={summary}
        allSummaries={summaries}
        drawdowns={drawdowns}
        lines={lines}
        documents={documents}
        capabilities={capabilities}
        actions={actions}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Evidence</CardTitle>
          <CardDescription>
            Contracts and quotes prove the commitment; attaching them never changes an amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentsPanel sourceType="commitment" sourceId={commitmentId} />
        </CardContent>
      </Card>
    </div>
  );
}
