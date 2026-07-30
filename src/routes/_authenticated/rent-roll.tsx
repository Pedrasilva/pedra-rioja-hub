import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import { leaseCapabilities } from "@/modules/leases/capabilities";
import { useOccupancyMetrics, useRentRoll } from "@/modules/leases/queries";
import { RentRollTable } from "@/modules/rentroll/components/rent-roll-table";
import { formatArea, formatMoneyPrecise, formatNumber, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rent-roll")({
  head: () => ({
    meta: [
      { title: "Rent roll — Pedra Rioja contracted income" },
      {
        name: "description",
        content:
          "The live rent roll: one row per let unit with contracted rent, service charge, term, review and break dates — every figure derived from the active lease version.",
      },
      { property: "og:title", content: "Rent roll — Pedra Rioja contracted income" },
      {
        property: "og:description",
        content:
          "Contracted rent, occupancy and WAULT derived from active lease versions. Nothing on this screen is stored.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell title="Rent roll" description="The rent roll could not be loaded.">
      <Card>
        <CardContent className="py-10 text-sm text-destructive">{error.message}</CardContent>
      </Card>
    </AppShell>
  ),
  component: RentRollPage,
});

function RentRollPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = leaseCapabilities(workspace?.roles);
  const { data: rows = [], isLoading, isError, error } = useRentRoll(companyId);
  const { data: metrics } = useOccupancyMetrics(companyId);

  if (!capabilities.canView) {
    return (
      <AppShell title="Rent roll">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            You do not have access to the rent roll.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Rent roll"
      description="Contracted income derived from active lease versions — never stored, never re-entered."
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
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Contracted annual rent"
              value={formatMoneyPrecise(metrics?.contracted_annual_rent ?? 0, "EUR")}
            />
            <Metric label="Occupancy" value={formatPercent(metrics?.occupancy_pct)} />
            <Metric
              label="WAULT"
              value={
                metrics?.wault_years == null ? "—" : `${formatNumber(metrics.wault_years)} years`
              }
            />
            <Metric label="Occupied area" value={formatArea(metrics?.occupied_area_m2)} />
          </div>
          <RentRollTable rows={rows} />
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 font-display text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
