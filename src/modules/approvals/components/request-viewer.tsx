/**
 * Phase 8C — request viewer.
 *
 * Shows one approval request exactly as the engine holds it: the immutable
 * snapshot taken at submission, the resolved approvers, the step progress,
 * the append-only decision trail, the event timeline and the callback state.
 * A link back to the owning domain record keeps ownership visible.
 */

import { Link } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import { defaultApprovalDomains, domainLinkFor } from "@/modules/approvals/adapters";
import type { ApprovalCapabilities } from "@/modules/approvals/capabilities";
import { labelOf } from "@/modules/approvals/schemas";
import type { ApprovalActions } from "@/modules/approvals/server";
import type {
  ApprovalCandidateRow,
  ApprovalEventRow,
  ApprovalHistoryRow,
  ApprovalMemberRow,
  ApprovalRequestDetailRow,
} from "@/modules/approvals/types";
import { CallbackPanel } from "./callback-panel";
import { DecisionControls } from "./decision-controls";
import { EventTimeline } from "./event-timeline";
import { ApprovalStatusBadge } from "./status-badge";

function SnapshotTable({ snapshot }: { snapshot: Record<string, unknown> | null }) {
  const entries = Object.entries(snapshot ?? {}).filter(
    ([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v),
  );
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No snapshot was captured.</p>;
  }
  return (
    <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">{labelOf(k)}</dt>
          <dd className="text-right font-medium">{v === null ? "—" : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RequestViewer({
  request,
  decisions,
  events,
  candidates,
  members,
  capabilities,
  userId,
  actions,
  isLoading,
}: {
  request: ApprovalRequestDetailRow | null | undefined;
  decisions: ApprovalHistoryRow[];
  events: ApprovalEventRow[];
  candidates: ApprovalCandidateRow[];
  members: ApprovalMemberRow[];
  capabilities: ApprovalCapabilities;
  userId: string | undefined;
  actions: ApprovalActions | undefined;
  isLoading?: boolean;
}) {
  if (!capabilities.canView) {
    return (
      <p role="note" className="text-sm text-destructive">
        You do not have permission to view approval requests.
      </p>
    );
  }
  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading the approval request…
      </p>
    );
  }
  if (!request) {
    return <p className="text-sm text-muted-foreground">This approval request was not found.</p>;
  }

  const link = domainLinkFor(defaultApprovalDomains, request.target_type, request.target_id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                {request.target_label ?? labelOf(request.target_type)}
              </CardTitle>
              <CardDescription>
                {request.workflow_name ?? "No workflow"} · requested {formatDate(request.requested_at)}
              </CardDescription>
            </div>
            <ApprovalStatusBadge status={request.decision} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {formatMoneyPrecise(
                  request.requested_amount,
                  (request.snapshot?.currency as string) ?? "EUR",
                  "—",
                )}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Step</span>
              <span className="font-medium">
                {request.current_step_no
                  ? `${request.current_step_no} · ${request.current_step_name ?? "—"}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Workflow version</span>
              <span className="font-medium">{request.workflow_version_no ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium">{formatDate(request.expires_at) || "—"}</span>
            </div>
          </div>

          {link ? (
            <Link to={link.to} params={link.params} className="text-sm underline">
              Open the {labelOf(request.target_type_label ?? request.target_type).toLowerCase()} record
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              This target type has no linked screen in this application.
            </p>
          )}

          <Separator />
          <div>
            <p className="mb-2 text-sm font-medium">Snapshot at submission</p>
            <SnapshotTable snapshot={request.snapshot} />
          </div>

          <Separator />
          <CallbackPanel request={request} capabilities={capabilities} actions={actions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Decision</CardTitle>
          <CardDescription>
            Decisions are append-only; a correction is a new decision, never an edit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DecisionControls
            request={request}
            capabilities={capabilities}
            userId={userId}
            members={members}
            actions={actions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Approvers</CardTitle>
          <CardDescription>Resolved when the request was submitted.</CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approver has been resolved.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {candidates.map((c) => {
                const m = members.find((x) => x.user_id === c.user_id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{m?.full_name ?? m?.email ?? c.user_id}</span>
                    <span className="text-muted-foreground">{labelOf(c.source)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Decision history</CardTitle>
          <CardDescription>Includes decisions recorded before the generic engine.</CardDescription>
        </CardHeader>
        <CardContent>
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decision has been recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {decisions.map((d) => (
                <li
                  key={d.history_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <ApprovalStatusBadge status={d.decision} />
                    {d.step_no ? (
                      <span className="text-muted-foreground">Step {d.step_no}</span>
                    ) : null}
                    {d.source === "legacy" ? (
                      <span className="text-muted-foreground">(historical)</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">{formatDate(d.created_at)}</span>
                  {d.reason ? (
                    <span className="w-full text-muted-foreground">{d.reason}</span>
                  ) : null}
                  {d.override_reason ? (
                    <span className="w-full text-muted-foreground">
                      Override: {d.override_reason}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent>
          <EventTimeline events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
