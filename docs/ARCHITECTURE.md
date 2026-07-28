# Pedra Rioja — Real Estate Portfolio App

## Architectural Blueprint (Phase 0)

Status: design only. No application code, no database, no seed data yet.

---

## 1. Recommended application architecture

**Decision: a standalone Lovable application, separate from PSA Hub.**

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start (React 19, Vite) — same as PSA Hub, so finance code ports cleanly |
| Backend | Lovable Cloud (PostgreSQL, Auth, Storage, RLS) |
| Server logic | `createServerFn` for app-internal calls; `src/routes/api/public/*` only for future webhooks/imports |
| Data access | RLS-enforced client reads; privileged writes (imports, recalculation, audit) via server functions |
| Client state | TanStack Query, loader-primed via `ensureQueryData` |

### Why separate and not an addon to PSA Hub

1. Datasets must never mix. Sharing one database forces an `entity_id` on every PSA table plus a rewrite of PSA's existing RLS — high risk on a live app.
2. Domains barely overlap. Properties, tenancies, mortgages, depreciation vs. HR/CRM/proposals.
3. Pedra Rioja will churn heavily while PSA Hub must stay stable.

### Application layering

```text
src/
  routes/                 app-specific pages (properties, tenancies, financing…)
  modules/
    bookkeeping/          PORTABLE — mirrors PSA Hub, company-agnostic
      components/
      functions/          server functions (createServerFn wrappers)
      server/             *.server.ts helpers, pure logic
      types/
      config/             injected per-company config (see §3)
    realestate/           APP-SPECIFIC — properties, tenancy, financing, depreciation
  components/ui/          shadcn + design system
  lib/
supabase/migrations/
  bookkeeping/            PORTABLE migrations, prefixed bk_
  realestate/             app-specific migrations
```

The hard rule that makes sharing cheap: **nothing inside `modules/bookkeeping/` may import from `modules/realestate/`.** Dependency flows one way only. Real-estate code links *into* bookkeeping through documented extension points (§3.3).

---

## 2. Sharing the bookkeeping module with PSA Hub

### Honest constraint

Lovable has no monorepo, no private npm packages, and no shared database across projects. There is **no mechanism for an edit in PSA Hub to automatically appear in Pedra Rioja.** Any design claiming otherwise is not achievable on this platform today.

### Options assessed

| Option | Mechanics | Verdict |
| --- | --- | --- |
| **A. Canonical source + assisted port** *(recommended)* | PSA Hub is the reference implementation. Bookkeeping lives in an isolated, company-agnostic folder in both apps. Improvements are made in PSA Hub, then ported here on request — the agent can read PSA Hub's files directly and copy them across. | Practical now. Port cost is minutes, not a rebuild, *provided isolation is respected*. |
| **B. Shared bookkeeping service** | A third Lovable app exposes bookkeeping over `/api/public/*`; each consumer passes a tenant key and its own credentials. | One true codebase, but adds latency, cross-app auth, a single point of failure, and painful local development. Revisit only if a third company appears. |
| **C. Shared database, tenant column** | One Cloud project, `company_id` everywhere. | Rejected — violates the hard data-separation requirement and couples release cycles. |
| **D. npm package / git submodule** | Not supported for private Lovable projects. | Unavailable. |

**Chosen: Option A**, engineered so that Option B remains reachable later (the module already talks to the rest of the app only through typed interfaces, so it could be lifted behind HTTP without touching callers).

### 2.1 Rules that keep the port cheap

1. **Naming parity.** Identical table names, column names, function names and file paths in both apps. A port becomes a file copy.
2. **No company literals in code.** No hardcoded VAT rates, account codes, IBANs, currency assumptions, fiscal-year rules.
3. **Config injection.** Everything company-specific arrives from a single `bookkeeping_config` table + `modules/bookkeeping/config/` adapter.
4. **Versioning.** `bookkeeping_module_version` row in each app records the last ported version and date. Migrations under `supabase/migrations/bookkeeping/` are numbered identically in both apps so drift is visible.
5. **Extension points, not forks.** Property-linked transactions attach via a generic `cost_center` / `dimension` mechanism (§3.3), not by editing core bookkeeping tables. PSA Hub uses the same mechanism for its projects.
6. **Change discipline.** Improvements land in PSA Hub first, then port. Never fix the same bug twice in parallel.

### 2.2 Shared vs app-specific

**Portable (shared with PSA Hub):**

