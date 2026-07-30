import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import { leaseCapabilities } from "@/modules/leases/capabilities";
import { useTenants } from "@/modules/leases/queries";
import { useLeaseActions } from "@/modules/leases/server";
import { TenantDialog } from "@/modules/tenants/components/tenant-dialog";
import { TenantList } from "@/modules/tenants/components/tenant-list";

export const Route = createFileRoute("/_authenticated/tenants/")({
  head: () => ({
    meta: [
      { title: "Tenants — Pedra Rioja tenant register" },
      {
        name: "description",
        content:
          "The tenant register: legal entities occupying the portfolio, their contacts, leases and occupied units.",
      },
      { property: "og:title", content: "Tenants — Pedra Rioja tenant register" },
      {
        property: "og:description",
        content:
          "Tenant entities, registration details and contacts. Tenants are archived, never deleted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell title="Tenants" description="The tenant register could not be loaded.">
      <Card>
        <CardContent className="py-10 text-sm text-destructive">{error.message}</CardContent>
      </Card>
    </AppShell>
  ),
  component: TenantsPage,
});

function TenantsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = leaseCapabilities(workspace?.roles);
  const actions = useLeaseActions();
  const { data: rows = [], isLoading, isError, error } = useTenants(companyId);
  const navigate = Route.useNavigate();

  if (!capabilities.canView) {
    return (
      <AppShell title="Tenants">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            You do not have access to the tenant register.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Tenants"
      description="The legal entities that occupy the portfolio."
      actions={
        <TenantDialog
          companyId={companyId}
          actions={actions}
          disabled={!capabilities.canRecord}
          onCreated={(id) => navigate({ to: "/tenants/$tenantId", params: { tenantId: id } })}
        />
      }
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-sm text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      ) : (
        <TenantList rows={rows} />
      )}
    </AppShell>
  );
}
