/**
 * Phase 8C — approval inbox.
 *
 * A generic queue: it lists requests of any target type, says why each one is
 * in your inbox (assigned, delegated, escalated), and never invents a status.
 * Selecting a row opens the request viewer; the domain link is offered only
 * when an adapter exists for that target type.
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import type { ApprovalCapabilities } from "@/modules/approvals/capabilities";
import { buildInbox, matchesSearch } from "@/modules/approvals/queries";
import { labelOf } from "@/modules/approvals/schemas";
import type { ApprovalActions } from "@/modules/approvals/server";
import type {
  ApprovalCandidateRow,
  ApprovalInboxItem,
  ApprovalInboxRow,
  ApprovalRequestDetailRow,
} from "@/modules/approvals/types";
import { ApprovalStatusBadge } from "./status-badge";

type Scope = "mine" | "pending" | "all";

export function ApprovalInbox({
  requests,
  assignments,
  candidates,
  capabilities,
  userId,
  actions,
  selectedId,
  onSelect,
  isLoading,
}: {
  requests: ApprovalRequestDetailRow[];
  assignments: ApprovalInboxRow[];
  candidates: ApprovalCandidateRow[];
  capabilities: ApprovalCapabilities;
  userId: string | undefined;
  actions: ApprovalActions | undefined;
  selectedId: string | null;
  onSelect: (requestId: string) => void;
  isLoading?: boolean;
}) {
  const [scope, setScope] = useState<Scope>("mine");
  const [targetType, setTargetType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const items = useMemo(
    () => buildInbox(requests, assignments, candidates, userId),
    [requests, assignments, candidates, userId],
  );

  const targetTypes = useMemo(
    () => [...new Set(items.map((i) => i.target_type))].sort(),
    [items],
  );

  const visible = items.filter((i: ApprovalInboxItem) => {
    if (scope === "mine" && !(i.assignedToMe || i.delegatedToMe || i.escalatedToMe)) return false;
    if (scope === "mine" && i.decision !== "pending") return false;
    if (scope === "pending" && i.decision !== "pending") return false;
    if (targetType !== "all" && i.target_type !== targetType) return false;
    return matchesSearch(i, search);
  });

  if (!capabilities.canView) {
    return (
      <p role="note" className="text-sm text-destructive">
        You do not have permission to view approval requests.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Approval inbox</CardTitle>
            <CardDescription>
              Every request awaiting a decision, whatever it is about.
            </CardDescription>
          </div>
          {capabilities.canEscalate && actions ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actions.isPending}
              onClick={() => actions.run("runMaintenance", {})}
            >
              Run reminders and expiry
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
            <SelectTrigger className="w-48" aria-label="Scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">Awaiting me</SelectItem>
              <SelectItem value="pending">All pending</SelectItem>
              <SelectItem value="all">Everything</SelectItem>
            </SelectContent>
          </Select>
          <Select value={targetType} onValueChange={setTargetType}>
            <SelectTrigger className="w-56" aria-label="Target type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All target types</SelectItem>
              {targetTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {labelOf(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="max-w-xs"
            aria-label="Search approvals"
            placeholder="Search by record, workflow or reason"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading approval requests…
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is waiting for a decision here.
          </p>
        ) : (
          <ul aria-label="Approval requests" className="space-y-2">
            {visible.map((i) => (
              <li key={i.request_id}>
                <button
                  type="button"
                  onClick={() => onSelect(i.request_id)}
                  aria-current={selectedId === i.request_id ? "true" : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selectedId === i.request_id ? "border-primary" : "border-border"
                  }`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {i.target_label ?? labelOf(i.target_type)}
                    </span>
                    <ApprovalStatusBadge status={i.decision} />
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                    <span>{labelOf(i.target_type)}</span>
                    <span>
                      {formatMoneyPrecise(
                        i.requested_amount,
                        (i.snapshot?.currency as string) ?? "EUR",
                        "—",
                      )}
                    </span>
                    <span>{formatDate(i.requested_at)}</span>
                    {i.current_step_name ? <span>Step {i.current_step_name}</span> : null}
                    {i.assignedToMe ? <span>Assigned to you</span> : null}
                    {i.delegatedToMe ? <span>Delegated to you</span> : null}
                    {i.escalatedToMe ? <span>Escalated to you</span> : null}
                    {i.overdue ? <span className="text-destructive">Overdue</span> : null}
                    {i.callback_status === "failed" ? (
                      <span className="text-destructive">Callback failed</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
