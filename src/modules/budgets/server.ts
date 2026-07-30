/**
 * Phase 8D — budget actions.
 *
 * One hook binding every budget mutation to its authenticated server
 * function. Components never call a server function or an RPC directly.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  archiveBudget,
  archiveBudgetVersion,
  createBudget,
  createBudgetVersion,
  deleteBudgetLine,
  publishBudgetVersion,
  requestBudgetVersionApproval,
  updateBudget,
  upsertBudgetLine,
} from "./budgets.functions";
import { BUDGET_KEYS } from "./queries";

export type BudgetActionName =
  | "createBudget"
  | "updateBudget"
  | "createVersion"
  | "upsertLine"
  | "deleteLine"
  | "publishVersion"
  | "archiveVersion"
  | "archiveBudget"
  | "requestApproval";

const SUCCESS: Record<BudgetActionName, string> = {
  createBudget: "Budget created with a draft version",
  updateBudget: "Budget updated",
  createVersion: "Draft version created",
  upsertLine: "Budget line saved",
  deleteLine: "Budget line removed",
  publishVersion: "Version published and locked",
  archiveVersion: "Version archived",
  archiveBudget: "Budget archived",
  requestApproval: "Version sent for approval",
};

export function useBudgetActions() {
  const queryClient = useQueryClient();
  const fns: Record<BudgetActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    createBudget: useServerFn(createBudget) as never,
    updateBudget: useServerFn(updateBudget) as never,
    createVersion: useServerFn(createBudgetVersion) as never,
    upsertLine: useServerFn(upsertBudgetLine) as never,
    deleteLine: useServerFn(deleteBudgetLine) as never,
    publishVersion: useServerFn(publishBudgetVersion) as never,
    archiveVersion: useServerFn(archiveBudgetVersion) as never,
    archiveBudget: useServerFn(archiveBudget) as never,
    requestApproval: useServerFn(requestBudgetVersionApproval) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: BudgetActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of BUDGET_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: BudgetActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null),
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type BudgetActions = ReturnType<typeof useBudgetActions>;
