/**
 * Pedra Rioja host — bookkeeping provider.
 *
 * Assembles the tenant, capabilities, dimension, documents, banking, cash-flow
 * and server adapters the shared core needs, and supplies them through the
 * core's `BookkeepingHostProvider`. This file is the entire coupling surface
 * between Pedra Rioja and the shared bookkeeping module.
 */

import type { ReactNode } from "react";

import { useWorkspace } from "@/hooks/use-workspace";
import type { BookkeepingHost } from "@/packages/bookkeeping-core/adapters";
import { fiscalConfig } from "@/packages/bookkeeping-core/adapters";
import { capabilitiesFor } from "./roles";
import { BookkeepingHostProvider } from "@/packages/bookkeeping-core/host";
import {
  createBankingAdapter,
  createCashFlowAdapter,
  createDimensionAdapter,
  createDocumentsAdapter,
} from "./adapters";
import { pedraRiojaData } from "./data";
import { usePedraRiojaServerContract } from "./server";

/** Portugal-first fiscal configuration for this host. */
export const PEDRA_RIOJA_FISCAL = fiscalConfig({ defaultCurrency: "EUR" });

export function usePedraRiojaBookkeepingHost(): BookkeepingHost {
  const { data: workspace, isLoading } = useWorkspace();
  const companyId = workspace?.company?.id;
  const capabilities = capabilitiesFor(workspace?.roles);
  const server = usePedraRiojaServerContract();

  return {
    tenant: {
      companyId,
      companyLabel: workspace?.company?.name ?? null,
      isLoading,
    },
    capabilities,
    dimensions: createDimensionAdapter(companyId),
    documents: createDocumentsAdapter(companyId, capabilities.canRecord),
    banking: createBankingAdapter(companyId),
    cashFlow: createCashFlowAdapter(companyId),
    fiscal: PEDRA_RIOJA_FISCAL,
    data: pedraRiojaData,
    server,
  };
}

export function PedraRiojaBookkeepingProvider({ children }: { children: ReactNode }) {
  const host = usePedraRiojaBookkeepingHost();
  return <BookkeepingHostProvider host={host}>{children}</BookkeepingHostProvider>;
}
