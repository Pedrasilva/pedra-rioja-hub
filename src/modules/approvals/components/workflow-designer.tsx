/**
 * Phase 8C — workflow designer.
 *
 * Draft versions are editable; published versions are read-only, because the
 * database refuses to change them and the UI must not suggest otherwise. A
 * change is always a new draft version, published in turn, so in-flight
 * requests keep the rules they were submitted under.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import type { ApprovalCapabilities } from "@/modules/approvals/capabilities";
import { ASSIGNEE_TYPES, labelOf, STEP_RULES } from "@/modules/approvals/schemas";
import type { ApprovalActions } from "@/modules/approvals/server";
import type {
  ApprovalMemberRow,
  ApprovalStepAssignmentRow,
  ApprovalWorkflowOverviewRow,
  ApprovalWorkflowStepRow,
  ApprovalWorkflowVersionRow,
} from "@/modules/approvals/types";
import { ApprovalStatusBadge } from "./status-badge";

const ROLES = ["owner", "manager", "bookkeeper", "assistant", "approver", "viewer"];

export function WorkflowDesigner({
  workflows,
  selectedWorkflowId,
  onSelectWorkflow,
  versions,
  selectedVersionId,
  onSelectVersion,
  steps,
  assignments,
  members,
  capabilities,
  actions,
  isLoading,
}: {
  workflows: ApprovalWorkflowOverviewRow[];
  selectedWorkflowId: string | null;
  onSelectWorkflow: (id: string) => void;
  versions: ApprovalWorkflowVersionRow[];
  selectedVersionId: string | null;
  onSelectVersion: (id: string) => void;
  steps: ApprovalWorkflowStepRow[];
  assignments: ApprovalStepAssignmentRow[];
  members: ApprovalMemberRow[];
  capabilities: ApprovalCapabilities;
  actions: ApprovalActions | undefined;
  isLoading?: boolean;
}) {
  const [stepName, setStepName] = useState("");
  const [rule, setRule] = useState<string>("any_one");
  const [quorum, setQuorum] = useState("2");
  const [minAmount, setMinAmount] = useState("");
  const [assigneeType, setAssigneeType] = useState<string>("role");
  const [assigneeRole, setAssigneeRole] = useState<string>("approver");
  const [assigneeUser, setAssigneeUser] = useState<string>("");
  const [assignStepId, setAssignStepId] = useState<string>("");

  if (!capabilities.canView) {
    return (
      <p role="note" className="text-sm text-destructive">
        You do not have permission to view approval workflows.
      </p>
    );
  }

  const version = versions.find((v) => v.id === selectedVersionId) ?? null;
  const editable = Boolean(version && version.status === "draft" && capabilities.canConfigure);
  const canRun = Boolean(actions) && capabilities.canConfigure;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Workflows</CardTitle>
          <CardDescription>
            One workflow per target type and routing rule. Publishing freezes a version.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading workflows…
            </p>
          ) : workflows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workflow has been defined yet.</p>
          ) : (
            <ul aria-label="Workflows" className="space-y-2">
              {workflows.map((w) => (
                <li key={w.workflow_id ?? w.id}>
                  <button
                    type="button"
                    onClick={() => onSelectWorkflow(w.workflow_id ?? w.id)}
                    aria-current={
                      selectedWorkflowId === (w.workflow_id ?? w.id) ? "true" : undefined
                    }
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      selectedWorkflowId === (w.workflow_id ?? w.id)
                        ? "border-primary"
                        : "border-border"
                    }`}
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{w.name}</span>
                      <ApprovalStatusBadge status={w.status} />
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
                      <span>{labelOf(w.target_type)}</span>
                      <span>{w.step_count} steps</span>
                      <span>{w.pending_count} pending</span>
                      {w.is_system ? <span>System</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedWorkflowId ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Versions</CardTitle>
                <CardDescription>
                  In-flight requests keep the version they were submitted under.
                </CardDescription>
              </div>
              {canRun ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actions!.isPending}
                  onClick={() =>
                    actions!.run("createVersion", { workflowId: selectedWorkflowId })
                  }
                >
                  New draft version
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">This workflow has no version yet.</p>
            ) : (
              <ul aria-label="Workflow versions" className="space-y-2">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <button
                      type="button"
                      className="font-medium underline"
                      aria-current={selectedVersionId === v.id ? "true" : undefined}
                      onClick={() => onSelectVersion(v.id)}
                    >
                      Version {v.version_no}
                    </button>
                    <ApprovalStatusBadge status={v.status} />
                    <span className="text-muted-foreground">
                      {v.published_at ? `Published ${formatDate(v.published_at)}` : "Draft"}
                    </span>
                    {v.status === "draft" && capabilities.canPublish && actions ? (
                      <Button
                        size="sm"
                        disabled={actions.isPending}
                        onClick={() => actions.run("publishVersion", { versionId: v.id })}
                      >
                        Publish
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {selectedVersionId ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Steps</CardTitle>
            <CardDescription>
              {editable
                ? "Draft version — steps and approvers can still be changed."
                : "Published version — steps are frozen. Create a new draft to change them."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No step has been defined yet.</p>
            ) : (
              <ul aria-label="Workflow steps" className="space-y-2">
                {steps.map((s) => {
                  const stepAssignments = assignments.filter((a) => a.step_id === s.id);
                  return (
                    <li key={s.id} className="rounded-md border border-border px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {s.step_no}. {s.name}
                        </span>
                        <span className="text-muted-foreground">
                          {labelOf(s.rule)}
                          {s.rule === "quorum" ? ` (${s.quorum_count ?? 0})` : ""}
                        </span>
                        {editable && actions ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actions.isPending}
                            onClick={() => actions.run("deleteStep", { stepId: s.id })}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {s.min_amount != null ? `From ${s.min_amount} ` : ""}
                        {s.max_amount != null ? `up to ${s.max_amount} ` : ""}
                        {s.allow_self_approval ? "Self-approval allowed" : "Self-approval blocked"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {stepAssignments.length === 0
                          ? "No approver assigned — this step will fail closed."
                          : stepAssignments
                              .map((a) =>
                                a.assignee_type === "user"
                                  ? (members.find((m) => m.user_id === a.user_id)?.full_name ??
                                    a.user_id ??
                                    "user")
                                  : `${labelOf(a.assignee_type)}: ${labelOf(
                                      a.role ?? a.capability ?? a.candidate_source,
                                    )}`,
                              )
                              .join(", ")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            {editable && actions ? (
              <>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="step-name">Step name</Label>
                    <Input
                      id="step-name"
                      value={stepName}
                      onChange={(e) => setStepName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="step-rule">Rule</Label>
                    <Select value={rule} onValueChange={setRule}>
                      <SelectTrigger id="step-rule">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_RULES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {labelOf(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {rule === "quorum" ? (
                    <div className="space-y-1">
                      <Label htmlFor="step-quorum">Quorum</Label>
                      <Input
                        id="step-quorum"
                        type="number"
                        min={1}
                        value={quorum}
                        onChange={(e) => setQuorum(e.target.value)}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <Label htmlFor="step-min">Applies from amount</Label>
                    <Input
                      id="step-min"
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="Leave empty for any amount"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={actions.isPending || stepName.trim().length < 2}
                  onClick={() =>
                    actions.run("upsertStep", {
                      versionId: selectedVersionId,
                      stepNo: steps.length + 1,
                      name: stepName.trim(),
                      rule,
                      quorumCount: rule === "quorum" ? Number(quorum) : null,
                      minAmount: minAmount === "" ? null : Number(minAmount),
                    })
                  }
                >
                  Add step
                </Button>

                <Separator />
                <p className="text-sm font-medium">Assign an approver</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="assign-step">Step</Label>
                    <Select value={assignStepId} onValueChange={setAssignStepId}>
                      <SelectTrigger id="assign-step">
                        <SelectValue placeholder="Select a step" />
                      </SelectTrigger>
                      <SelectContent>
                        {steps.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.step_no}. {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="assign-type">Assignee type</Label>
                    <Select value={assigneeType} onValueChange={setAssigneeType}>
                      <SelectTrigger id="assign-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNEE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {labelOf(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {assigneeType === "role" ? (
                    <div className="space-y-1">
                      <Label htmlFor="assign-role">Role</Label>
                      <Select value={assigneeRole} onValueChange={setAssigneeRole}>
                        <SelectTrigger id="assign-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {labelOf(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  {assigneeType === "user" ? (
                    <div className="space-y-1">
                      <Label htmlFor="assign-user">Person</Label>
                      <Select value={assigneeUser} onValueChange={setAssigneeUser}>
                        <SelectTrigger id="assign-user">
                          <SelectValue placeholder="Select a person" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.full_name ?? m.email ?? m.user_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  disabled={
                    actions.isPending ||
                    !assignStepId ||
                    (assigneeType === "user" && !assigneeUser)
                  }
                  onClick={() =>
                    actions.run("setAssignment", {
                      stepId: assignStepId,
                      assigneeType,
                      userId: assigneeType === "user" ? assigneeUser : null,
                      role: assigneeType === "role" ? assigneeRole : null,
                    })
                  }
                >
                  Add approver
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
