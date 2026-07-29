import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/hooks/use-workspace";
import { commitmentCapabilities } from "@/modules/commitments/capabilities";
import { CapexPanel } from "@/modules/commitments/components/capex-panel";
import { MaintenancePanel } from "@/modules/commitments/components/maintenance-panel";
import {
  useCapexSummaries,
  useCommitmentSummaries,
  useMaintenanceJobs,
} from "@/modules/commitments/queries";
import { useCommitmentActions } from "@/modules/commitments/server";

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({
    meta: [
      { title: "Operations — Pedra Rioja maintenance and capex" },
      {
        name: "description",
        content:
          "Maintenance jobs and capex projects with costs derived from their commitments, so operational records never hold their own money.",
      },
      { property: "og:title", content: "Operations — Pedra Rioja maintenance and capex" },
      {
        property: "og:description",
        content:
          "Track jobs, contractors and project budgets against committed, invoiced and paid figures from the ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationsPage,
});

function OperationsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = commitmentCapabilities(workspace?.roles);
  const actions = useCommitmentActions();

  const { data: jobs = [] } = useMaintenanceJobs(companyId);
  const { data: commitments = [] } = useCommitmentSummaries(companyId);
  const { data: capex = [] } = useCapexSummaries(companyId);

  return (
    <AppShell
      title="Operations"
      description="Maintenance and capex own the work; commitments own the money."
    >
      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="capex">Capex</TabsTrigger>
        </TabsList>
        <TabsContent value="maintenance">
          <MaintenancePanel
            companyId={companyId}
            jobs={jobs}
            commitments={commitments}
            capabilities={capabilities}
            actions={actions}
          />
        </TabsContent>
        <TabsContent value="capex">
          <CapexPanel rows={capex} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
