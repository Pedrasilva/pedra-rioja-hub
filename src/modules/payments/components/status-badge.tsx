import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_INSTRUCTION_STATUSES,
  PAYMENT_RUN_STATUSES,
  labelOf,
} from "@/modules/payments/schemas";

const TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  pending_approval: "bg-accent/15 text-accent-foreground",
  ready: "bg-accent/15 text-accent-foreground",
  approved: "bg-primary/10 text-primary",
  exported: "bg-primary/10 text-primary",
  executed: "bg-primary text-primary-foreground",
  completed: "bg-primary text-primary-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
  failed: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
};

export function RunStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={TONE[status] ?? ""}>
      {labelOf(PAYMENT_RUN_STATUSES, status)}
    </Badge>
  );
}

export function InstructionStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={TONE[status] ?? ""}>
      {labelOf(PAYMENT_INSTRUCTION_STATUSES, status)}
    </Badge>
  );
}
