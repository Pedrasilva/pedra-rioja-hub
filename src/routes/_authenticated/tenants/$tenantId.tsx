import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import { leaseCapabilities } from "@/modules/leases/capabilities";
import { useTenant } from "@/modules/leases/queries";
import { useLeaseActions } from "@/modules/leases/server";
import { TenantDetail } from "@/modules/tenants/components/tenant-detail";

export const Route = createFileRoute("/_authenticated/tenants/$tenantId")({
  head: () => ({
    meta: [
      { title: "Tenant workspace — Pedra Rioja" },
      {
        name: "description",
        content:
          "One tenant in full: legal entity details, contacts, leases and the units they currently occupy.",
      },
      { property: "og:title", content: "Tenant workspace — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Tenant profile, contacts, linked leases and occupied units derived from the live rent roll.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell title="Tenant" description="This tenant could not be loaded.">
      <Card>
        <CardContent className="py-10 text-sm text-destructive">{error.message}</CardContent>
      </Card>
    </AppShell>
  ),
  component: TenantWorkspace,
});

function TenantWorkspace() {
  const { tenantId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const capabilities = leaseCapabilities(workspace?.roles);
  const actions = useLeaseActions();
  const { data: tenant, isLoading, isError, error } = useTenant(tenantId);

  if (!capabilities.canView) {
    return (
      <AppShell title="Tenant">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            You do not have access to tenants.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title="Tenant">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Tenant">
        <Card>
          <CardContent className="py-10 text-sm text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (!tenant) {
    return (
      <AppShell title="Tenant not found" description="This tenant is not in your register.">
        <Card>
          <CardContent className="py-12 text-center">
            <Button asChild variant="outline">
              <Link to="/tenants">
                <ArrowLeft className="size-4" /> Back to the tenant register
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={tenant.name}
      description={tenant.legal_name ?? tenant.trading_name ?? "Tenant workspace"}
      actions={
        <>
          {tenant.archived_at ? <Badge variant="outline">Archived</Badge> : null}
          <Button variant="outline" size="sm" asChild>
            <Link to="/tenants">
              <ArrowLeft className="size-4" /> Register
            </Link>
          </Button>
        </>
      }
    >
      <TenantDetail tenant={tenant} actions={actions} capabilities={capabilities} />
    </AppShell>
  );
}
