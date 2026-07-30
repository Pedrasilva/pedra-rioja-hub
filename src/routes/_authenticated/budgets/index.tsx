import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { BudgetRegister } from "@/modules/budgets/components/budget-register";
import { useBudgetVersions } from "@/modules/budgets/queries";
import { useBudgetActions } from "@/modules/budgets/server";
import { commitmentCapabilities } from "@/modules/commitments/capabilities";

export const Route = createFileRoute("/_authenticated/budgets/")({
  head: () => ({
    meta: [
      { title: "Budgets — Pedra Rioja portfolio planning" },
      {
        name: "description",
        content:
          "Fiscal-year budgets with immutable published versions, dimension attribution and forecast-versus-actual figures derived from commitments, invoices and payments.",
      },
      { property: "og:title", content: "Budgets — Pedra Rioja portfolio planning" },
      {
        property: "og:description",
        content:
          "Plan by property, project and dimension; consumption is always derived, never stored.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BudgetsPage,
  errorComponent: () => (
    <AppShell title="Budgets" description="Something went wrong.">
      <p className="text-sm text-muted-foreground">
        The budget register could not be loaded. Please refresh the page.
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="Budgets" description="Not found.">
      <p className="text-sm text-muted-foreground">That budget view does not exist.</p>
    </AppShell>
  ),
});

function BudgetsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = commitmentCapabilities(workspace?.roles);
  const actions = useBudgetActions();
  const { data: rows = [], isLoading } = useBudgetVersions(companyId);

  return (
    <AppShell
      title="Budgets"
      description="Budgets are plans. Commitments remain the only owner of expected expenditure."
    >
      <BudgetRegister
        companyId={companyId}
        rows={rows}
        capabilities={capabilities}
        actions={actions}
        isLoading={isLoading}
      />
    </AppShell>
  );
}
