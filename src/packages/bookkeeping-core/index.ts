/**
 * Shared bookkeeping core — public API.
 *
 * Host applications import from here only. Nothing in this package may import
 * host routes, navigation, tables, storage rules or permission internals.
 */

export * from "./adapters";
export * from "./capabilities";
export * from "./format";
export * from "./host";
export * from "./mutations";
export * from "./queries";
export * from "./schemas";
export * from "./types";

export { ClassificationsPanel } from "./components/classifications-panel";
export { CounterpartiesPanel } from "./components/counterparties-panel";
export { DocumentEditorDialog } from "./components/document-editor";
export { DocumentsPanel } from "./components/documents-panel";
export { PeriodsPanel } from "./components/periods-panel";
export { BankRulesPanel } from "./components/rules-panel";
export { SettlementPanel } from "./components/settlement-panel";
export { classificationLabel, OptionSelect } from "./components/selectors";
