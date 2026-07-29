/**
 * Approval panel.
 *
 * Fail-closed by design: the request/approve/reject actions are only offered
 * to roles the database will actually accept, self-approval is blocked unless
 * the approver types an explicit override reason, and every decision made so
 * far is listed so the trail is visible on the record itself.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import { isSelfApproval } from "@/modules/commitments/capabilities";
import type { ApprovalRequestRow, CommitmentRow } from "@/modules/commitments/queries";
import { labelOf } from "@/modules/commitments/schemas";
import type { CommitmentActions } from "@/modules/commitments/server";
import { StatusBadge } from "./status-badge";

export function ApprovalPanel({
  commitment,
  requests,
  capabilities,
  userId,
  actions,
}: {
  commitment: CommitmentRow;
  requests: ApprovalRequestRow[];
  capabilities: CommitmentCapabilities;
  userId: string | undefined;
  actions: CommitmentActions;
}) {
  const [requestReason, setRequestReason] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [override, setOverride] = useState("");

  const pending = requests.find((r) => r.decision === "pending");
  const selfApproval = isSelfApproval(pending?.requested_by, userId);
  const canRequest =
    capabilities.canRecord && commitment.status === "draft" && !pending;
  const canDecide = capabilities.canApprove && Boolean(pending);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Approval</CardTitle>
        <CardDescription>
          A commitment only reaches cash flow once it is approved and active.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current state</span>
          <StatusBadge status={commitment.approval_status} />
          {commitment.approval_override_reason ? (
            <span className="text-muted-foreground">
              Override: {commitment.approval_override_reason}
            </span>
          ) : null}
        </div>

        {canRequest ? (
          <div className="space-y-2">
            <Label htmlFor="approval-request-reason">Reason for approval request</Label>
            <Textarea
              id="approval-request-reason"
              rows={2}
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="Optional context for the approver"
            />
            <Button
              size="sm"
              disabled={actions.isPending}
              onClick={() =>
                actions.run("requestApproval", {
                  commitmentId: commitment.id,
                  reason: requestReason || null,
                })
              }
            >
              Request approval
            </Button>
          </div>
        ) : null}

        {commitment.approval_status === "rejected" && capabilities.canRecord ? (
          <p className="text-sm text-muted-foreground">
            This request was rejected. Revise the draft and request approval again.
          </p>
        ) : null}

        {canDecide ? (
          <div className="space-y-3 rounded-md border border-border p-3">
            <p className="text-sm font-medium">Decision</p>
            {selfApproval ? (
              <div className="space-y-1">
                <p role="note" className="text-sm text-destructive">
                  You requested this approval. Self-approval requires a written override reason.
                </p>
                <Label htmlFor="approval-override">Override reason</Label>
                <Input
                  id="approval-override"
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                  placeholder="Why you are approving your own request"
                />
              </div>
            ) : null}
            <div>
              <Label htmlFor="approval-decision-reason">Comment / rejection reason</Label>
              <Textarea
                id="approval-decision-reason"
                rows={2}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={actions.isPending || (selfApproval && override.trim().length < 3)}
                onClick={() =>
                  actions.run("approve", {
                    commitmentId: commitment.id,
                    comment: decisionReason || null,
                    overrideReason: selfApproval ? override : null,
                  })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={actions.isPending || decisionReason.trim().length < 3}
                onClick={() =>
                  actions.run("reject", {
                    commitmentId: commitment.id,
                    reason: decisionReason,
                  })
                }
              >
                Reject
              </Button>
            </div>
            {decisionReason.trim().length < 3 ? (
              <p className="text-xs text-muted-foreground">
                Rejecting requires a reason of at least three characters.
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium">History</p>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approval has been requested yet.</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <StatusBadge status={r.decision} />
                    <span className="text-muted-foreground">{labelOf(r.target_type)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {formatMoneyPrecise(r.requested_amount, commitment.currency, "—")} ·{" "}
                    {formatDate(r.requested_at)}
                    {r.decided_at ? ` → ${formatDate(r.decided_at)}` : ""}
                  </span>
                  {r.decision_reason ? (
                    <span className="w-full text-muted-foreground">{r.decision_reason}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
