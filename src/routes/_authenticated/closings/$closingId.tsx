import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { closingCapabilities } from "@/modules/closings/capabilities";
import { ClosingDetail } from "@/modules/closings/components/closing-detail";
import { useClosingCase } from "@/modules/closings/queries";
import { useClosingActions } from "@/modules/closings/server";

export const Route = createFileRoute("/_authenticated/closings/$closingId")({
  head: () => ({
    meta: [
      { title: "Closing workspace — Pedra Rioja" },
      {
        name: "description",
        content:
          "One closing end to end: conditions precedent, readiness gate, handover tasks, completion and the conversion into a managed property.",
      },
      { property: "og:title", content: "Closing workspace — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Readiness is derived: blocking conditions satisfied and due diligence recommending proceed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClosingDetailPage,
});

function ClosingDetailPage() {
  const { closingId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = closingCapabilities(workspace?.roles);
  const actions = useClosingActions();
  const { data: record, isLoading } = useClosingCase(companyId, closingId);

  return (
    <AppShell
      title={record ? `${record.reference} — ${record.title}` : "Closing"}
      description="The hand-over from deal to managed asset. Amounts here are indicative; the money stays with commitments and bookkeeping."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the closing…</p>
      ) : !record ? (
        <p className="text-sm text-muted-foreground">
          This closing does not exist, or it belongs to another company.
        </p>
      ) : (
        <ClosingDetail record={record} capabilities={capabilities} actions={actions} />
      )}
    </AppShell>
  );
}
