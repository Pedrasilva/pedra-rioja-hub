/**
 * Phase 8B — operational actions.
 *
 * One hook binding every operational mutation to its authenticated server
 * function, reporting the outcome and invalidating the reads that depend on
 * it. Components never call a server function or an RPC directly, so the whole
 * write surface of the module stays visible in this file.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  addTaxScheduleDate,
  archiveOperationalRecord,
  createInsurancePolicy,
  createObligation,
  createOperationalCommitment,
  createServiceContract,
  createTaxSchedule,
  createUtilityContract,
  generateOperationalReminders,
  linkOperationalCommitment,
  resolveOperationalReminder,
  updateInsurancePolicy,
  updateObligation,
  updateServiceContract,
  updateTaxSchedule,
  updateUtilityContract,
  upsertOperationalReminder,
} from "./operations.functions";
import { OPERATIONS_KEYS } from "./queries";

export type OperationsActionName =
  | "createObligation"
  | "updateObligation"
  | "createServiceContract"
  | "updateServiceContract"
  | "createInsurancePolicy"
  | "updateInsurancePolicy"
  | "createUtilityContract"
  | "updateUtilityContract"
  | "createTaxSchedule"
  | "updateTaxSchedule"
  | "addTaxDate"
  | "archive"
  | "linkCommitment"
  | "createCommitment"
  | "upsertReminder"
  | "resolveReminder"
  | "generateReminders";

const SUCCESS: Record<OperationsActionName, string> = {
  createObligation: "Obligation created",
  updateObligation: "Obligation updated",
  createServiceContract: "Service contract created",
  updateServiceContract: "Service contract updated",
  createInsurancePolicy: "Insurance policy created",
  updateInsurancePolicy: "Insurance policy updated",
  createUtilityContract: "Utility contract created",
  updateUtilityContract: "Utility contract updated",
  createTaxSchedule: "Tax schedule created",
  updateTaxSchedule: "Tax schedule updated",
  addTaxDate: "Due date added",
  archive: "Record archived",
  linkCommitment: "Commitment link updated",
  createCommitment: "Draft commitment created and linked",
  upsertReminder: "Reminder saved",
  resolveReminder: "Reminder updated",
  generateReminders: "Reminders refreshed",
};

export function useOperationsActions() {
  const queryClient = useQueryClient();
  const fns: Record<OperationsActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    createObligation: useServerFn(createObligation) as never,
    updateObligation: useServerFn(updateObligation) as never,
    createServiceContract: useServerFn(createServiceContract) as never,
    updateServiceContract: useServerFn(updateServiceContract) as never,
    createInsurancePolicy: useServerFn(createInsurancePolicy) as never,
    updateInsurancePolicy: useServerFn(updateInsurancePolicy) as never,
    createUtilityContract: useServerFn(createUtilityContract) as never,
    updateUtilityContract: useServerFn(updateUtilityContract) as never,
    createTaxSchedule: useServerFn(createTaxSchedule) as never,
    updateTaxSchedule: useServerFn(updateTaxSchedule) as never,
    addTaxDate: useServerFn(addTaxScheduleDate) as never,
    archive: useServerFn(archiveOperationalRecord) as never,
    linkCommitment: useServerFn(linkOperationalCommitment) as never,
    createCommitment: useServerFn(createOperationalCommitment) as never,
    upsertReminder: useServerFn(upsertOperationalReminder) as never,
    resolveReminder: useServerFn(resolveOperationalReminder) as never,
    generateReminders: useServerFn(generateOperationalReminders) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: OperationsActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of OPERATIONS_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: OperationsActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null),
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type OperationsActions = ReturnType<typeof useOperationsActions>;
