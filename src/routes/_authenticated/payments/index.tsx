import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { paymentCapabilities } from "@/modules/payments/capabilities";
import { PaymentRunDialog } from "@/modules/payments/components/payment-run-dialog";
import { PaymentRunList } from "@/modules/payments/components/payment-run-list";
import { usePaymentRuns } from "@/modules/payments/queries";
import { usePaymentActions } from "@/modules/payments/server";

export const Route = createFileRoute("/_authenticated/payments/")({
  head: () => ({
    meta: [
      { title: "Payment runs — Pedra Rioja settlement sessions" },
      {
        name: "description",
        content:
          "Group approved supplier invoices into payment runs, request authority to pay, generate the bank file and record execution.",
      },
      { property: "og:title", content: "Payment runs — Pedra Rioja settlement sessions" },
      {
        property: "og:description",
        content:
          "The financial execution layer: batches, payment instructions, bank exports and the audit trail behind every settlement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = paymentCapabilities(workspace?.roles);
  const actions = usePaymentActions();
  const { data: rows = [], isLoading } = usePaymentRuns(companyId);
  const navigate = Route.useNavigate();

  return (
    <AppShell
      title="Payments"
      description="Settlement sessions between approved invoices and the bank. Runs orchestrate execution; they never own an accounting value."
      actions={
        <PaymentRunDialog
          companyId={companyId}
          actions={actions}
          disabled={!capabilities.canRecord}
          onCreated={(id) => navigate({ to: "/payments/$runId", params: { runId: id } })}
        />
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading payment runs…</p>
      ) : (
        <PaymentRunList rows={rows} />
      )}
    </AppShell>
  );
}
