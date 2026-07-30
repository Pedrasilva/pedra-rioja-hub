import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { acquisitionCapabilities } from "@/modules/acquisitions/capabilities";
import { OpportunityDialog } from "@/modules/acquisitions/components/opportunity-dialog";
import { AcquisitionPipeline } from "@/modules/acquisitions/components/pipeline-board";
import { useOpportunities } from "@/modules/acquisitions/queries";
import { useAcquisitionActions } from "@/modules/acquisitions/server";

export const Route = createFileRoute("/_authenticated/acquisitions/")({
  head: () => ({
    meta: [
      { title: "Acquisitions — Pedra Rioja deal pipeline" },
      {
        name: "description",
        content:
          "Track property acquisition opportunities from lead through analysis, offer and negotiation, with activity, tasks, valuations and offer history.",
      },
      { property: "og:title", content: "Acquisitions — Pedra Rioja deal pipeline" },
      {
        property: "og:description",
        content:
          "An operational deal pipeline: indicative estimates only, with an explicit hand-over into commitments when a deal is authorised.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcquisitionsPage,
});

function AcquisitionsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = acquisitionCapabilities(workspace?.roles);
  const actions = useAcquisitionActions();
  const { data: rows = [], isLoading } = useOpportunities(companyId);
  const navigate = Route.useNavigate();

  return (
    <AppShell
      title="Acquisitions"
      description="The deal pipeline before the money. Opportunities are operational records; every figure is indicative and no commitment is created without asking."
      actions={
        <OpportunityDialog
          companyId={companyId}
          actions={actions}
          disabled={!capabilities.canCreate}
          onCreated={(id) =>
            navigate({ to: "/acquisitions/$opportunityId", params: { opportunityId: id } })
          }
        />
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the pipeline…</p>
      ) : (
        <AcquisitionPipeline rows={rows} />
      )}
    </AppShell>
  );
}
