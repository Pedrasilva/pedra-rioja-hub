import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { BudgetVersionPanel } from "@/modules/budgets/components/budget-version-panel";
import { useBudgetLines, useBudgetVersionsFor } from "@/modules/budgets/queries";
import { useBudgetActions } from "@/modules/budgets/server";
import { commitmentCapabilities } from "@/modules/commitments/capabilities";

export const Route = createFileRoute("/_authenticated/budgets/$budgetId")({
  head: () => ({
    meta: [
      { title: "Budget workspace — Pedra Rioja" },
      {
        name: "description",
        content:
          "One budget end to end: versions, planned lines by dimension and period, and derived committed, invoiced, paid, remaining and variance figures.",
      },
      { property: "og:title", content: "Budget workspace — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "Draft, approve and publish immutable budget versions; consumption is derived from commitments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BudgetDetailPage,
  errorComponent: () => (
    <AppShell title="Budget" description="Something went wrong.">
      <p className="text-sm text-muted-foreground">
        This budget could not be loaded. Please refresh the page.
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="Budget" description="Not found.">
      <p className="text-sm text-muted-foreground">That budget does not exist.</p>
    </AppShell>
  ),
});

function BudgetDetailPage() {
  const { budgetId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = commitmentCapabilities(workspace?.roles);
  const actions = useBudgetActions();

  const { data: versions = [], isLoading } = useBudgetVersionsFor(budgetId);
  const [versionId, setVersionId] = useState<string | undefined>();

  useEffect(() => {
    if (versions.length === 0) return;
    if (versionId && versions.some((v) => v.version_id === versionId)) return;
    const preferred = versions.find((v) => v.status === "draft") ?? versions[0];
    setVersionId(preferred.version_id);
  }, [versions, versionId]);

  const version = versions.find((v) => v.version_id === versionId);
  const { data: lines = [], isLoading: loadingLines } = useBudgetLines(versionId);

  return (
    <AppShell
      title={version?.name ?? "Budget"}
      description={
        version
          ? `Fiscal year ${version.fiscal_year} · ${version.property_name ?? "Portfolio-wide"}`
          : "Loading budget…"
      }
    >
      <BudgetVersionPanel
        companyId={companyId}
        version={version}
        versions={versions}
        lines={lines}
        capabilities={capabilities}
        actions={actions}
        onSelectVersion={setVersionId}
        isLoading={isLoading || loadingLines}
      />
    </AppShell>
  );
}
