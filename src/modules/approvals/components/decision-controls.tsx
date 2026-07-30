/**
 * Phase 8C — decision controls.
 *
 * Fail-closed by design:
 *  - an action only renders when the capability map allows it;
 *  - reasons and override reasons are required exactly where the engine
 *    requires them, and the button stays disabled until they are supplied;
 *  - self-approval is blocked unless an override reason is typed by someone
 *    holding override authority;
 *  - nothing is rendered as decided until the server action resolves and the
 *    canonical views are re-fetched.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ApprovalCapabilities } from "@/modules/approvals/capabilities";
import { isSelfRequest } from "@/modules/approvals/capabilities";
import { decisionInputError, labelOf } from "@/modules/approvals/schemas";
import type { ApprovalActions } from "@/modules/approvals/server";
import type { ApprovalMemberRow, ApprovalRequestDetailRow } from "@/modules/approvals/types";

type ActionSpec = {
  action: string;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
  allowed: (c: ApprovalCapabilities) => boolean;
};

const ACTIONS: ActionSpec[] = [
  { action: "approve", label: "Approve", allowed: (c) => c.canDecide },
  { action: "reject", label: "Reject", variant: "destructive", allowed: (c) => c.canDecide },
  { action: "return", label: "Return for changes", variant: "outline", allowed: (c) => c.canDecide },
  { action: "abstain", label: "Abstain", variant: "outline", allowed: (c) => c.canDecide },
  { action: "delegate", label: "Delegate", variant: "outline", allowed: (c) => c.canDelegate },
  { action: "withdraw", label: "Withdraw", variant: "outline", allowed: () => true },
  { action: "cancel", label: "Cancel", variant: "outline", allowed: (c) => c.canConfigure },
  {
    action: "override_approve",
    label: "Override approve",
    variant: "secondary",
    allowed: (c) => c.canOverride,
  },
  {
    action: "override_reject",
    label: "Override reject",
    variant: "destructive",
    allowed: (c) => c.canOverride,
  },
];

export function DecisionControls({
  request,
  capabilities,
  userId,
  members,
  actions,
}: {
  request: ApprovalRequestDetailRow;
  capabilities: ApprovalCapabilities;
  userId: string | undefined;
  members: ApprovalMemberRow[];
  actions: ApprovalActions | undefined;
}) {
  const [reason, setReason] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [delegateTo, setDelegateTo] = useState<string>("");

  // Fail closed: without an action context nothing privileged is offered.
  if (!actions || typeof actions.run !== "function") {
    return (
      <p role="note" className="text-sm text-destructive">
        Decision actions are unavailable because no approval action context was provided.
      </p>
    );
  }
  if (request.decision !== "pending") {
    return (
      <p className="text-sm text-muted-foreground">
        This request is {labelOf(request.decision).toLowerCase()} and can no longer be decided.
      </p>
    );
  }
  if (!capabilities.canView) {
    return (
      <p role="note" className="text-sm text-destructive">
        You do not have permission to act on approval requests.
      </p>
    );
  }

  const selfRequest = isSelfRequest(request.requested_by, userId);
  const selfBlocked = selfRequest && overrideReason.trim().length < 3;
  const delegates = members.filter((m) => ["owner", "manager", "approver"].includes(m.role));

  const disabledFor = (action: string) => {
    if (actions.isPending) return true;
    if (
      decisionInputError(action, {
        reason,
        overrideReason,
        delegateTo: delegateTo || null,
      })
    ) {
      return true;
    }
    const isApproval = action === "approve" || action === "override_approve";
    if (isApproval && selfBlocked) return true;
    return false;
  };

  const submit = (action: string) =>
    actions.run("recordDecision", {
      requestId: request.request_id,
      decision: action,
      reason: reason.trim() ? reason.trim() : null,
      overrideReason: overrideReason.trim() ? overrideReason.trim() : null,
      delegateTo: action === "delegate" ? delegateTo || null : null,
    });

  return (
    <div className="space-y-4">
      {selfRequest ? (
        <p role="note" className="text-sm text-destructive">
          You requested this approval. Self-approval requires a written override reason.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="approval-reason">Comment or reason</Label>
        <Textarea
          id="approval-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Required to reject or return"
        />
      </div>

      {capabilities.canOverride || selfRequest ? (
        <div className="space-y-2">
          <Label htmlFor="approval-override">Override reason</Label>
          <Input
            id="approval-override"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Why you are approving against the standing rule"
          />
        </div>
      ) : null}

      {capabilities.canDelegate ? (
        <div className="space-y-2">
          <Label htmlFor="approval-delegate">Delegate to</Label>
          <Select value={delegateTo} onValueChange={setDelegateTo}>
            <SelectTrigger id="approval-delegate">
              <SelectValue placeholder="Select an approver" />
            </SelectTrigger>
            <SelectContent>
              {delegates.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.full_name ?? m.email ?? m.user_id} · {labelOf(m.role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {ACTIONS.filter((a) => a.allowed(capabilities)).map((a) => (
          <Button
            key={a.action}
            size="sm"
            variant={a.variant ?? "default"}
            disabled={disabledFor(a.action)}
            onClick={() => submit(a.action)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Rejecting, returning or overriding needs a written reason of at least three characters.
      </p>
    </div>
  );
}
