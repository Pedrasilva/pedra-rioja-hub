/**
 * Shared status presentation for the commitment module.
 * Colour is carried by the semantic badge variants only.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labelOf } from "@/modules/commitments/schemas";

type Variant = "default" | "secondary" | "destructive" | "outline";

const VARIANTS: Record<string, Variant> = {
  active: "default",
  approved: "default",
  paid: "default",
  reconciled: "default",
  completed: "secondary",
  draft: "outline",
  scheduled: "outline",
  not_requested: "outline",
  requested: "outline",
  pending: "secondary",
  pending_approval: "secondary",
  invoiced: "secondary",
  in_progress: "secondary",
  superseded: "outline",
  withdrawn: "outline",
  cancelled: "destructive",
  rejected: "destructive",
  reversed: "destructive",
  urgent: "destructive",
  high: "secondary",
  medium: "outline",
  low: "outline",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={VARIANTS[status] ?? "outline"} className={cn("font-medium", className)}>
      {labelOf(status)}
    </Badge>
  );
}
