import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/hooks/use-workspace";
import { PedraRiojaBookkeepingProvider } from "@/modules/bookkeeping/host/provider";
import { capabilitiesFor } from "@/modules/bookkeeping/host/roles";
import {
  BankRulesPanel,
  ClassificationsPanel,
  CounterpartiesPanel,
  DocumentsPanel,
  PeriodsPanel,
} from "@/packages/bookkeeping-core";

export const Route = createFileRoute("/_authenticated/bookkeeping")({
  head: () => ({
    meta: [
      { title: "Bookkeeping — purchases, sales and settlement" },
      {
        name: "description",
        content:
          "Record supplier and client documents with Portuguese fiscal metadata, settle them against bank movements, and review VAT periods.",
      },
      { property: "og:title", content: "Bookkeeping — purchases, sales and settlement" },
      {
        property: "og:description",
        content:
          "Counterparties, purchase and sale documents, classification tree, bank classification rules and period totals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: validateWorkspaceSearch,
  component: BookkeepingPage,
});

function BookkeepingPage() {
  return (
    <PedraRiojaBookkeepingProvider>
      <BookkeepingWorkspace />
    </PedraRiojaBookkeepingProvider>
  );
}

function BookkeepingWorkspace() {
  const { data: workspace, isLoading } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = capabilitiesFor(workspace?.roles);

  return (
    <AppShell
      title="Bookkeeping"
      description="Operational bookkeeping: documents, settlement and VAT periods. Amounts stay owned by their source module."
    >
      <div className="space-y-6">


        {!companyId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isLoading ? "Loading workspace…" : "No company in this workspace"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Bookkeeping needs a company before documents can be recorded.
            </CardContent>
          </Card>
        ) : !capabilities.canView ? (
          <Alert>
            <AlertTitle>No bookkeeping access</AlertTitle>
            <AlertDescription>
              Your role does not include access to the bookkeeping workspace.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="counterparties">Counterparties</TabsTrigger>
              <TabsTrigger value="classifications">Classifications</TabsTrigger>
              <TabsTrigger value="rules">Bank rules</TabsTrigger>
              <TabsTrigger value="periods">Periods</TabsTrigger>
            </TabsList>

            <TabsContent value="purchases" className="mt-4">
              <DocumentsPanel
                companyId={companyId}
                direction="inbound"
                capabilities={capabilities}
              />
            </TabsContent>
            <TabsContent value="sales" className="mt-4">
              <DocumentsPanel
                companyId={companyId}
                direction="outbound"
                capabilities={capabilities}
              />
            </TabsContent>
            <TabsContent value="counterparties" className="mt-4">
              <CounterpartiesPanel companyId={companyId} capabilities={capabilities} />
            </TabsContent>
            <TabsContent value="classifications" className="mt-4">
              <ClassificationsPanel companyId={companyId} capabilities={capabilities} />
            </TabsContent>
            <TabsContent value="rules" className="mt-4">
              <BankRulesPanel companyId={companyId} capabilities={capabilities} />
            </TabsContent>
            <TabsContent value="periods" className="mt-4">
              <PeriodsPanel companyId={companyId} capabilities={capabilities} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
