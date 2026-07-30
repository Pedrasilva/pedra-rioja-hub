/**
 * Phase 8C — approval actions.
 *
 * One hook binds every approval mutation to its authenticated server function,
 * reports the outcome and invalidates the canonical reads. Components never
 * call a server function, an RPC or a domain table directly, so the whole
 * privileged write surface of the module is visible in this file.
 *
 * Nothing here fakes a terminal state: the mutation resolves, the canonical
 * views are re-fetched, and the UI renders whatever the engine decided.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  archiveApprovalWorkflow,
  createApprovalWorkflow,
  createApprovalWorkflowVersion,
  deleteApprovalWorkflowStep,
  publishApprovalWorkflowVersion,
  recordApprovalDecision,
  retryApprovalCallback,
  runApprovalMaintenance,
  setApprovalStepAssignment,
  submitApprovalRequest,
  upsertApprovalWorkflowStep,
  withdrawApprovalRequest,
} from "./approvals.functions";
import { APPROVAL_KEYS } from "./queries";

export type ApprovalActionName =
  | "createWorkflow"
  | "archiveWorkflow"
  | "createVersion"
  | "upsertStep"
  | "deleteStep"
  | "setAssignment"
  | "publishVersion"
  | "submitRequest"
  | "recordDecision"
  | "withdrawRequest"
  | "retryCallback"
  | "runMaintenance";

const SUCCESS: Record<ApprovalActionName, string> = {
  createWorkflow: "Workflow created",
  archiveWorkflow: "Workflow archived",
  createVersion: "Draft version created",
  upsertStep: "Step saved",
  deleteStep: "Step removed",
  setAssignment: "Assignment saved",
  publishVersion: "Version published",
  submitRequest: "Approval requested",
  recordDecision: "Decision recorded",
  withdrawRequest: "Request withdrawn",
  retryCallback: "Callback retried",
  runMaintenance: "Approval maintenance run",
};

export function useApprovalActions() {
  const queryClient = useQueryClient();
  const fns: Record<ApprovalActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    createWorkflow: useServerFn(createApprovalWorkflow) as never,
    archiveWorkflow: useServerFn(archiveApprovalWorkflow) as never,
    createVersion: useServerFn(createApprovalWorkflowVersion) as never,
    upsertStep: useServerFn(upsertApprovalWorkflowStep) as never,
    deleteStep: useServerFn(deleteApprovalWorkflowStep) as never,
    setAssignment: useServerFn(setApprovalStepAssignment) as never,
    publishVersion: useServerFn(publishApprovalWorkflowVersion) as never,
    submitRequest: useServerFn(submitApprovalRequest) as never,
    recordDecision: useServerFn(recordApprovalDecision) as never,
    withdrawRequest: useServerFn(withdrawApprovalRequest) as never,
    retryCallback: useServerFn(retryApprovalCallback) as never,
    runMaintenance: useServerFn(runApprovalMaintenance) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: ApprovalActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: async ({ action }) => {
      toast.success(SUCCESS[action]);
      // Re-read from the canonical views before anything is rendered as final.
      await Promise.all(
        APPROVAL_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      );
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: ApprovalActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).then(
        (r) => r.result,
        () => null,
      ),
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type ApprovalActions = ReturnType<typeof useApprovalActions>;

/** Fail-closed guard: an action context must exist before anything renders. */
export function requireActions(actions: ApprovalActions | undefined): ApprovalActions | null {
  return actions && typeof actions.run === "function" ? actions : null;
}
