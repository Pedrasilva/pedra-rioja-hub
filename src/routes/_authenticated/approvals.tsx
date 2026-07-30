import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { approvalCapabilities } from "@/modules/approvals/capabilities";
import { ApprovalInbox } from "@/modules/approvals/components/approval-inbox";
import { RequestViewer } from "@/modules/approvals/components/request-viewer";
import {
  useApprovalCandidates,
  useApprovalDecisions,
  useApprovalEvents,
  useApprovalMembers,
  useApprovalRequest,
  useApprovalRequests,
  useInboxAssignments,
} from "@/modules/approvals/queries";
import { useApprovalActions } from "@/modules/approvals/server";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — Pedra Rioja decision inbox" },
      {
        name: "description",
        content:
          "One inbox for every approval: commitments, schedule variances and anything else routed through the workflow engine, with the full append-only decision trail.",
      },
      { property: "og:title", content: "Approvals — Pedra Rioja decision inbox" },
      {
        property: "og:description",
        content:
          "Decide, delegate, escalate and audit approval requests across the portfolio from a single generic queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = approvalCapabilities(workspace?.roles);
  const actions = useApprovalActions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useApprovalRequests(companyId);
  const { data: assignments = [] } = useInboxAssignments(companyId);
  const { data: allCandidates = [] } = useApprovalCandidates(companyId);
  const { data: members = [] } = useApprovalMembers(companyId);

  const { data: request, isLoading: loadingRequest } = useApprovalRequest(
    companyId,
    selectedId ?? "",
  );
  const { data: decisions = [] } = useApprovalDecisions(companyId, selectedId ?? "");
  const { data: events = [] } = useApprovalEvents(companyId, selectedId ?? "");
  const candidates = allCandidates.filter((c) => c.request_id === selectedId);

  return (
    <AppShell
      title="Approvals"
      description="Who decided what, when, and under which rule — recorded once and never rewritten."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <ApprovalInbox
          requests={requests}
          assignments={assignments}
          candidates={allCandidates}
          capabilities={capabilities}
          userId={workspace?.userId}
          actions={actions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          isLoading={isLoading}
        />
        {selectedId ? (
          <RequestViewer
            request={request}
            decisions={decisions}
            events={events}
            candidates={candidates}
            members={members}
            capabilities={capabilities}
            userId={workspace?.userId}
            actions={actions}
            isLoading={loadingRequest}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a request to see its snapshot, approvers and decision trail.
          </p>
        )}
      </div>
    </AppShell>
  );
}
