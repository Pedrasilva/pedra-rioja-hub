/**
 * Phase 8F.4 — closing & handover actions.
 *
 * One hook binds every closing mutation to its authenticated server function,
 * reports the outcome and invalidates the reads that depend on it.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  addClosingCondition,
  addHandoverTask,
  archiveClosingCase,
  cancelClosingCase,
  completeClosingCase,
  createClosingCase,
  createPropertyFromClosing,
  markClosingReady,
  restoreClosingCase,
  setClosingConditionStatus,
  setHandoverTaskStatus,
  updateClosingCase,
} from "./closings.functions";
import { CLOSING_KEYS } from "./queries";

export type ClosingActionName =
  | "create"
  | "update"
  | "addCondition"
  | "conditionStatus"
  | "addTask"
  | "taskStatus"
  | "markReady"
  | "complete"
  | "cancel"
  | "archive"
  | "restore"
  | "createProperty";

const SUCCESS: Record<ClosingActionName, string> = {
  create: "Closing opened",
  update: "Closing updated",
  addCondition: "Condition added",
  conditionStatus: "Condition updated",
  addTask: "Handover task added",
  taskStatus: "Handover task updated",
  markReady: "Closing marked ready",
  complete: "Closing completed",
  cancel: "Closing cancelled",
  archive: "Closing archived",
  restore: "Closing restored",
  createProperty: "Managed property created",
};

export function useClosingActions() {
  const queryClient = useQueryClient();
  const fns: Record<ClosingActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    create: useServerFn(createClosingCase) as never,
    update: useServerFn(updateClosingCase) as never,
    addCondition: useServerFn(addClosingCondition) as never,
    conditionStatus: useServerFn(setClosingConditionStatus) as never,
    addTask: useServerFn(addHandoverTask) as never,
    taskStatus: useServerFn(setHandoverTaskStatus) as never,
    markReady: useServerFn(markClosingReady) as never,
    complete: useServerFn(completeClosingCase) as never,
    cancel: useServerFn(cancelClosingCase) as never,
    archive: useServerFn(archiveClosingCase) as never,
    restore: useServerFn(restoreClosingCase) as never,
    createProperty: useServerFn(createPropertyFromClosing) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: ClosingActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of CLOSING_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: ClosingActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null) as Promise<{
        action: ClosingActionName;
        result: unknown;
      } | null>,
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type ClosingActions = ReturnType<typeof useClosingActions>;
