import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { acquisitionCapabilities } from "@/modules/acquisitions/capabilities";
import { OpportunityDetail } from "@/modules/acquisitions/components/opportunity-detail";
import { OpportunityDialog } from "@/modules/acquisitions/components/opportunity-dialog";
import { useOpportunity } from "@/modules/acquisitions/queries";
import { useAcquisitionActions } from "@/modules/acquisitions/server";

export const Route = createFileRoute("/_authenticated/acquisitions/$opportunityId")({
  head: () => ({
    meta: [
      { title: "Opportunity — Pedra Rioja acquisition workspace" },
      {
        name: "description",
        content:
          "One acquisition opportunity: stage history, activity timeline, tasks, valuations, offer history and any commitments explicitly linked to the deal.",
      },
      { property: "og:title", content: "Opportunity — Pedra Rioja acquisition workspace" },
      {
        property: "og:description",
        content:
          "Run a deal from lead to accepted offer, then hand it over to a commitment when spend is authorised.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OpportunityPage,
});

function OpportunityPage() {
  const { opportunityId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = acquisitionCapabilities(workspace?.roles);
  const actions = useAcquisitionActions();
  const { data: opportunity, isLoading } = useOpportunity(companyId, opportunityId);

  return (
    <AppShell
      title={opportunity ? `${opportunity.reference} — ${opportunity.title}` : "Opportunity"}
      description="Operational deal record. Indicative estimates only: no journal, no payment, no cash-flow entry."
      actions={
        opportunity ? (
          <OpportunityDialog
            companyId={companyId}
            actions={actions}
            opportunity={opportunity}
            disabled={!capabilities.canEdit || opportunity.is_archived}
          />
        ) : null
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the opportunity…</p>
      ) : !opportunity ? (
        <p className="text-sm text-muted-foreground">
          This opportunity does not exist, or it belongs to another company.
        </p>
      ) : (
        <OpportunityDetail
          opportunity={opportunity}
          capabilities={capabilities}
          actions={actions}
        />
      )}
    </AppShell>
  );
}
