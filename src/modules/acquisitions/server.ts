/**
 * Phase 8F.2 — acquisition pipeline actions.
 *
 * One hook binds every acquisition mutation to its authenticated server
 * function, reports the outcome and invalidates the reads that depend on it.
 * Components never call a server function or a database RPC directly.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  archiveOpportunity,
  createAcquisitionCommitment,
  createAcquisitionTask,
  createOpportunity,
  decideAcquisitionOffer,
  linkAcquisitionCommitment,
  moveOpportunityStage,
  recordAcquisitionActivity,
  recordAcquisitionOffer,
  recordAcquisitionValuation,
  restoreOpportunity,
  setAcquisitionTaskStatus,
  unlinkAcquisitionCommitment,
  updateOpportunity,
} from "./acquisitions.functions";
import { ACQUISITION_KEYS } from "./queries";

export type AcquisitionActionName =
  | "create"
  | "update"
  | "moveStage"
  | "archive"
  | "restore"
  | "activity"
  | "createTask"
  | "taskStatus"
  | "valuation"
  | "offer"
  | "offerDecision"
  | "linkCommitment"
  | "unlinkCommitment"
  | "createCommitment";

const SUCCESS: Record<AcquisitionActionName, string> = {
  create: "Opportunity created",
  update: "Opportunity updated",
  moveStage: "Stage updated",
  archive: "Opportunity archived",
  restore: "Opportunity restored",
  activity: "Activity recorded",
  createTask: "Task added",
  taskStatus: "Task updated",
  valuation: "Valuation recorded",
  offer: "Offer recorded",
  offerDecision: "Offer decision recorded",
  linkCommitment: "Commitment linked",
  unlinkCommitment: "Commitment unlinked",
  createCommitment: "Commitment draft created",
};

export function useAcquisitionActions() {
  const queryClient = useQueryClient();
  const fns: Record<AcquisitionActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    create: useServerFn(createOpportunity) as never,
    update: useServerFn(updateOpportunity) as never,
    moveStage: useServerFn(moveOpportunityStage) as never,
    archive: useServerFn(archiveOpportunity) as never,
    restore: useServerFn(restoreOpportunity) as never,
    activity: useServerFn(recordAcquisitionActivity) as never,
    createTask: useServerFn(createAcquisitionTask) as never,
    taskStatus: useServerFn(setAcquisitionTaskStatus) as never,
    valuation: useServerFn(recordAcquisitionValuation) as never,
    offer: useServerFn(recordAcquisitionOffer) as never,
    offerDecision: useServerFn(decideAcquisitionOffer) as never,
    linkCommitment: useServerFn(linkAcquisitionCommitment) as never,
    unlinkCommitment: useServerFn(unlinkAcquisitionCommitment) as never,
    createCommitment: useServerFn(createAcquisitionCommitment) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: AcquisitionActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of ACQUISITION_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: AcquisitionActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null) as Promise<{
        action: AcquisitionActionName;
        result: unknown;
      } | null>,
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type AcquisitionActions = ReturnType<typeof useAcquisitionActions>;
