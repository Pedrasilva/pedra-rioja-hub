import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-workspace";
import { leaseCapabilities } from "@/modules/leases/capabilities";
import { OccupancyBoard } from "@/modules/occupancy/components/occupancy-board";

export const Route = createFileRoute("/_authenticated/occupancy")({
  head: () => ({
    meta: [
      { title: "Occupancy — Pedra Rioja unit status board" },
      {
        name: "description",
        content:
          "Occupancy board: the current state of every unit — occupied, vacant, reserved, under offer, under refurbishment or unavailable — with vacancy history.",
      },
      { property: "og:title", content: "Occupancy — Pedra Rioja unit status board" },
      {
        property: "og:description",
        content:
          "Unit-level occupancy, vacancy periods and occupancy timelines. Operational records that own no money.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell title="Occupancy" description="The occupancy board could not be loaded.">
      <Card>
        <CardContent className="py-10 text-sm text-destructive">{error.message}</CardContent>
      </Card>
    </AppShell>
  ),
  component: OccupancyPage,
});

function OccupancyPage() {
  const { data: workspace } = useWorkspace();
  const capabilities = leaseCapabilities(workspace?.roles);

  if (!capabilities.canView) {
    return (
      <AppShell title="Occupancy">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            You do not have access to occupancy.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Occupancy"
      description="Where every unit stands today, and how it got there."
    >
      <OccupancyBoard companyId={workspace?.company?.id} />
    </AppShell>
  );
}
