/** Executive layer — small presentation primitives shared by dashboard and reports. */

import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
  action,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "positive" | "negative" | "muted";
  action?: ReactNode;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardHeader className="px-4 pb-1">
        <CardDescription className="text-xs tracking-wide uppercase">{label}</CardDescription>
        <CardTitle
          className={cn(
            "font-display text-2xl leading-tight font-semibold",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
            tone === "muted" && "text-muted-foreground",
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-1 text-xs text-muted-foreground">
        {hint}
        {action}
      </CardContent>
    </Card>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
