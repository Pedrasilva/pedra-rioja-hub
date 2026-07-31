/**
 * Phase 8F.3 — due-diligence actions.
 *
 * One hook binds every diligence mutation to its authenticated server
 * function, reports the outcome and invalidates the reads that depend on it.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  addDiligenceItem,
  addDiligenceTemplateItem,
  archiveDiligenceCase,
  archiveDiligenceTemplate,
  completeDiligenceCase,
  createDiligenceCase,
  createDiligenceTemplate,
  restoreDiligenceCase,
  setDiligenceCaseStatus,
  setDiligenceItemStatus,
  updateDiligenceCase,
} from "./diligence.functions";
import { DILIGENCE_KEYS } from "./queries";

export type DiligenceActionName =
  | "createCase"
  | "updateCase"
  | "addItem"
  | "itemStatus"
  | "caseStatus"
  | "complete"
  | "archive"
  | "restore"
  | "createTemplate"
  | "addTemplateItem"
  | "archiveTemplate";

const SUCCESS: Record<DiligenceActionName, string> = {
  createCase: "Due-diligence case opened",
  updateCase: "Case updated",
  addItem: "Checklist item added",
  itemStatus: "Checklist item updated",
  caseStatus: "Case status updated",
  complete: "Due diligence completed",
  archive: "Case archived",
  restore: "Case restored",
  createTemplate: "Template created",
  addTemplateItem: "Template item added",
  archiveTemplate: "Template archived",
};

export function useDiligenceActions() {
  const queryClient = useQueryClient();
  const fns: Record<DiligenceActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    createCase: useServerFn(createDiligenceCase) as never,
    updateCase: useServerFn(updateDiligenceCase) as never,
    addItem: useServerFn(addDiligenceItem) as never,
    itemStatus: useServerFn(setDiligenceItemStatus) as never,
    caseStatus: useServerFn(setDiligenceCaseStatus) as never,
    complete: useServerFn(completeDiligenceCase) as never,
    archive: useServerFn(archiveDiligenceCase) as never,
    restore: useServerFn(restoreDiligenceCase) as never,
    createTemplate: useServerFn(createDiligenceTemplate) as never,
    addTemplateItem: useServerFn(addDiligenceTemplateItem) as never,
    archiveTemplate: useServerFn(archiveDiligenceTemplate) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: DiligenceActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of DILIGENCE_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: DiligenceActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null) as Promise<{
        action: DiligenceActionName;
        result: unknown;
      } | null>,
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type DiligenceActions = ReturnType<typeof useDiligenceActions>;
