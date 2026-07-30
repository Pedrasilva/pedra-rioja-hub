/**
 * Phase 8D — preventive maintenance actions.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  archiveMaintenanceSchedule,
  generateMaintenanceJobs,
  recordInspectionEvidence,
  upsertMaintenanceSchedule,
} from "./maintenance.functions";
import { MAINTENANCE_KEYS } from "./queries";

export type MaintenanceActionName =
  | "upsertSchedule"
  | "archiveSchedule"
  | "generateJobs"
  | "recordEvidence";

const SUCCESS: Record<MaintenanceActionName, string> = {
  upsertSchedule: "Maintenance schedule saved",
  archiveSchedule: "Maintenance schedule archived",
  generateJobs: "Planned jobs generated",
  recordEvidence: "Inspection evidence recorded",
};

export function useMaintenanceActions() {
  const queryClient = useQueryClient();
  const fns: Record<MaintenanceActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    upsertSchedule: useServerFn(upsertMaintenanceSchedule) as never,
    archiveSchedule: useServerFn(archiveMaintenanceSchedule) as never,
    generateJobs: useServerFn(generateMaintenanceJobs) as never,
    recordEvidence: useServerFn(recordInspectionEvidence) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: MaintenanceActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of MAINTENANCE_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: MaintenanceActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null),
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type MaintenanceActions = ReturnType<typeof useMaintenanceActions>;
