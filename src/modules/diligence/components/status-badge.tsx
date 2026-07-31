import { Badge } from "@/components/ui/badge";
import { labelOf } from "@/modules/acquisitions/schemas";
import {
  DILIGENCE_ITEM_STATUSES,
  DILIGENCE_RECOMMENDATIONS,
  DILIGENCE_STATUSES,
  RISK_LEVELS,
} from "@/modules/diligence/schemas";

const CASE_TONE: Record<string, string> = {
  preparing: "bg-muted text-muted-foreground",
  in_progress: "bg-accent/15 text-accent-foreground",
  on_hold: "bg-muted text-muted-foreground",
  completed: "bg-primary text-primary-foreground",
  abandoned: "bg-destructive/10 text-destructive line-through",
};

export function CaseStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={CASE_TONE[status] ?? ""}>
      {labelOf(DILIGENCE_STATUSES, status)}
    </Badge>
  );
}

const RECOMMENDATION_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  proceed: "bg-primary text-primary-foreground",
  proceed_with_conditions: "bg-primary/10 text-primary",
  renegotiate: "bg-accent/20 text-accent-foreground",
  withdraw: "bg-destructive/10 text-destructive",
};

export function RecommendationBadge({ recommendation }: { recommendation: string }) {
  return (
    <Badge variant="outline" className={RECOMMENDATION_TONE[recommendation] ?? ""}>
      {labelOf(DILIGENCE_RECOMMENDATIONS, recommendation)}
    </Badge>
  );
}

const ITEM_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-accent/15 text-accent-foreground",
  complete: "bg-primary/10 text-primary",
  waived: "bg-muted text-muted-foreground italic",
  failed: "bg-destructive/10 text-destructive",
};

export function ItemStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={ITEM_TONE[status] ?? ""}>
      {labelOf(DILIGENCE_ITEM_STATUSES, status)}
    </Badge>
  );
}

const RISK_TONE: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/20 text-accent-foreground",
  high: "bg-destructive/10 text-destructive",
};

export function RiskBadge({ level }: { level: string }) {
  if (level === "none") return null;
  return (
    <Badge variant="outline" className={RISK_TONE[level] ?? ""}>
      {labelOf(RISK_LEVELS, level)} risk
    </Badge>
  );
}
