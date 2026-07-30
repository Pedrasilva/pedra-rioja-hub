/**
 * Phase 8C — approval event timeline.
 *
 * Append-only by construction: the component renders `approval_events` in the
 * order the engine wrote them and offers no affordance to edit or remove one.
 */

import { formatDate } from "@/lib/format";
import { labelOf } from "@/modules/approvals/schemas";
import type { ApprovalEventRow } from "@/modules/approvals/types";

const EMPHASIS: Record<string, string> = {
  callback_failed: "text-destructive",
  rejected: "text-destructive",
  expired: "text-destructive",
  cancelled: "text-destructive",
};

export function EventTimeline({
  events,
  isLoading,
}: {
  events: ApprovalEventRow[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading the event timeline…
      </p>
    );
  }
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events have been recorded yet.</p>;
  }
  return (
    <ol aria-label="Event timeline" className="space-y-2">
      {events.map((e) => (
        <li
          key={e.id}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-border px-3 py-2 text-sm"
        >
          <span className={EMPHASIS[e.event] ?? "font-medium"}>{labelOf(e.event)}</span>
          {e.step_no ? (
            <span className="text-muted-foreground">Step {e.step_no}</span>
          ) : null}
          <span className="text-muted-foreground">{formatDate(e.created_at)}</span>
          {e.comment ? <span className="w-full text-muted-foreground">{e.comment}</span> : null}
        </li>
      ))}
    </ol>
  );
}
