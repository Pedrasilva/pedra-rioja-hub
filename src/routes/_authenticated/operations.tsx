import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/hooks/use-workspace";
import { commitmentCapabilities } from "@/modules/commitments/capabilities";
import { CapexPanel } from "@/modules/commitments/components/capex-panel";
import { MaintenancePanel } from "@/modules/commitments/components/maintenance-panel";
import {
  useCapexSummaries,
  useCommitmentSummaries,
  useMaintenanceJobs,
} from "@/modules/commitments/queries";
import { useCommitmentActions } from "@/modules/commitments/server";
import { RegisterPanel, type RegisterRow } from "@/modules/operations/components/register-panel";
import {
  insuranceRegister,
  obligationRegister,
  serviceContractRegister,
  taxRegister,
  utilityRegister,
} from "@/modules/operations/components/registers";
import { RemindersPanel } from "@/modules/operations/components/reminders-panel";
import { TaxDatesDialog } from "@/modules/operations/components/tax-dates-dialog";
import {
  useInsurancePolicies,
  useObligations,
  useOperationalReminders,
  useServiceContracts,
  useTaxScheduleDates,
  useTaxSchedules,
  useUtilityContracts,
} from "@/modules/operations/queries";
import { useOperationsActions } from "@/modules/operations/server";

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({
    meta: [
      { title: "Operations — Pedra Rioja obligations and contracts" },
      {
        name: "description",
        content:
          "Obligations, service contracts, insurance, utilities, tax schedules, maintenance and capex — each holding its operational detail while commitments hold the money.",
      },
      {
        property: "og:title",
        content: "Operations — Pedra Rioja obligations and contracts",
      },
      {
        property: "og:description",
        content:
          "Renewal countdowns, reminder inbox and derived committed, invoiced and paid figures straight from the ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationsPage,
});

function OperationsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = commitmentCapabilities(workspace?.roles);
  const commitmentActions = useCommitmentActions();
  const actions = useOperationsActions();

  const { data: jobs = [] } = useMaintenanceJobs(companyId);
  const { data: commitments = [] } = useCommitmentSummaries(companyId);
  const { data: capex = [] } = useCapexSummaries(companyId);

  const { data: obligations = [], isLoading: loadingObligations } = useObligations(companyId);
  const { data: contracts = [], isLoading: loadingContracts } = useServiceContracts(companyId);
  const { data: policies = [], isLoading: loadingPolicies } = useInsurancePolicies(companyId);
  const { data: utilities = [], isLoading: loadingUtilities } = useUtilityContracts(companyId);
  const { data: taxes = [], isLoading: loadingTaxes } = useTaxSchedules(companyId);
  const { data: reminders = [], isLoading: loadingReminders } = useOperationalReminders(companyId);
  const { data: taxDates = [] } = useTaxScheduleDates(
    companyId,
    taxes.map((t) => t.schedule_id),
  );

  const shared = { companyId, obligations, commitments, capabilities, actions };

  return (
    <AppShell
      title="Operations"
      description="Operational records own the work and the dates; commitments own the money."
    >
      <Tabs defaultValue="reminders" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="utilities">Utilities</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="capex">Capex</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders">
          <RemindersPanel
            companyId={companyId}
            reminders={reminders}
            capabilities={capabilities}
            actions={actions}
            isLoading={loadingReminders}
          />
        </TabsContent>

        <TabsContent value="obligations">
          <RegisterPanel
            {...shared}
            register={obligationRegister}
            rows={obligations as unknown as RegisterRow[]}
            isLoading={loadingObligations}
          />
        </TabsContent>

        <TabsContent value="contracts">
          <RegisterPanel
            {...shared}
            register={serviceContractRegister}
            rows={contracts as unknown as RegisterRow[]}
            isLoading={loadingContracts}
          />
        </TabsContent>

        <TabsContent value="insurance">
          <RegisterPanel
            {...shared}
            register={insuranceRegister}
            rows={policies as unknown as RegisterRow[]}
            isLoading={loadingPolicies}
          />
        </TabsContent>

        <TabsContent value="utilities">
          <RegisterPanel
            {...shared}
            register={utilityRegister}
            rows={utilities as unknown as RegisterRow[]}
            isLoading={loadingUtilities}
          />
        </TabsContent>

        <TabsContent value="tax">
          <RegisterPanel
            {...shared}
            register={taxRegister}
            rows={taxes as unknown as RegisterRow[]}
            isLoading={loadingTaxes}
            renderExtraActions={(row) => (
              <TaxDatesDialog
                scheduleId={String(row.schedule_id)}
                title={row.title}
                dates={taxDates.filter((d) => d.tax_schedule_id === row.schedule_id)}
                actions={actions}
                canRecord={capabilities.canRecord && !row.archived_at}
              />
            )}
          />
        </TabsContent>

        <TabsContent value="maintenance">
          <MaintenancePanel
            companyId={companyId}
            jobs={jobs}
            commitments={commitments}
            capabilities={capabilities}
            actions={commitmentActions}
          />
        </TabsContent>

        <TabsContent value="capex">
          <CapexPanel rows={capex} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
