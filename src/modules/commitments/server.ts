/**
 * Phase 8A — commitment actions.
 *
 * One hook that binds every commitment mutation to its authenticated server
 * function, reports the outcome and invalidates the reads that depend on it.
 * Components never call a server function or a database RPC directly, which
 * keeps the whole write surface of the module visible in this file.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  activateCommitment,
  activateScheduleVersion,
  approveCommitment,
  approveScheduleVariance,
  archiveCommitment,
  completeCommitment,
  createCommitmentDraft,
  createDrawdown,
  createMaintenanceJob,
  createScheduleVersion,
  rejectCommitment,
  requestCommitmentApproval,
  reverseDrawdown,
  updateCommitmentDraft,
  updateMaintenanceJob,
} from "./commitments.functions";
import { COMMITMENT_KEYS } from "./queries";

export type CommitmentActionName =
  | "createDraft"
  | "updateDraft"
  | "requestApproval"
  | "approve"
  | "reject"
  | "activate"
  | "complete"
  | "archive"
  | "createVersion"
  | "activateVersion"
  | "approveVariance"
  | "createDrawdown"
  | "reverseDrawdown"
  | "createJob"
  | "updateJob";

const SUCCESS: Record<CommitmentActionName, string> = {
  createDraft: "Commitment draft created",
  updateDraft: "Commitment updated",
  requestApproval: "Approval requested",
  approve: "Commitment approved",
  reject: "Commitment rejected",
  activate: "Commitment activated",
  complete: "Commitment completed",
  archive: "Commitment archived",
  createVersion: "Schedule version created",
  activateVersion: "Schedule version activated",
  approveVariance: "Variance approved",
  createDrawdown: "Drawdown recorded",
  reverseDrawdown: "Drawdown reversed",
  createJob: "Maintenance job created",
  updateJob: "Maintenance job updated",
};

export function useCommitmentActions() {
  const queryClient = useQueryClient();
  const fns: Record<CommitmentActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    createDraft: useServerFn(createCommitmentDraft) as never,
    updateDraft: useServerFn(updateCommitmentDraft) as never,
    requestApproval: useServerFn(requestCommitmentApproval) as never,
    approve: useServerFn(approveCommitment) as never,
    reject: useServerFn(rejectCommitment) as never,
    activate: useServerFn(activateCommitment) as never,
    complete: useServerFn(completeCommitment) as never,
    archive: useServerFn(archiveCommitment) as never,
    createVersion: useServerFn(createScheduleVersion) as never,
    activateVersion: useServerFn(activateScheduleVersion) as never,
    approveVariance: useServerFn(approveScheduleVariance) as never,
    createDrawdown: useServerFn(createDrawdown) as never,
    reverseDrawdown: useServerFn(reverseDrawdown) as never,
    createJob: useServerFn(createMaintenanceJob) as never,
    updateJob: useServerFn(updateMaintenanceJob) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: CommitmentActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of COMMITMENT_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: CommitmentActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null),
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type CommitmentActions = ReturnType<typeof useCommitmentActions>;
