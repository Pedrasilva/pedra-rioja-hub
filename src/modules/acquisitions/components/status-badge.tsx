import { Badge } from "@/components/ui/badge";
import { ACQUISITION_STAGES, labelOf } from "@/modules/acquisitions/schemas";

const TONE: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  initial_review: "bg-muted text-muted-foreground",
  under_analysis: "bg-accent/15 text-accent-foreground",
  offer_preparation: "bg-accent/15 text-accent-foreground",
  offer_submitted: "bg-primary/10 text-primary",
  negotiation: "bg-primary/10 text-primary",
  offer_accepted: "bg-primary text-primary-foreground",
  offer_rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground line-through",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant="outline" className={TONE[stage] ?? ""}>
      {labelOf(ACQUISITION_STAGES, stage)}
    </Badge>
  );
}

const OFFER_TONE: Record<string, string> = {
  submitted: "bg-primary/10 text-primary",
  accepted: "bg-primary text-primary-foreground",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground line-through",
  expired: "bg-muted text-muted-foreground",
};

export function OfferStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={OFFER_TONE[status] ?? ""}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
