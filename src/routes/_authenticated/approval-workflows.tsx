import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/hooks/use-workspace";
import { approvalCapabilities } from "@/modules/approvals/capabilities";
import { WorkflowDesigner } from "@/modules/approvals/components/workflow-designer";
import {
  useApprovalMembers,
  useApprovalTargetTypes,
  useApprovalWorkflows,
  useStepAssignments,
  useWorkflowSteps,
  useWorkflowVersions,
} from "@/modules/approvals/queries";
import { useApprovalActions } from "@/modules/approvals/server";

export const Route = createFileRoute("/_authenticated/approval-workflows")({
  head: () => ({
    meta: [
      { title: "Approval workflows — Pedra Rioja rule design" },
      {
        name: "description",
        content:
          "Design approval routing: sequential and parallel steps, any-one, unanimous and quorum rules, amount thresholds and versioned publication.",
      },
      { property: "og:title", content: "Approval workflows — Pedra Rioja rule design" },
      {
        property: "og:description",
        content:
          "Draft, publish and version the rules that decide who authorises spend, and keep in-flight requests on the rules they started under.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = approvalCapabilities(workspace?.roles);
  const actions = useApprovalActions();

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [targetType, setTargetType] = useState("commitment");

  const { data: workflows = [], isLoading } = useApprovalWorkflows(companyId);
  const { data: versions = [] } = useWorkflowVersions(companyId, workflowId ?? "");
  const { data: steps = [] } = useWorkflowSteps(companyId, versionId ?? undefined);
  const { data: assignments = [] } = useStepAssignments(
    companyId,
    steps.map((s) => s.id),
  );
  const { data: members = [] } = useApprovalMembers(companyId);
  const { data: targetTypes = [] } = useApprovalTargetTypes();

  return (
    <AppShell
      title="Approval workflows"
      description="The standing rules behind every decision, versioned so history stays honest."
      actions={
        capabilities.canConfigure ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">New workflow</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New approval workflow</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="wf-name">Name</Label>
                  <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wf-code">Code</Label>
                  <Input id="wf-code" value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wf-target">Target type</Label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger id="wf-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetTypes.map((t) => (
                        <SelectItem key={t.target_type} value={t.target_type}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  disabled={actions.isPending || name.trim().length < 2 || code.trim().length < 2}
                  onClick={async () => {
                    await actions.run("createWorkflow", {
                      companyId,
                      code: code.trim(),
                      name: name.trim(),
                      targetType,
                    });
                    setOpen(false);
                    setName("");
                    setCode("");
                  }}
                >
                  Create draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      <WorkflowDesigner
        workflows={workflows}
        selectedWorkflowId={workflowId}
        onSelectWorkflow={(id) => {
          setWorkflowId(id);
          setVersionId(null);
        }}
        versions={versions}
        selectedVersionId={versionId}
        onSelectVersion={setVersionId}
        steps={steps}
        assignments={assignments}
        members={members}
        capabilities={capabilities}
        actions={actions}
        isLoading={isLoading}
      />
    </AppShell>
  );
}