- Chart of accounts / classifications, classification rules engine
- Suppliers, clients (schema and CRUD, never the rows)
- Purchase invoices, sales invoices, receipts, expenses, credit notes
- VAT rates, VAT computation and VAT return reporting
- Bank accounts, bank transactions, statement import, reconciliation engine
- Documents store + OCR/attachment linking
- Cash-flow actuals engine, period close, audit log, approvals
- Import staging tables and dedupe logic

**App-specific to Pedra Rioja:**

- Properties, units, acquisition cost build-up, valuations
- Tenants, tenancy agreements, rent schedules, indexation, arrears
- Financing agreements, mortgage/leasing amortisation schedules and versioning
- Construction projects and capex capitalisation
- Depreciation registers and postings
- Property dashboard, portfolio dashboard, cash-flow **forecast** (actuals are shared; property-driven forecast is not)

---

## 3. Data model

### 3.1 Conventions

- Every table: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`, `created_by`, `updated_by`, and `deleted_at` (soft delete) on business records.
- `company_id uuid not null references companies(id)` on every business table from day one — single row today, multi-entity ready, no future rebuild.
- Money: `numeric(14,2)`; `currency char(3) default 'EUR'`; percentages `numeric(7,4)`.
- All amounts stored signed from the company's perspective; direction also carried explicitly where ambiguity exists.
- Every `CREATE TABLE public.x` is followed in the same migration by `GRANT`s, then `ENABLE ROW LEVEL SECURITY`, then policies.
- Roles live in a dedicated `user_roles` table, never on profiles.

### 3.2 Modules and tables

**Core / platform**
`companies`, `profiles`, `user_roles`, `audit_log`, `settings`, `bookkeeping_config`, `bookkeeping_module_version`, `documents`, `document_links`

**Bookkeeping (portable)**
`accounts` (classification mapping for accountant exports — *not* a posting ledger), `classifications`, `classification_rules`, `vat_rates`, `vat_treatment_defaults`, `suppliers`, `clients`, `purchase_invoices` + `purchase_invoice_lines`, `sales_invoices` + `sales_invoice_lines`, `receipts`, `payments`, `expenses`, `credit_notes`, `bank_accounts`, `bank_transactions`, `bank_statement_imports`, `import_staging_rows`, `reconciliation_matches`, `periods` (period locking only), `vat_returns`, `approvals`

> **Model confirmed: operational bookkeeping, not double-entry.** Verified against PSA Hub, which has no journal/debit/credit tables — it runs on `financial_documents`, `financial_document_payments`, `bank_transactions`, `bank_transaction_classifications`, `financial_classifications`, `bank_classification_rules`, `bank_statement_imports`. `journal_entries` / `journal_lines` are therefore **removed** from this plan. A general ledger can be layered later as a derived posting engine without touching the operational tables.


**Dimensions (the shared extension point)**
`dimensions` (definition: e.g. `property`, `unit`, `project`), `dimension_values` (rows pointing at an app-specific entity), `transaction_dimensions` (transaction ↔ dimension value, with allocation percentage). This is how a purchase invoice gets attributed to a property here and to a client project in PSA Hub — with zero divergence in the bookkeeping schema.

**Real estate (app-specific)**
`properties`, `property_units`, `property_acquisition_costs`, `property_valuations`, `tenants`, `tenancy_agreements`, `rent_schedules`, `rent_charges`, `financing_agreements`, `financing_schedule_versions`, `financing_schedule_rows`, `capex_projects`, `capex_project_costs`, `depreciation_assets`, `depreciation_schedules`, `depreciation_postings`, `cashflow_forecast_scenarios`, `cashflow_forecast_lines`

### 3.3 Key fields

| Table | Important fields |
| --- | --- |
| `properties` | company_id, code, name, address fields, typology, area_m2, purchase_date, purchase_price, acquisition_cost_total (derived), current_valuation, valuation_date, status (`prospect`/`owned`/`under_works`/`for_rent`/`rented`/`for_sale`/`sold`), main_image_document_id |
| `property_acquisition_costs` | property_id, cost_type (`price`/`imt`/`stamp_duty`/`notary`/`registration`/`agency`/`legal`/`survey`/`other`), amount, capitalisable, source_transaction_id |
| `property_valuations` | property_id, valuation_date, amount, method (`purchase`/`bank`/`appraiser`/`internal`/`market`), source_document_id |
| `tenancy_agreements` | property_id, unit_id, tenant_id, start_date, end_date, notice_period_days, base_rent, payment_day, deposit_amount, indexation_type (`none`/`ipc`/`fixed_pct`), indexation_month, vat_applicable, status |
| `rent_schedules` | tenancy_id, period_start, period_end, due_date, amount, vat_amount, status (`scheduled`/`invoiced`/`paid`/`overdue`/`written_off`), sales_invoice_id |
| `financing_agreements` | company_id, property_id (nullable — some facilities are portfolio-level), type (`mortgage`/`leasing`/`shareholder_loan`/`credit_line`), lender, principal, start_date, term_months, rate_type (`fixed`/`euribor_spread`), fixed_rate, index_name, index_tenor, spread, repayment_type, grace_months, current_schedule_version_id |
| `financing_schedule_versions` | agreement_id, version_no, effective_from, reason (`origination`/`rate_reset`/`early_repayment`/`restructure`/`correction`), index_rate_used, generated_at, generated_by, is_current |
| `financing_schedule_rows` | version_id, period_no, due_date, opening_balance, interest, principal, insurance, fees, total_payment, closing_balance, actual_transaction_id |
| `bank_transactions` | company_id, bank_account_id, value_date, booking_date, amount, description, counterparty_name, counterparty_iban, external_ref, import_id, hash_key (dedupe), status (`unmatched`/`suggested`/`matched`/`ignored`), classification_id |
| `reconciliation_matches` | bank_transaction_id, matched_type (`purchase_invoice`/`sales_invoice`/`expense`/`financing_row`/`manual`), matched_id, amount_matched, confidence, rule_id, matched_by, matched_at, status |
| `depreciation_assets` | company_id, property_id, capex_project_id, description, category, capitalised_amount, in_service_date, useful_life_years, method (`straight_line`), residual_value |
| `documents` | company_id, storage_path, filename, mime_type, size_bytes, doc_type, issue_date, uploaded_by, checksum |
| `document_links` | document_id, entity_type, entity_id (polymorphic link, so any record can carry documents) |

### 3.4 Entity relationship diagram

```mermaid
erDiagram
    COMPANIES ||--o{ PROPERTIES : owns
    COMPANIES ||--o{ BANK_ACCOUNTS : holds
    COMPANIES ||--o{ SUPPLIERS : has
    COMPANIES ||--o{ CLIENTS : has
    COMPANIES ||--o{ USER_ROLES : grants

    PROPERTIES ||--o{ PROPERTY_UNITS : contains
    PROPERTIES ||--o{ PROPERTY_ACQUISITION_COSTS : accumulates
    PROPERTIES ||--o{ PROPERTY_VALUATIONS : valued_by
    PROPERTIES ||--o{ TENANCY_AGREEMENTS : leased_via
    PROPERTIES ||--o{ FINANCING_AGREEMENTS : financed_by
    PROPERTIES ||--o{ CAPEX_PROJECTS : improved_by
    PROPERTIES ||--o{ DEPRECIATION_ASSETS : depreciates

    PROPERTY_UNITS ||--o{ TENANCY_AGREEMENTS : rented_as
    TENANTS ||--o{ TENANCY_AGREEMENTS : signs
    TENANCY_AGREEMENTS ||--o{ RENT_SCHEDULES : generates
    RENT_SCHEDULES ||--o| SALES_INVOICES : invoiced_as

    FINANCING_AGREEMENTS ||--o{ FINANCING_SCHEDULE_VERSIONS : versioned_by
    FINANCING_SCHEDULE_VERSIONS ||--o{ FINANCING_SCHEDULE_ROWS : contains
    FINANCING_SCHEDULE_ROWS ||--o| BANK_TRANSACTIONS : settled_by

    CAPEX_PROJECTS ||--o{ CAPEX_PROJECT_COSTS : incurs
    CAPEX_PROJECT_COSTS ||--o| PURCHASE_INVOICES : sourced_from
    DEPRECIATION_ASSETS ||--o{ DEPRECIATION_SCHEDULES : plans
    DEPRECIATION_SCHEDULES ||--o{ DEPRECIATION_POSTINGS : posts

    SUPPLIERS ||--o{ PURCHASE_INVOICES : issues
    CLIENTS ||--o{ SALES_INVOICES : billed
    PURCHASE_INVOICES ||--o{ PURCHASE_INVOICE_LINES : has
    SALES_INVOICES ||--o{ SALES_INVOICE_LINES : has
    VAT_RATES ||--o{ PURCHASE_INVOICE_LINES : rated
    VAT_RATES ||--o{ SALES_INVOICE_LINES : rated
    ACCOUNTS ||--o{ CLASSIFICATIONS : maps
    CLASSIFICATIONS ||--o{ BANK_TRANSACTIONS : classifies

    BANK_ACCOUNTS ||--o{ BANK_TRANSACTIONS : records
    BANK_STATEMENT_IMPORTS ||--o{ BANK_TRANSACTIONS : produces
    BANK_TRANSACTIONS ||--o{ RECONCILIATION_MATCHES : reconciled_by
    PURCHASE_INVOICES ||--o{ RECONCILIATION_MATCHES : settled_by
    SALES_INVOICES ||--o{ RECONCILIATION_MATCHES : settled_by

    DIMENSIONS ||--o{ DIMENSION_VALUES : defines
    DIMENSION_VALUES ||--o{ TRANSACTION_DIMENSIONS : tags
    PROPERTIES ||--o{ DIMENSION_VALUES : exposed_as

    DOCUMENTS ||--o{ DOCUMENT_LINKS : attached_via
    PERIODS ||--o{ VAT_RETURNS : covers
```

### 3.5 VAT structure (configurable, never inferred)

No tax rules are hard-coded. Every invoice / expense line carries:

| Field | Purpose |
| --- | --- |
| `net_amount` | Taxable base |
| `vat_rate_id` + `vat_rate_pct` | Rate reference plus the snapshotted percentage in force at the document date |
| `vat_amount` | Computed VAT |
| `gross_amount` | Net + VAT |
| `recoverable_vat_amount` | Deductible input VAT |
| `non_recoverable_vat_amount` | VAT treated as cost (capitalised or expensed) |
| `vat_treatment` | `standard` / `exempt` / `reverse_charge` / `not_subject` / `out_of_scope` |
| `vat_exemption_reason_code` | Legal exemption reference where applicable |
| `deduction_basis` + `pro_rata_pct` | `full` / `pro_rata` / `none` |
| `tax_period` | YYYY-MM or quarter |
| `vat_status` | `pending` / `included_in_return` / `settled` / `recovered` / `excluded` |
| `vat_return_id` | Link to the return that reported the line |
| `reviewed_by` / `reviewed_at` | Human confirmation of the treatment |

- Defaults are **suggested** from `vat_treatment_defaults` (keyed by property, classification and activity) and always shown for review before a line is finalised. Nothing is silently inferred; every override is audited.
- `vat_rates` is date-effective, so historical documents keep the rate in force at their date.
- A property carries a `vat_exemption_waived` flag; it drives suggestions only.
- `vat_returns` groups lines by tax period and freezes the reported figures at submission.


---

## 4. Roles and permissions

Roles in `user_roles` (`app_role` enum), checked by a `security definer` `has_role(uuid, app_role)` function to avoid recursive RLS.

| Capability | Owner | Manager | Bookkeeper | Assistant | Approver | Viewer |
| --- | --- | --- | --- | --- | --- | --- |
| User administration | ✔ | – | – | – | – | – |
| Company / structural settings | ✔ | – | – | – | – | – |
| Chart of accounts, VAT rates, rules | ✔ | ✔ | ✔ | – | – | – |
| Properties: create / edit | ✔ | ✔ | – | – | – | – |
| Properties: view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Tenancies & financing: edit | ✔ | ✔ | – | – | – | – |
| Suppliers / clients: manage | ✔ | ✔ | ✔ | ✔ | – | – |
| Invoices & transactions: create/edit | ✔ | ✔ | ✔ | ✔ | – | – |
| Bank import & reconciliation | ✔ | ✔ | ✔ | prepare only | – | – |
| Approvals | ✔ | ✔ | ✔ | – | ✔ | – |
| Period close / VAT return submit | ✔ | – | ✔ | – | – | – |
| Depreciation run | ✔ | ✔ | ✔ | – | – | – |
| Reports | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Archive record | ✔ | ✔ | ✔ | – | – | – |
| Permanent delete | ✔ | – | – | – | – | – |

Every write to financial, tenancy, financing and permission tables writes an `audit_log` row (actor, action, entity, before/after JSON, timestamp, ip).

---

## 5. Row-level security strategy

- RLS enabled on every table in `public`; no table is reachable without an explicit `GRANT` plus policy.
- Baseline read: `company_id in (select company_id from user_roles where user_id = auth.uid())` — single-company today, multi-entity ready.
- Write policies compose the company check with `has_role(auth.uid(), …)` per the matrix above.
- Sensitive columns (bank IBANs, tenant personal data) are readable only by Owner/Manager/Bookkeeper; Viewer/Approver reach them through restricted views.
- Period close: once `periods.status = 'closed'`, `USING`/`WITH CHECK` clauses block edits to transactions in that period for all roles except Owner via an explicit reopen action (audited).
- Approvals, period close, imports, depreciation runs and schedule regeneration execute in server functions after an explicit role verification against the authenticated client — never via the admin client for ordinary reads.
- Storage: private bucket, path prefix `company/{company_id}/…`, policies mirroring the table matrix; downloads via short-lived signed URLs.

---

## 6. Document storage architecture

- One private Cloud Storage bucket, path `company/{company_id}/{entity_type}/{entity_id}/{uuid}-{filename}`.
- `documents` holds metadata + checksum (dedupe); `document_links` attaches one document to many entities (an invoice PDF can link to a purchase invoice, a capex project and a property).
- Upload flow: client requests a signed upload URL from a server function (role-checked) → uploads → server function records the `documents` row and links.
- Document types: deed, IMT/stamp receipt, tenancy contract, invoice, receipt, bank statement, valuation report, insurance policy, licence, plan, photo.
- Retention/versioning: new upload of the same doc_type for an entity supersedes rather than overwrites (`superseded_by_document_id`).

---

## 7. Mortgage schedule versioning logic

- An agreement never edits its schedule in place. Each change creates a new `financing_schedule_versions` row with `effective_from`, a `reason`, and the index rate used; `is_current` flags the active one.
- Rows before `effective_from` are retained from the prior version so history stays intact; the new version regenerates rows from `effective_from` forward using the outstanding balance at that date.
- Triggers for a new version: rate reset (Euribor refix), early partial repayment, restructure/term change, correction of an input error.
- Actual payments link to `financing_schedule_rows.actual_transaction_id` on reconciliation. Variance between scheduled and actual is reported, never silently absorbed.
- Interest/principal split for a period is always taken from the *version effective at that date*, so prior-period reports never change retroactively.

---

## 8. Bank statement import and reconciliation

```text
Upload (CSV/OFX/CAMT.053)
  → parse into import_staging_rows (raw text preserved)
  → normalise: dates, amounts, description, counterparty, external_ref
  → dedupe on hash_key(bank_account, value_date, amount, normalised description, external_ref)
  → promote to bank_transactions (status = unmatched)
  → classification rules engine assigns classification_id where confident
  → matching engine proposes reconciliation_matches:
        exact  : amount + reference match on an open invoice
        strong : amount + counterparty + date window
        partial: many-to-one and one-to-many (part payments, batch payments)
        scheduled: financing_schedule_rows due in window
  → user reviews queue: accept / reject / split / manual match / mark ignored
  → accepted match sets document status to paid and locks the pair
  → unmatched ageing report surfaces stale items
```

Imports are idempotent: re-importing an overlapping statement adds nothing. Every import is a reversible batch (`bank_statement_imports` can be rolled back while all its transactions remain unmatched).

---

## 9. Cash-flow calculation logic

Two engines, deliberately separated:

**Actuals (shared/bookkeeping):** derived solely from reconciled `bank_transactions`, grouped by classification and period, attributed to properties through `transaction_dimensions` allocations.

**Forecast (app-specific):** a scenario is the sum of deterministic and assumption-driven lines:

- Rent inflows from `rent_schedules` for active tenancies, extended by renewal assumption and indexation
- Vacancy assumption applied per property/unit
- Financing outflows from the current `financing_schedule_versions`, with a rate-path assumption for floating tranches
- Recurring costs (IMI, condominium, insurance, management) from templates
- Capex from `capex_projects` payment plans
- VAT settlement timing from the VAT engine
- Opening balance = latest reconciled bank balance

Output: monthly opening/closing balance per bank account and consolidated, per property and portfolio, with a variance view of forecast vs. actual once a month closes. Scenarios are named and comparable (base / conservative / with-acquisition).

---

## 10. Navigation and page hierarchy

```text
Dashboard              portfolio KPIs, cash position, alerts, upcoming payments
Properties             list → property dashboard (§10.1)
  /properties/$id        overview | costs | tenancy | financing | projects | documents | transactions
Cash Flow              actuals | forecast scenarios | variance
Bank Accounts          balances | transactions | reconciliation | imports
Bookkeeping            invoices in | invoices out | expenses | receipts | suppliers | clients
                       classifications | VAT rates | rules | VAT returns | period close
Tenants                tenants | agreements | rent roll | arrears
Financing              agreements | schedules | rate resets
Projects               capex projects | costs | capitalisation
Documents              library with filters by entity, type, date
Depreciation           assets | schedules | postings
Reports                P&L | cash flow | VAT | per-property performance | portfolio equity
Settings               company | users & roles | bookkeeping config | audit log | integrations
```

### 10.1 Property dashboard

Main image, address, purchase price, total acquisition cost, current valuation, outstanding debt, estimated equity, occupancy, current tenant, rent, cash generated YTD, mortgage/leasing summary, active projects, upcoming costs, recent transactions, documents.

---

## 11. Phased implementation plan

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| **1. Foundation** | Cloud enabled, design system, auth, `companies`/`profiles`/`user_roles`/`audit_log`, app shell + navigation, RLS baseline | A user can log in and see an empty, secured shell |
| **2. Properties core** | Properties, units, acquisition costs, valuations, documents + storage, property dashboard (static figures) | Three real properties entered with full cost build-up |
| **3. Bookkeeping port** | Port PSA Hub's bookkeeping module: suppliers, clients, invoices, expenses, classifications, VAT, bank accounts/transactions, `dimensions` extension point | Invoices recorded and attributed to a property |
| **4. Banking & reconciliation** | Statement import, dedupe, rules engine, matching queue, actual cash-flow reporting | A month's statement imported and fully reconciled |
| **5. Tenancies** | Tenants, agreements, rent schedules, indexation, rent invoicing, arrears | Rent roll generating invoices automatically |
| **6. Financing** | Agreements, schedule generation, versioning, payment matching, debt/equity on the property dashboard | Live mortgage reproduces the bank's amortisation table |
| **7. Projects & depreciation** | Capex projects, capitalisation into assets, depreciation schedules and postings | Depreciation run produces auditable postings |
| **8. Forecasting & reports** | Forecast scenarios, variance, portfolio reports, exports | 12-month forecast reviewed against actuals |
| **9. Hardening** | Period close, approvals workflow, audit review, security scan, backups | Ready for the accountant |

Future integration extension points prepared but not built: Google Drive backup, Gmail ingestion, Portuguese e-fatura, Open Banking, accountant exports, spreadsheet import/export. Each gets an adapter interface in `modules/bookkeeping/integrations/` with a null implementation.

---

## 12. Risks, assumptions, open questions

**Risks**

- *Bookkeeping drift.* Both apps evolve independently and porting becomes a merge. Mitigated by isolation rules, naming parity and the version marker — but it needs discipline, not tooling.
- *Reconciliation quality.* Partial and batch payments are where these systems fail. Budget real time for phase 4.
- *Mortgage accuracy.* Euribor refix conventions, day-count and rounding must match the bank statement to the cent, or trust in the whole app erodes.
- *VAT on property.* Portuguese property VAT (exemptions, waiver of exemption, pro-rata deduction) is genuinely intricate and may not be modelled by PSA Hub's current VAT engine.
- *Scope.* This is a large system. Phases 1–4 deliver most of the value; resist building 5–8 in parallel.

**Assumptions**

- Single legal entity, EUR only, Portuguese tax context, accrual basis alongside cash tracking.
- Small user count (under ~10), all trusted internal users.
- PSA Hub's finance module is production-quality and worth porting rather than rewriting.

**Open questions**

1. Does Pedra Rioja file its own VAT, and is the exemption waived on any property?
2. Is the bookkeeping here full double-entry, or transaction-and-classification like PSA Hub's current model?
3. Are properties held directly by Pedra Rioja or through SPVs (drives how soon multi-entity matters)?
4. Which bank(s), and what statement formats are available (CSV vs CAMT.053 materially affects import quality)?
5. Do leasing agreements need IFRS 16 treatment, or is a simple amortisation schedule enough?
6. Should the accountant be a user of the system, or receive exports?
7. Is rent invoicing legally required to issue certified invoices (Portuguese certified software rules), or are recibos de renda issued elsewhere?
```
