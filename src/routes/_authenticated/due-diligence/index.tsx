import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { DiligenceCaseList } from "@/modules/diligence/components/case-list";
import { useDiligenceCases } from "@/modules/diligence/queries";

export const Route = createFileRoute("/_authenticated/due-diligence/")({
  head: () => ({
    meta: [
      { title: "Due diligence — Pedra Rioja acquisition checks" },
      {
        name: "description",
        content:
          "Every due-diligence case in one register: checklist progress, blocking items, risk findings and the recommendation that opens or refuses a closing.",
      },
      { property: "og:title", content: "Due diligence — Pedra Rioja acquisition checks" },
      {
        property: "og:description",
        content:
          "A checklist, not a decision: findings are recorded, and only the final recommendation opens the closing gate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DueDiligencePage,
});

function DueDiligencePage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const { data: rows = [], isLoading } = useDiligenceCases(companyId);

  return (
    <AppShell
      title="Due diligence"
      description="Investigation before commitment. Cases are operational records: no journal, no payment, no cash-flow entry."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading due-diligence cases…</p>
      ) : (
        <DiligenceCaseList rows={rows} />
      )}
    </AppShell>
  );
}
