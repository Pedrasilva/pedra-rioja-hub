import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { diligenceCapabilities } from "@/modules/diligence/capabilities";
import { DiligenceCaseDetail } from "@/modules/diligence/components/case-detail";
import { useDiligenceCase } from "@/modules/diligence/queries";
import { useDiligenceActions } from "@/modules/diligence/server";

export const Route = createFileRoute("/_authenticated/due-diligence/$caseId")({
  head: () => ({
    meta: [
      { title: "Due-diligence case — Pedra Rioja" },
      {
        name: "description",
        content:
          "One due-diligence case: sectioned checklist, findings, risk levels, waivers and the recommendation handed over to closing.",
      },
      { property: "og:title", content: "Due-diligence case — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Blocking items must be complete or explicitly waived before a case can be completed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiligenceCasePage,
});

function DiligenceCasePage() {
  const { caseId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = diligenceCapabilities(workspace?.roles);
  const actions = useDiligenceActions();
  const { data: record, isLoading } = useDiligenceCase(companyId, caseId);

  return (
    <AppShell
      title={record ? `${record.reference} — ${record.title}` : "Due-diligence case"}
      description="Findings and risk, recorded item by item. The recommendation is the only thing closing may rely on."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the case…</p>
      ) : !record ? (
        <p className="text-sm text-muted-foreground">
          This case does not exist, or it belongs to another company.
        </p>
      ) : (
        <DiligenceCaseDetail record={record} capabilities={capabilities} actions={actions} />
      )}
    </AppShell>
  );
}
