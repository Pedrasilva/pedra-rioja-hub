/**
 * Phase 8C — callback status and retry.
 *
 * The decision and the domain callback are separate facts. A failed callback
 * never erases the decision; it is shown plainly and can be retried by anyone
 * with management authority. Retry is idempotent at the database level.
 */

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { ApprovalCapabilities } from "@/modules/approvals/capabilities";
import type { ApprovalActions } from "@/modules/approvals/server";
import type { ApprovalRequestDetailRow } from "@/modules/approvals/types";
import { ApprovalStatusBadge } from "./status-badge";

export function CallbackPanel({
  request,
  capabilities,
  actions,
}: {
  request: ApprovalRequestDetailRow;
  capabilities: ApprovalCapabilities;
  actions: ApprovalActions | undefined;
}) {
  const status = request.callback_status ?? "not_required";
  const failed = status === "failed";
  const canRetry = failed && capabilities.canRetryCallback && Boolean(actions);

  return (
    <div className="space-y-2" aria-label="Callback status">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Domain callback</span>
        <ApprovalStatusBadge status={status} />
        <span className="text-muted-foreground">
          {request.callback_attempts ?? 0} attempt
          {(request.callback_attempts ?? 0) === 1 ? "" : "s"}
        </span>
        {request.callback_at ? (
          <span className="text-muted-foreground">{formatDate(request.callback_at)}</span>
        ) : null}
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          The domain callback failed: {request.callback_error ?? "unknown error"}. The approval
          decision remains recorded.
        </p>
      ) : null}

      {canRetry ? (
        <Button
          size="sm"
          variant="outline"
          disabled={actions!.isPending}
          onClick={() => actions!.run("retryCallback", { requestId: request.request_id })}
        >
          Retry callback
        </Button>
      ) : null}
    </div>
  );
}
