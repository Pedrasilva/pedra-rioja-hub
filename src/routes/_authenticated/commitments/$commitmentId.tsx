import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { PedraRiojaBookkeepingProvider } from "@/modules/bookkeeping/host/provider";
import { commitmentCapabilities } from "@/modules/commitments/capabilities";
import { CommitmentDetail } from "@/modules/commitments/components/commitment-detail";
import { useCommitmentActions } from "@/modules/commitments/server";

export const Route = createFileRoute("/_authenticated/commitments/$commitmentId")({
  head: () => ({
    meta: [
      { title: "Commitment workspace — Pedra Rioja" },
      {
        name: "description",
        content:
          "One authorised commitment end to end: approval trail, versioned schedule, cash-flow projections, drawdowns against posted invoices and supporting evidence.",
      },
      { property: "og:title", content: "Commitment workspace — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Approval, schedule versioning, drawdown lineage and derived variance for a single commitment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommitmentDetailPage,
});

function CommitmentDetailPage() {
  const { commitmentId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = commitmentCapabilities(workspace?.roles);
  const actions = useCommitmentActions();

  return (
    <AppShell
      title="Commitment"
      description="Forecast, commitment, invoice, payment — the same money, counted once."
    >
      <PedraRiojaBookkeepingProvider>
        <CommitmentDetail
          companyId={companyId}
          commitmentId={commitmentId}
          capabilities={capabilities}
          userId={workspace?.userId}
          actions={actions}
        />
      </PedraRiojaBookkeepingProvider>
    </AppShell>
  );
}
