> **Historical document.** Superseded by `PRODUCT-STRATEGY.md` (2026-07-29): Pedra Rioja Hub and PSA Hub stay separate applications with separate databases. Kept only as background for a possible future *design* alignment — see `BOOKKEEPING-REFERENCE-DESIGN.md`. Nothing here is an active plan.

# Phase 6d — Bookkeeping extraction boundary

Status: Phase 6c closed. Nothing is published as a package and PSA Hub is untouched.

## 1. Inventory

### Reusable shared core (extract as-is)

| File | Notes |
| --- | --- |
| `src/modules/bookkeeping/schemas.ts` | Zod contracts, `SOURCE_TYPES`, `PT_VAT_PRESETS`, NIF validation, `computeLine` / `computeDocumentTotals`, `round2`. Pure. |
| `src/modules/bookkeeping/permissions.ts` | Six-role capability adapter. Pure; takes role strings, returns capabilities. |
| `src/modules/bookkeeping/queries.ts` | React Query read hooks. Only dependency is the generated Supabase client. |
| `src/modules/bookkeeping/mutations.ts` | React Query write hooks over the module server functions. |
| `src/modules/bookkeeping/bookkeeping.functions.ts` | 13 `createServerFn` handlers, all behind `requireSupabaseAuth`, all company- or document-scoped. |
| `components/document-editor.tsx` | Header + line editor, live preview, database-authoritative verification. |
| `components/documents-panel.tsx` | Register, filters, lifecycle controls (post / cancel with reason). |
| `components/counterparties-panel.tsx` | Register + dialog, NIF validation, archive/restore. |
| `components/classifications-panel.tsx` | Hierarchical chart, shared vs company scope. |
| `components/settlement-panel.tsx` | Payments, bank links, reversal with reason. |
| `components/rules-panel.tsx` | Bank classification rules + read-only dry run. |
| `components/periods-panel.tsx` | Period list, totals, recompute. |
| `components/selectors.tsx` | `OptionSelect`, `classificationLabel`. |

Verified mechanically by `tests/ui/module-boundary.test.ts`: no file in the module imports
`@/modules/realestate`, `@/modules/cashflow`, `@/modules/banking`, `@tanstack/react-router`,
`@/components/app-shell` or `@/hooks/use-workspace`, and the only backend imports are the
generated Supabase client and `bookkeeping.functions`.

### Pedra Rioja adapters (re-implement per app)

| Concern | Today | PSA Hub needs |
| --- | --- | --- |
| Tenant context | `useWorkspace()` in the route, passing `companyId` down | Its own company/tenant resolver returning one id |
| Role source | `workspace.roles` → `capabilitiesFor(roles)` | Map its admin role + `finance.*` permission keys onto the same six roles |
| Property/project options | `useBookkeepingProperties` / `useBookkeepingProjects` in `queries.ts` | Swap the two hooks for project/collaborator equivalents; the components only consume `{ id, name, code? }` |
| Bank transaction options | `useRulePreviewTransactions` | Same shape from PSA's `bank_transactions` |
| Toasts / formatting | `sonner`, `@/lib/format` | Provide the same three helpers (`formatDate`, `formatMoneyPrecise`, `titleCase`) |

### Pedra Rioja-only presentation (not extracted)

`src/routes/_authenticated/bookkeeping.tsx` (route, head metadata, tab shell),
`src/components/app-shell.tsx` navigation entry, the limestone/Rioja theme in `src/styles.css`.

### Not ready for extraction

- `src/modules/realestate/*` Drive presentation — document attachment UI for bookkeeping is still
  Pedra-Rioja shaped and is deliberately outside the module.
- The `properties` / `capex_projects` reads inside `queries.ts` are the only Pedra-Rioja table
  names in the shared core; they must become the adapter hooks above before the package is cut.

## 2. Adapter interface required for PSA Hub

```ts
type BookkeepingAdapter = {
  companyId: string;                       // tenant scope
  capabilities: BookkeepingCapabilities;   // from capabilitiesFor(roles)
  useDimensionOptions: () => { id: string; name: string; code?: string | null }[]; // property/project
  useBankTransactions: () => BankTransactionOption[];
};
```

Everything else in the core is already parameterised by props.

## 3. Remaining blockers for Phase 6d

1. `queries.ts` still names `properties` and `capex_projects` — move behind `useDimensionOptions`.
2. PSA Hub has no `counterparties` table yet (Phase 6e rename) and no `company_id` on its finance
   tables; the shared core assumes both.
3. PSA Hub's fail-open finance access guard must be replaced by `capabilitiesFor` before reuse.
