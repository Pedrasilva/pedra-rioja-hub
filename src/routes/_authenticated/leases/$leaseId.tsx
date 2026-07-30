import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import { leaseCapabilities } from "@/modules/leases/capabilities";
import { LeaseDetail } from "@/modules/leases/components/lease-detail";
import { useLeaseSummary } from "@/modules/leases/queries";
import { useLeaseActions } from "@/modules/leases/server";

export const Route = createFileRoute("/_authenticated/leases/$leaseId")({
  head: () => ({
    meta: [
      { title: "Lease workspace — Pedra Rioja" },
      {
        name: "description",
        content:
          "One lease end to end: versions, demise, tenants, charge schedule, rent reviews, break clauses, notices, guarantees and documents.",
      },
      { property: "og:title", content: "Lease workspace — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Versioned lease administration for a single lease — an operational record that creates no commitments, journals or payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell title="Lease" description="This lease could not be loaded.">
      <Card>
        <CardContent className="py-10 text-sm text-destructive">{error.message}</CardContent>
      </Card>
    </AppShell>
  ),
  component: LeaseWorkspace,
});

function LeaseWorkspace() {
  const { leaseId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const capabilities = leaseCapabilities(workspace?.roles);
  const actions = useLeaseActions();
  const { data: lease, isLoading, isError, error } = useLeaseSummary(leaseId);

  if (!capabilities.canView) {
    return (
      <AppShell title="Lease">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            You do not have access to leases.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title="Lease">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Lease">
        <Card>
          <CardContent className="py-10 text-sm text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (!lease) {
    return (
      <AppShell title="Lease not found" description="This lease is not in your register.">
        <Card>
          <CardContent className="py-12 text-center">
            <Button asChild variant="outline">
              <Link to="/leases">
                <ArrowLeft className="size-4" /> Back to the lease register
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={lease.code ?? lease.title ?? "Lease"}
      description={[lease.property_name, lease.tenant_name].filter(Boolean).join(" · ")}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/leases">
            <ArrowLeft className="size-4" /> Register
          </Link>
        </Button>
      }
    >
      <LeaseDetail lease={lease} actions={actions} capabilities={capabilities} />
    </AppShell>
  );
}
