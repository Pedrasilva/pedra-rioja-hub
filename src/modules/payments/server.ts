/**
 * Phase 8F.1 — payment execution actions.
 *
 * One hook binds every payment mutation to its authenticated server function,
 * reports the outcome and invalidates the reads that depend on it. Components
 * never call a server function or a database RPC directly.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  addPaymentInstruction,
  archivePaymentRun,
  cancelPaymentRun,
  completePaymentRun,
  createPaymentRun,
  executePaymentRun,
  exportPaymentRun,
  failPaymentInstruction,
  removePaymentInstruction,
  requestPaymentRunApproval,
  updatePaymentInstruction,
  updatePaymentRun,
} from "./payments.functions";
import { PAYMENT_KEYS } from "./queries";

export type PaymentActionName =
  | "createRun"
  | "updateRun"
  | "addInstruction"
  | "updateInstruction"
  | "removeInstruction"
  | "failInstruction"
  | "requestApproval"
  | "export"
  | "execute"
  | "complete"
  | "cancel"
  | "archive";

const SUCCESS: Record<PaymentActionName, string> = {
  createRun: "Payment run created",
  updateRun: "Payment run updated",
  addInstruction: "Document added to the run",
  updateInstruction: "Instruction updated",
  removeInstruction: "Document removed from the run",
  failInstruction: "Payment marked as failed",
  requestApproval: "Authority to pay requested",
  export: "Bank file generated",
  execute: "Payment run executed",
  complete: "Payment run completed",
  cancel: "Payment run cancelled",
  archive: "Payment run archived",
};

export function usePaymentActions() {
  const queryClient = useQueryClient();
  const fns: Record<PaymentActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    createRun: useServerFn(createPaymentRun) as never,
    updateRun: useServerFn(updatePaymentRun) as never,
    addInstruction: useServerFn(addPaymentInstruction) as never,
    updateInstruction: useServerFn(updatePaymentInstruction) as never,
    removeInstruction: useServerFn(removePaymentInstruction) as never,
    failInstruction: useServerFn(failPaymentInstruction) as never,
    requestApproval: useServerFn(requestPaymentRunApproval) as never,
    export: useServerFn(exportPaymentRun) as never,
    execute: useServerFn(executePaymentRun) as never,
    complete: useServerFn(completePaymentRun) as never,
    cancel: useServerFn(cancelPaymentRun) as never,
    archive: useServerFn(archivePaymentRun) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: PaymentActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of PAYMENT_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: PaymentActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null),
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type PaymentActions = ReturnType<typeof usePaymentActions>;
