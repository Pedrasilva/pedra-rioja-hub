import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { paymentCapabilities } from "@/modules/payments/capabilities";
import { PaymentRunDetail } from "@/modules/payments/components/payment-run-detail";
import { PaymentRunDialog } from "@/modules/payments/components/payment-run-dialog";
import {
  usePaymentBatches,
  usePaymentInstructions,
  usePaymentRun,
  usePaymentRunExports,
} from "@/modules/payments/queries";
import { usePaymentActions } from "@/modules/payments/server";

export const Route = createFileRoute("/_authenticated/payments/$runId")({
  head: () => ({
    meta: [
      { title: "Payment run — Pedra Rioja execution workspace" },
      {
        name: "description",
        content:
          "One settlement session: its batches, payment instructions, bank exports and lifecycle from draft through to completion.",
      },
      { property: "og:title", content: "Payment run — Pedra Rioja execution workspace" },
      {
        property: "og:description",
        content:
          "Review the invoices in a payment run, request authority to pay, generate the bank file and record execution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentRunPage,
});

function PaymentRunPage() {
  const { runId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = paymentCapabilities(workspace?.roles);
  const actions = usePaymentActions();

  const { data: run, isLoading } = usePaymentRun(companyId, runId);
  const { data: batches = [] } = usePaymentBatches(runId);
  const { data: instructions = [] } = usePaymentInstructions(runId);
  const { data: exportRows = [] } = usePaymentRunExports(runId);

  return (
    <AppShell
      title={run ? `${run.reference} — ${run.title}` : "Payment run"}
      description="Execution orchestration only: no journal, no bank transaction, no cash-flow entry."
      actions={
        run && run.status === "draft" ? (
          <PaymentRunDialog
            companyId={companyId}
            actions={actions}
            run={run}
            disabled={!capabilities.canRecord}
          />
        ) : null
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading payment run…</p>
      ) : !run ? (
        <p className="text-sm text-muted-foreground">This payment run is not available.</p>
      ) : (
        <PaymentRunDetail
          companyId={companyId}
          run={run}
          batches={batches}
          instructions={instructions}
          exports={exportRows}
          actions={actions}
          capabilities={capabilities}
        />
      )}
    </AppShell>
  );
}
