import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { ClosingList } from "@/modules/closings/components/closing-list";
import { useClosingCases } from "@/modules/closings/queries";

export const Route = createFileRoute("/_authenticated/closings/")({
  head: () => ({
    meta: [
      { title: "Closings — Pedra Rioja completion & handover" },
      {
        name: "description",
        content:
          "Every closing in one register: conditions precedent, handover progress, completion dates and the managed property each deal became.",
      },
      { property: "og:title", content: "Closings — Pedra Rioja completion & handover" },
      {
        property: "og:description",
        content:
          "The final operational stage before an acquired asset becomes a managed property.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClosingsPage,
});

function ClosingsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const { data: rows = [], isLoading } = useClosingCases(companyId);

  return (
    <AppShell
      title="Closings"
      description="Conditions, hand-over and the single conversion into a managed property. No journal, no payment, no cash-flow entry."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading closings…</p>
      ) : (
        <ClosingList rows={rows} />
      )}
    </AppShell>
  );
}
