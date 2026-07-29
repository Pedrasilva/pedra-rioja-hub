import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/hooks/use-workspace";
import { CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Pedra Rioja" },
      {
        name: "description",
        content: "Portfolio overview and build progress for the Pedra Rioja workspace.",
      },
      { property: "og:title", content: "Dashboard — Pedra Rioja" },
      {
        property: "og:description",
        content: "Portfolio overview and build progress for the Pedra Rioja workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const PHASES = [
  { n: 1, name: "Foundation", detail: "Company, users, roles, settings, audit log", done: true },
  { n: 2, name: "Property register", detail: "Properties, units, ownership, documents" },
  { n: 3, name: "Counterparties", detail: "Tenants, suppliers, banks, contacts" },
  { n: 4, name: "Bookkeeping core", detail: "Documents, lines, VAT, payments" },
  { n: 5, name: "Dimensions", detail: "Linking transactions to properties, projects, tenancies" },
  { n: 6, name: "Tenancies & rent", detail: "Leases, rent roll, indexation, receivables" },
  { n: 7, name: "Financing", detail: "Mortgages, schedules, fit-out repayments" },
  { n: 8, name: "Construction", detail: "Projects, budgets, cost tracking" },
  { n: 9, name: "Reporting & exports", detail: "Statements, VAT periods, accountant exports" },
];

function Dashboard() {
  const { data: workspace, isLoading } = useWorkspace();

  return (
    <AppShell
      title={`Welcome${workspace?.fullName ? `, ${workspace.fullName.split(" ")[0]}` : ""}`}
      description="Phase 1 foundation is live. The portfolio and bookkeeping modules land in the phases below."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Company</CardDescription>
            <CardTitle className="font-display text-2xl">
              {isLoading ? "…" : (workspace?.company?.name ?? "Not assigned")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Base currency {workspace?.company?.base_currency ?? "—"} · Portugal
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your access</CardDescription>
            <CardTitle className="font-display text-2xl">
              {workspace?.roles.length ?? 0} role{workspace?.roles.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {workspace?.roles.length ? (
              workspace.roles.map((r) => (
                <Badge key={r} variant="secondary" className="capitalize">
                  {r}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                Awaiting a role from the workspace owner.
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bookkeeping model</CardDescription>
            <CardTitle className="font-display text-2xl">Operational</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Documents, VAT, payments and classifications. No general ledger.
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-xl">Build roadmap</CardTitle>
          <CardDescription>Nine phases from the approved architecture blueprint.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {PHASES.map((p) => (
            <div key={p.n} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              {p.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/40" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Phase {p.n} · {p.name}
                  {p.done ? (
                    <Badge className="ml-2 align-middle" variant="outline">
                      Complete
                    </Badge>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">{p.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
