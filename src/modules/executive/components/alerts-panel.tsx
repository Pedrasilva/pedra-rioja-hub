/** Executive layer — consolidated, prioritised alert panel. */

import { AlertTriangle, Bell, CalendarClock, Info, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExecutiveAlert } from "../queries";
import type { Insight } from "../report-utils";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/5",
  high: "border-warning/40 bg-warning/5",
  medium: "border-border bg-muted/40",
  low: "border-border bg-transparent",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function iconFor(category: string) {
  switch (category) {
    case "liquidity":
      return AlertTriangle;
    case "financing":
      return CalendarClock;
    case "compliance":
      return ShieldAlert;
    case "bookkeeping":
    case "tax":
      return Bell;
    default:
      return Info;
  }
}

export function AlertsPanel({
  alerts,
  insights,
  isLoading,
  limit = 8,
}: {
  alerts: ExecutiveAlert[];
  insights: Insight[];
  isLoading?: boolean;
  limit?: number;
}) {
  const rows = [
    ...alerts.map((a) => ({
      key: a.key,
      severity: a.severity,
      category: a.category,
      title: a.title,
      detail: a.detail,
      due_date: a.due_date,
      amount: a.amount,
    })),
    ...insights.map((i) => ({
      key: `insight:${i.key}`,
      severity: i.severity,
      category: "insight",
      title: i.title,
      detail: i.detail,
      due_date: null as string | null,
      amount: null as number | null,
    })),
  ].sort(
    (a, b) =>
      ["critical", "high", "medium", "low"].indexOf(a.severity) -
      ["critical", "high", "medium", "low"].indexOf(b.severity),
  );

  const critical = rows.filter((r) => r.severity === "critical").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="font-display text-lg">What needs attention</CardTitle>
            <CardDescription>
              {isLoading
                ? "Reading the portfolio…"
                : rows.length === 0
                  ? "Nothing is overdue, at risk or awaiting a decision."
                  : `${rows.length} item${rows.length === 1 ? "" : "s"}${
                      critical ? ` · ${critical} critical` : ""
                    }`}
            </CardDescription>
          </div>
          {critical > 0 ? <Badge variant="destructive">Action required</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.slice(0, limit).map((r) => {
          const Icon = iconFor(r.category);
          return (
            <div
              key={r.key}
              className={cn(
                "flex items-start gap-3 rounded-md border px-3 py-2",
                SEVERITY_STYLE[r.severity] ?? SEVERITY_STYLE.low,
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.title}</p>
                {r.detail ? (
                  <p className="text-sm text-muted-foreground">{r.detail}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <Badge variant="outline" className="text-[10px]">
                  {SEVERITY_LABEL[r.severity]}
                </Badge>
                {r.amount ? (
                  <p className="mt-1 text-xs font-medium">{formatMoney(Math.abs(r.amount))}</p>
                ) : null}
                {r.due_date ? (
                  <p className="text-xs text-muted-foreground">{formatDate(r.due_date)}</p>
                ) : null}
              </div>
            </div>
          );
        })}
        {rows.length > limit ? (
          <p className="pt-1 text-xs text-muted-foreground">
            + {rows.length - limit} further item{rows.length - limit === 1 ? "" : "s"}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
