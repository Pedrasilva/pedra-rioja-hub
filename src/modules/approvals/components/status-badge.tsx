/**
 * Shared status presentation for the approval module.
 * Colour is carried by the semantic badge variants only.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labelOf } from "@/modules/approvals/schemas";

type Variant = "default" | "secondary" | "destructive" | "outline";

const VARIANTS: Record<string, Variant> = {
  approved: "default",
  published: "default",
  succeeded: "default",
  approve: "default",
  override_approve: "default",
  pending: "secondary",
  draft: "outline",
  not_required: "outline",
  abstain: "outline",
  returned: "secondary",
  return: "secondary",
  delegate: "secondary",
  archived: "outline",
  withdrawn: "outline",
  withdraw: "outline",
  cancelled: "destructive",
  cancel: "destructive",
  expired: "destructive",
  expire: "destructive",
  rejected: "destructive",
  reject: "destructive",
  override_reject: "destructive",
  failed: "destructive",
};

export function ApprovalStatusBadge({
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
