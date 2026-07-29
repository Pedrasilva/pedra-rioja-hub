import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { commitmentCapabilities } from "@/modules/commitments/capabilities";
import { CommitmentDialog } from "@/modules/commitments/components/commitment-dialog";
import { CommitmentList } from "@/modules/commitments/components/commitment-list";
import { useCommitmentSummaries } from "@/modules/commitments/queries";
import { useCommitmentActions } from "@/modules/commitments/server";

export const Route = createFileRoute("/_authenticated/commitments/")({
  head: () => ({
    meta: [
      { title: "Commitments — Pedra Rioja authorised spend" },
      {
        name: "description",
        content:
          "The commitment register: authorised spend, approval state, versioned schedules and how much of each promise has been invoiced and paid.",
      },
      { property: "og:title", content: "Commitments — Pedra Rioja authorised spend" },
      {
        property: "og:description",
        content:
          "Track forecast, committed, invoiced and paid spend across contracts, purchase orders, maintenance and tax instalments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommitmentsPage,
});

function CommitmentsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = commitmentCapabilities(workspace?.roles);
  const actions = useCommitmentActions();
  const { data: rows = [], isLoading } = useCommitmentSummaries(companyId);

  const navigate = Route.useNavigate();

  return (
    <AppShell
      title="Commitments"
      description="Every authorised promise to spend, from approval through to the invoices that consume it."
      actions={
        <CommitmentDialog
          companyId={companyId}
          actions={actions}
          disabled={!capabilities.canRecord}
          onCreated={(id) =>
            navigate({ to: "/commitments/$commitmentId", params: { commitmentId: id } })
          }
        />
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading commitments…</p>
      ) : (
        <CommitmentList rows={rows} />
      )}
    </AppShell>
  );
}
