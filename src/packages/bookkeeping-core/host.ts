import { createContext, createElement, useContext, type ReactNode } from "react";

import {
  NO_BANKING,
  NO_CASH_FLOW,
  NO_DIMENSIONS,
  NO_DOCUMENTS,
  PT_FISCAL_DEFAULTS,
  type BookkeepingHost,
} from "./adapters";
import { NO_CAPABILITIES } from "./capabilities";

/**
 * Shared bookkeeping core — host wiring.
 *
 * Absent adapters fail closed: no capabilities, no dimensions, no document,
 * banking or cash-flow affordances, and every server operation rejects.
 */

function rejecting(): never {
  throw new Error("Bookkeeping host is not configured: no server contract supplied.");
}

const NO_SERVER = new Proxy({} as BookkeepingHost["server"], {
  get: () => () => Promise.reject(new Error("Bookkeeping host is not configured.")),
});

const NO_DATA = new Proxy({} as BookkeepingHost["data"], {
  get: () => () => Promise.reject(new Error("Bookkeeping host is not configured.")),
});

export const FAIL_CLOSED_HOST: BookkeepingHost = {
  tenant: { companyId: undefined },
  capabilities: NO_CAPABILITIES,
  dimensions: NO_DIMENSIONS,
  documents: NO_DOCUMENTS,
  banking: NO_BANKING,
  cashFlow: NO_CASH_FLOW,
  fiscal: PT_FISCAL_DEFAULTS,
  data: NO_DATA,
  server: NO_SERVER,
};

const HostContext = createContext<BookkeepingHost>(FAIL_CLOSED_HOST);

export function BookkeepingHostProvider({
  host,
  children,
}: {
  host: BookkeepingHost;
  children: ReactNode;
}) {
  return createElement(HostContext.Provider, { value: host }, children);
}

export function useBookkeepingHost(): BookkeepingHost {
  return useContext(HostContext);
}

export function useCapabilities() {
  return useBookkeepingHost().capabilities;
}

export function useTenant() {
  return useBookkeepingHost().tenant;
}

export function useCompanyId(): string | undefined {
  return useBookkeepingHost().tenant.companyId;
}

export function useFiscalConfig() {
  return useBookkeepingHost().fiscal;
}

export function useDimensionFields() {
  return useBookkeepingHost().dimensions.fields.filter((f) => f.enabled);
}

/** Host-provided allocation options for one dimension type. */
export function useDimensionOptions(type: string) {
  return useBookkeepingHost().dimensions.useOptions(type);
}

export { rejecting };
