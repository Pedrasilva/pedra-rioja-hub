# Phase 6 — Shared Bookkeeping Architecture

Assessment only. No schema changes, no migrations, no new screens have been made for this phase.

Sources inspected: PSA Hub (`src/lib/finance/*`, `src/components/finance/*`, `src/routes/_app.finance.*`,
`src/integrations/supabase/types.ts`, `.env`) and this project's existing banking / cash-flow modules.

---

## 1. Answers to the pre-implementation questions

### 1.1 Do both apps use the same backend project?

**No.** They are two separate Lovable Cloud (Supabase) projects:

| App | Backend project ref |
| --- | --- |
| PSA Hub | `oqccurfsvbxvdexehyfc` |
| Pedra Rioja | (this project's own ref) |

There is no cross-project database, no shared npm package, no monorepo. So "one shared bookkeeping domain"
can only mean **one canonical definition ported byte-for-byte into both projects** (Option A in
`docs/ARCHITECTURE.md` §2), not one physical database. Everything below is designed so a change is authored
once and applied to both by copying identical files and identically-numbered migrations.

### 1.2 Can the existing PSA Hub schema become canonical?

**Partly — the shape yes, the scoping no.**

What is genuinely good and should be adopted as canonical:

- `financial_documents` — one table for invoices, credit notes, bills, receipts, both directions
  (`direction`, `doc_type`, `status`, `source`), with PT specifics already modelled (`atcud`, `series`,
  `document_number`, `vat_period`, `subtotal_ex_vat`, `vat_amount`, `total_inc_vat`, `paid_amount`,
  `outstanding_amount`) and counterparty name snapshots.
- `financial_document_lines` — per-line VAT (`vat_rate`, `vat_code`, `vat_amount`), classification and
  `reimbursable`.
- `financial_document_payments` — settlement rows carrying `bank_transaction_id`; this is exactly the
  "reconciliation writes allocations, never source amounts" rule Pedra Rioja already enforces.
- `financial_classifications` — hierarchical chart (`parent_id`, `level`, `code`, `name_pt`/`name_en`) with
  behaviour flags (`affects_cash_flow`, `affects_profit`, `supplier_required`, `spending_policy`,
  `project_link_allowed`, `collaborator_link_allowed`).
- `financial_periods` / `financial_period_totals` — period close and VAT period totals.
- `companies` as a **unified counterparty** table with `is_client` / `is_supplier` /
  `is_reimbursement_supplier` flags, `nif`, `payment_terms`, `default_classification_id`.

What blocks it from being canonical unchanged:

1. **No tenancy.** Not one finance table in PSA Hub carries `company_id`/`workspace_id`/`tenant_id`
   (verified by full-text scan of the generated types). PSA Hub is single-tenant; ownership is expressed as
   "project-owned or company-owned" via a nullable `project_id` (`src/lib/finance/ownership.ts`).
   Pedra Rioja is multi-tenant: every table carries `company_id`, and `companies` means *the owning legal
   entity*, not a counterparty.
2. **Name collision on `companies`.** The single most dangerous conflict. Same table name, opposite meaning.
3. **Different permission model.** PSA Hub gates finance with a global admin role plus a `finance.dashboard`
   permission key, and its UI guard deliberately *fails open* on error (`src/lib/finance/access.ts`).
   Pedra Rioja uses company-scoped `app_role` with `can_view_company` / `can_record_company` /
   `can_manage_company` and fails closed.
4. **App-specific coupling inside finance.** Project financials, timesheet/resource cost, salary import,
   benefit expenses, InvoiceXpress sync, proposals/quotes and CRM opportunities are wired directly into the
   finance tables.

**Conclusion:** canonical = **PSA Hub's table and column names, plus Pedra Rioja's tenancy and RLS
conventions**, with counterparties renamed. This is a *superset*, additive for PSA Hub.

### 1.3 What must be migrated or renamed

| Canonical name | PSA Hub today | Pedra Rioja today | Action |
| --- | --- | --- | --- |
| `counterparties` | `companies` (client/supplier flags) | `tenants` (real-estate specific) | Rename in PSA Hub, view `companies` kept as a compatibility view; Pedra Rioja keeps `tenants` as a real-estate role record pointing at a counterparty |
| `financial_documents` | exists | — | Add `company_id` (tenant) in PSA Hub; create identically here |
| `financial_document_lines` | exists | — | Add `company_id`; create here |
| `financial_document_payments` | exists | — | Add `company_id`; create here |
| `financial_classifications` | exists (global) | `dimensions` / category text columns | Add `company_id` (nullable = global default set); here, map `cash_flow_entries.category` onto classification codes |
| `financial_periods`, `financial_period_totals` | exists | — | Add `company_id`; create here |
| `bank_accounts`, `bank_transactions`, `bank_statement_imports` | exists (own shape) | exists (richer: fingerprints, matches, transfers, reversal lineage) | **Pedra Rioja's banking is canonical here** — PSA Hub adopts fingerprints + `bank_reconciliation_matches` |
| `documents` / Drive metadata | `file_path` + per-domain Drive tables (`benefit_drive_folders`, `benefit_expense_drive_sync`, `backup_runs`) | `documents`, `document_links`, `drive_folders` (generic, first-class) | **Pedra Rioja's document model is canonical**; PSA Hub migrates its ad-hoc Drive columns into it |
| tenant column | n/a | `company_id` everywhere | PSA Hub adds `company_id NOT NULL DEFAULT <single PSA company>` — backfillable with zero data loss |
| optional app context | n/a | n/a | Add nullable `project_id` (PSA) and dimension links (Pedra Rioja) — no app-specific FKs in core tables |

Everything real-estate-specific stays out of the core: properties, tenancies and capex attach through the
existing `dimensions` / `transaction_dimensions` layer, exactly as PSA Hub's projects will.

### 1.4 What code can be shared directly

Directly portable, essentially file-copy (pure logic, no app imports):

- `src/lib/finance/nif.ts` — PT NIF validation.
- `src/lib/finance/supplier-matching.ts` — counterparty fuzzy matching.
- `src/lib/finance/bank-statement-parser.ts` — statement parsing (merge with this project's
  `src/modules/banking/schemas.ts`, which additionally has fingerprinting; the merged version becomes canonical).
- `src/components/finance/vat-preset-picker.tsx` + `PT_VAT_PRESETS` — PT VAT rate presets.
- `src/lib/finance/display-rules.ts`, `ownership.ts` — presentation and ownership predicates.
- `src/lib/finance/imports/*`, `import-financial-data.ts`, `import-logs.ts` — import pipeline.
- `purchase-ocr.functions.ts` — document OCR extraction.

Shareable with a thin adapter (they read app tables/permissions):

- `use-company-expenses.ts`, `use-documents.ts`, `use-supplier-classifications.ts` — swap the access check and
  add the `company_id` filter.
- `invoice-editor-dialog.tsx`, `purchase-editor-dialog.tsx`, `documents-list.tsx`, `settlement-dialog.tsx`,
  `settlement-history.tsx`, `classification-picker.tsx`, `suppliers-master-data.tsx`,
  `clients-master-data.tsx` — presentational; they take data + callbacks.

Not shareable (app-specific, stays where it is):

- `salary-cost.ts`, `salary-template.ts`, `import-salary.ts`, `hybrid-resource-cost.ts`,
  `use-project-financials.ts`, project billing, benefit expenses, InvoiceXpress sync, finance sidebar/nav.

### 1.5 Safest phased migration plan

Nothing destructive at any step; every step is additive and independently revertible.

**6a — Freeze the contract (no code).** Publish `docs/BOOKKEEPING-CANON.md`: canonical table list, column
list, function signatures, file paths, and a `bookkeeping_module_version` row in both apps. Both apps must
use identical migration filenames under `supabase/migrations/bookkeeping/`.

**6b — Pedra Rioja greenfield build.** Create the canonical bookkeeping tables *here first*, where there is
no legacy data and no live users: `counterparties`, `financial_classifications`, `financial_documents`,
`financial_document_lines`, `financial_document_payments`, `financial_periods`,
`financial_period_totals` — all with `company_id`, GRANTs, RLS via the existing
`can_view/record/manage_company` helpers, and the same guard triggers used by `cash_flow_entries`.

**6c — Wire to what already exists here.** Documents link through `document_links`; settlement rows link to
`bank_transactions` and reuse `confirm_bank_match` / `reverse_bank_match`; posted documents surface in
cash flow as *linked source records* (`source_type = 'financial_document'`), never re-keyed.

**6d — Shared code extraction.** Port the pure-logic files above into `src/modules/bookkeeping/` with paths
identical to PSA Hub's future paths, then push the same files back into PSA Hub. Hard rule stays:
`modules/bookkeeping/` may not import from `modules/realestate/`.

**6e — PSA Hub additive migration.** Add nullable `company_id` → backfill single tenant → set NOT NULL →
add tenant-aware RLS *alongside* current policies → rename `companies` to `counterparties` with a
`companies` view for compatibility → cut over reads/writes → drop the view once nothing references it.

**6f — Convergence checks.** Run the canonical database test suite (adapted from
`tests/db/bank-reconciliation.test.ts`) in both projects; a schema-diff script compares canonical tables
across both refs and fails on drift.

**6g — UI last.** Only then build bookkeeping screens here, reusing the ported components with
Pedra-Rioja-only navigation and presentation.

### 1.6 Breaking-change risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| `companies` means tenant here, counterparty there | **High** | Rename to `counterparties` in PSA Hub behind a compatibility view; never introduce a tenant table named `companies` semantics-mismatched |
| Adding `company_id NOT NULL` to live PSA Hub finance tables | **High** | Three-step nullable → backfill → NOT NULL; do it out of hours, one table per migration |
| PSA Hub's fail-open finance access guard | **High** | Do not port. Canonical RLS is fail-closed and company-scoped; PSA Hub's UI guard becomes a UI hint only |
| Divergent bank-reconciliation models (PSA has no fingerprints or match reversal lineage) | Medium | Pedra Rioja's model is canonical; PSA Hub adds fingerprints and matches additively, keeping existing rows unmatched rather than back-filling guesses |
| Two `bank_accounts` shapes (`account_name` vs `name`, no `status`) | Medium | Column adds + a rename with a compatibility view; no data movement |
| Global vs per-tenant classification chart | Medium | `company_id` nullable: NULL = shared default chart, non-NULL = tenant override |
| Silent drift after the port | Medium | `bookkeeping_module_version` + identically numbered migrations + schema-diff check in 6f |
| PSA Hub finance rows carrying project/collaborator/benefit FKs into core tables | Medium | Core keeps only nullable `project_id`; all other links move to `transaction_dimensions` |
| Currency/locale assumptions (EUR, PT VAT, `en-GB` formatting) | Low | Already configuration-driven here; VAT presets stay data, not code |
| Enum drift (`financial_doc_type`, `financial_doc_status`, `financial_payment_method`, `financial_nature`) | Low | Enums are part of the frozen contract; extended only in 6a |

---

## 2. Compatibility assessment by area

**Suppliers and clients.** PSA Hub: one `companies` table, `is_client` / `is_supplier` /
`is_reimbursement_supplier`, `nif`, `payment_terms`, `default_classification_id`, `status` enum, plus
`contacts` (`company_id` FK). Pedra Rioja: `tenants` only — no supplier register at all. Canonical:
`counterparties` (PSA shape + `company_id`); `tenants` keeps real-estate lease attributes and references a
counterparty.

**Company and workspace scoping.** PSA Hub: none — single tenant, ownership = `project_id` nullable
(project-owned) or NULL (company-owned). Pedra Rioja: `company_id` on every table + company-scoped roles.
Canonical: `company_id` mandatory, `project_id` optional app context, everything else via dimensions.

**Invoices, bills, expenses, income, payments.** PSA Hub is rich and close to canonical:
`financial_documents` (+ lines), `financial_income_items`, `financial_expense_items`,
`financial_expense_payments`, `financial_document_payments`, `company_expenses`, `financial_debts` /
`financial_debt_payments`. Pedra Rioja has none of these; it has `cash_flow_entries` as a forecast/actual
ledger. They compose cleanly: a posted document *generates* a linked cash-flow entry; the entry never owns
the amounts.

**VAT and accounting categories.** PSA Hub: line-level `vat_rate` / `vat_code` / `vat_amount`, header
`vat_period`, `financial_periods` + `financial_period_totals`, PT presets in code, hierarchical
`financial_classifications`. Pedra Rioja: flat `vat` numeric columns and free-text `category`. Canonical is
PSA Hub's; Pedra Rioja's categories map to classification codes and the `vat` columns become derived.

**Documents and Drive.** PSA Hub: `file_path` on documents plus domain-specific Drive tables and sync
queues. Pedra Rioja: first-class `documents` + `document_links` + `drive_folders` with sync status and
reconciled paths — strictly better and already generic. Canonical: Pedra Rioja's; PSA Hub's Drive columns
migrate into it.

**Bank-reconciliation links.** PSA Hub: `bank_transactions`, `bank_statement_imports`,
`bank_classification_rules`, `bank_transaction_classifications`, `bank_balance_snapshots`, plus
`financial_document_payments.bank_transaction_id`. Pedra Rioja: fingerprints, staging rows, atomic commit,
`bank_reconciliation_matches` with partial allocation, explicit reversal lineage, balance override with
mandatory reason. Canonical: Pedra Rioja's engine + PSA Hub's `bank_classification_rules` (a genuine gap
here). The invariant **reconciliation may set settlement state and allocations but never source-owned
amounts** holds in both and is preserved as-is.

**RLS and roles.** PSA Hub: admin role + permission keys, global, fail-open UI guard. Pedra Rioja: six
company-scoped roles with `can_view/record/manage_company`. Canonical: Pedra Rioja's, and it already encodes
the required distinction — recording roles reconcile existing records, manage-level roles create or amend
ledger items, reconciliation history is reversed (never deleted; no client DELETE policy on matches).

**Server functions, schemas, hooks, UI.** PSA Hub: `createServerFn` modules under `src/lib/finance/*` and
~34 finance components; same framework and conventions as here, so ports are mechanical. Canonical layout:
`src/modules/bookkeeping/{schemas,queries,*.functions.ts,components}` mirrored in both apps.

**Duplicated or app-specific logic.** Statement parsing exists in both (merge, keep fingerprints).
Classification vs dimensions overlap (classification = accounting nature; dimension = attribution — keep
both, distinct roles). Salary, benefits, projects, proposals, InvoiceXpress, tenancies, financing and
depreciation remain app-specific.

**Migration risks.** See §1.6.

---

## 3. Recommendation

Adopt PSA Hub's finance *shape* and Pedra Rioja's *tenancy, RLS, documents and reconciliation engine* as the
single canon; build it greenfield here first (6b/6c), extract shared code (6d), and only then perform the
additive PSA Hub migration (6e). No destructive migration is proposed or executed until that plan is
approved.
