import { Badge } from "@/components/ui/badge";
import { labelOf } from "@/modules/acquisitions/schemas";
import {
  CLOSING_STATUSES,
  CONDITION_STATUSES,
  HANDOVER_STATUSES,
  HANDOVER_TASK_STATUSES,
} from "@/modules/closings/schemas";

const CLOSING_TONE: Record<string, string> = {
  preparing: "bg-muted text-muted-foreground",
  conditions_pending: "bg-accent/15 text-accent-foreground",
  ready_to_close: "bg-primary/10 text-primary",
  completed: "bg-primary text-primary-foreground",
  cancelled: "bg-destructive/10 text-destructive line-through",
};

export function ClosingStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={CLOSING_TONE[status] ?? ""}>
      {labelOf(CLOSING_STATUSES, status)}
    </Badge>
  );
}

const HANDOVER_TONE: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-accent/15 text-accent-foreground",
  complete: "bg-primary/10 text-primary",
};

export function HandoverBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={HANDOVER_TONE[status] ?? ""}>
      Handover: {labelOf(HANDOVER_STATUSES, status)}
    </Badge>
  );
}

const CONDITION_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-accent/15 text-accent-foreground",
  satisfied: "bg-primary/10 text-primary",
  waived: "bg-muted text-muted-foreground italic",
  failed: "bg-destructive/10 text-destructive",
};

export function ConditionBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={CONDITION_TONE[status] ?? ""}>
      {labelOf(CONDITION_STATUSES, status)}
    </Badge>
  );
}

const TASK_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-accent/15 text-accent-foreground",
  complete: "bg-primary/10 text-primary",
  not_applicable: "bg-muted text-muted-foreground italic",
};

export function TaskBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={TASK_TONE[status] ?? ""}>
      {labelOf(HANDOVER_TASK_STATUSES, status)}
    </Badge>
  );
}
