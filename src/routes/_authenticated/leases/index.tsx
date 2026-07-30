import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import { leaseCapabilities } from "@/modules/leases/capabilities";
import { LeaseDialog } from "@/modules/leases/components/lease-dialog";
import { LeaseList } from "@/modules/leases/components/lease-list";
import { useLeaseSummaries } from "@/modules/leases/queries";
import { useLeaseActions } from "@/modules/leases/server";

export const Route = createFileRoute("/_authenticated/leases/")({
  head: () => ({
    meta: [
      { title: "Leases — Pedra Rioja lease register" },
      {
        name: "description",
        content:
          "The lease register: versioned commercial leases, demise, tenants, contracted rent, review and break dates across the portfolio.",
      },
      { property: "og:title", content: "Leases — Pedra Rioja lease register" },
      {
        property: "og:description",
        content:
          "Versioned lease administration: demise, tenants, charges, reviews, breaks and expiries — operational records that own no money.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell title="Leases" description="The lease register could not be loaded.">
      <Card>
        <CardContent className="py-10 text-sm text-destructive">{error.message}</CardContent>
      </Card>
    </AppShell>
  ),
  component: LeasesPage,
});

function LeasesPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = leaseCapabilities(workspace?.roles);
  const actions = useLeaseActions();
  const { data: rows = [], isLoading, isError, error } = useLeaseSummaries(companyId);
  const navigate = Route.useNavigate();

  if (!capabilities.canView) {
    return (
      <AppShell title="Leases">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            You do not have access to the lease register.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Leases"
      description="Versioned lease administration. Leases record obligations and relationships — never money."
      actions={
        <LeaseDialog
          companyId={companyId}
          actions={actions}
          disabled={!capabilities.canRecord}
          onCreated={(id) => navigate({ to: "/leases/$leaseId", params: { leaseId: id } })}
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
        <LeaseList rows={rows} />
      )}
    </AppShell>
  );
}
