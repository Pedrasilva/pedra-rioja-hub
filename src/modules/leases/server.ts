/**
 * Phase 8E — lease, tenant and occupancy actions.
 *
 * One hook binds every mutation to its authenticated server function, reports
 * the outcome and invalidates the reads that depend on it. Components never
 * call a server function or a database RPC directly.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  activateLeaseVersion,
  applyLeaseReview,
  archiveLease,
  archiveTenant,
  createLease,
  createLeaseVersion,
  generateLeaseReminders,
  recordLeaseNotice,
  setLeaseCharges,
  setLeaseTenants,
  setLeaseUnits,
  setUnitOccupancy,
  terminateLease,
  updateLease,
  updateLeaseVersion,
  updateVacancyPeriod,
  upsertLeaseBreak,
  upsertLeaseReview,
  upsertTenant,
  upsertTenantContact,
} from "./leases.functions";
import { LEASE_KEYS } from "./queries";

export type LeaseActionName =
  | "createLease"
  | "updateLease"
  | "updateVersion"
  | "createVersion"
  | "activateVersion"
  | "setUnits"
  | "setTenants"
  | "setCharges"
  | "upsertReview"
  | "applyReview"
  | "upsertBreak"
  | "recordNotice"
  | "terminate"
  | "archiveLease"
  | "upsertTenant"
  | "upsertContact"
  | "archiveTenant"
  | "setOccupancy"
  | "updateVacancy"
  | "generateReminders";

const SUCCESS: Record<LeaseActionName, string> = {
  createLease: "Lease created as a draft",
  updateLease: "Lease updated",
  updateVersion: "Draft version updated",
  createVersion: "New lease version created",
  activateVersion: "Lease version activated",
  setUnits: "Demise updated",
  setTenants: "Tenant assignment updated",
  setCharges: "Charge schedule updated",
  upsertReview: "Rent review saved",
  applyReview: "Rent review applied to a new draft version",
  upsertBreak: "Break clause saved",
  recordNotice: "Notice recorded",
  terminate: "Lease closed",
  archiveLease: "Lease archived",
  upsertTenant: "Tenant saved",
  upsertContact: "Contact saved",
  archiveTenant: "Tenant archived",
  setOccupancy: "Occupancy updated",
  updateVacancy: "Vacancy updated",
  generateReminders: "Lease reminders generated",
};

export function useLeaseActions() {
  const queryClient = useQueryClient();
  const fns: Record<LeaseActionName, (opts: { data: unknown }) => Promise<unknown>> = {
    createLease: useServerFn(createLease) as never,
    updateLease: useServerFn(updateLease) as never,
    updateVersion: useServerFn(updateLeaseVersion) as never,
    createVersion: useServerFn(createLeaseVersion) as never,
    activateVersion: useServerFn(activateLeaseVersion) as never,
    setUnits: useServerFn(setLeaseUnits) as never,
    setTenants: useServerFn(setLeaseTenants) as never,
    setCharges: useServerFn(setLeaseCharges) as never,
    upsertReview: useServerFn(upsertLeaseReview) as never,
    applyReview: useServerFn(applyLeaseReview) as never,
    upsertBreak: useServerFn(upsertLeaseBreak) as never,
    recordNotice: useServerFn(recordLeaseNotice) as never,
    terminate: useServerFn(terminateLease) as never,
    archiveLease: useServerFn(archiveLease) as never,
    upsertTenant: useServerFn(upsertTenant) as never,
    upsertContact: useServerFn(upsertTenantContact) as never,
    archiveTenant: useServerFn(archiveTenant) as never,
    setOccupancy: useServerFn(setUnitOccupancy) as never,
    updateVacancy: useServerFn(updateVacancyPeriod) as never,
    generateReminders: useServerFn(generateLeaseReminders) as never,
  };

  const mutation = useMutation({
    mutationFn: async ({ action, data }: { action: LeaseActionName; data: unknown }) => {
      const result = await fns[action]({ data });
      return { action, result };
    },
    onSuccess: ({ action }) => {
      toast.success(SUCCESS[action]);
      for (const key of LEASE_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "The action could not be completed");
    },
  });

  return {
    run: (action: LeaseActionName, data: unknown) =>
      mutation.mutateAsync({ action, data }).catch(() => null) as Promise<{
        action: LeaseActionName;
        result: unknown;
      } | null>,
    isPending: mutation.isPending,
    pendingAction: mutation.isPending ? mutation.variables?.action : undefined,
  };
}

export type LeaseActions = ReturnType<typeof useLeaseActions>;
