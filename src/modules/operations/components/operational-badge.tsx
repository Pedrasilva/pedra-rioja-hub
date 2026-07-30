/**
 * Status presentation for the operational registers.
 * Colour is carried by the semantic badge variants only.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { operationalLabel } from "@/modules/operations/schemas";

type Variant = "default" | "secondary" | "destructive" | "outline";

const VARIANTS: Record<string, Variant> = {
  active: "default",
  open: "default",
  resolved: "default",
  completed: "secondary",
  settled: "secondary",
  acknowledged: "secondary",
  in_progress: "secondary",
  expiring: "secondary",
  pending: "secondary",
  high: "secondary",
  draft: "outline",
  scheduled: "outline",
  suspended: "outline",
  normal: "outline",
  medium: "outline",
  low: "outline",
  dismissed: "outline",
  archived: "outline",
  cancelled: "destructive",
  terminated: "destructive",
  expired: "destructive",
  lapsed: "destructive",
  urgent: "destructive",
  critical: "destructive",
};

export function OperationalBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={VARIANTS[status] ?? "outline"} className={cn("font-medium", className)}>
      {operationalLabel(status)}
    </Badge>
  );
}

/** Days-remaining countdown, coloured by urgency band only. */
export function Countdown({ days }: { days: number | null | undefined }) {
  if (days === null || days === undefined) return <span className="text-muted-foreground">—</span>;
  const tone =
    days < 0
      ? "text-destructive font-medium"
      : days <= 14
        ? "text-destructive"
        : days <= 45
          ? "text-foreground"
          : "text-muted-foreground";
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`;
  return <span className={tone}>{label}</span>;
}
