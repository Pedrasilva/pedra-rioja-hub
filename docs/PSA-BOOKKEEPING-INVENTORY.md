# PSA Hub — Bookkeeping / Financial Module Inventory

_Read-only inventory. No comparison with Pedra Rioja, no migration proposals, no code changes._
_Source: PSA Hub repository (project `945f60ba…`), `supabase/migrations/**`, `src/integrations/supabase/types.ts` (9 844 lines, generated), `src/lib/finance/**`, `src/components/finance/**`, `src/routes/_app.finance.*`, `docs/finance-qa-status.md` (last updated 2026-05-17)._

> **Row counts are not available.** Cross-project access to PSA Hub is source-code only; its database cannot be queried from here. Every "contains production data" judgement below is inferred from code paths, migrations, backfill functions and the QA note, and is labelled as inference.

---

## 1. Database

### 1.1 Core document chain (the operational spine)

| Table | Purpose | Key columns | Relationships | Live data (inferred) |
| --- | --- | --- | --- | --- |
| `financial_documents` | VAT/accrual source of truth for invoices, bills, credit notes, receipts | `direction`, `doc_type`, `status`, `series`, `document_number`, `atcud`, `issue_date`, `due_date`, `vat_period`, `subtotal_ex_vat`, `vat_amount`, `total_inc_vat`, `paid_amount`, `outstanding_amount` (generated), `currency`, `source`, `source_ref_table`/`source_ref_id`, `file_path`, `ocr_metadata`, `invoicexpress_id`/`_type`/`_status`, `permalink_pdf`, `last_sync_at`/`last_sync_error`, `counterparty_supplier_id`, `counterparty_client_id`, `counterparty_name_snapshot`, `classification_id`, `project_id`, `created_by` | → `companies` (twice), `financial_classifications`, `pm_projects` | **Yes — production.** QA note documents live docs plus a documented cleanup recipe |
| `financial_document_lines` | Line detail with VAT and per-line classification/project | `description`, `quantity`, `unit_price_ex_vat`, `vat_rate`, `vat_code`, `amount_ex_vat`, `vat_amount`, `amount_inc_vat` (generated), `classification_id`, `project_id`, `reimbursable`, `sort_order` | → `financial_documents` (cascade), `financial_classifications`, `pm_projects` | Yes |
| `financial_document_payments` | Settlement bridge document ↔ bank | `amount`, `payment_date`, `method` (enum), `bank_transaction_id`, `notes`, `created_by` | → `financial_documents`, `bank_transactions` | Yes |

Triggers on this chain:
- `trg_findoc_updated_at`, `trg_findoc_line_updated_at`, `trg_findoc_pay_updated_at` → `update_updated_at_column()`
- `trg_findoc_pay_recalc` (AFTER INSERT/UPDATE/DELETE on payments) → `financial_document_recalc_payment()` — recomputes `paid_amount` and derives `paid` / `partially_paid`
- `trg_bank_tx_auto_classify_on_payment_ins` and `…_upd` → auto-classifies the linked bank transaction when a payment is recorded or re-pointed

Indexes present: `idx_findoc_classification`, line indexes on document/classification/project plus a partial index `… (reimbursable) WHERE reimbursable = true`, `idx_findoc_pay_date`.

Constraints: `outstanding_amount` and `amount_inc_vat` are **generated columns** (the inconsistency report checks for drift); FK cascade from lines/payments to document.

### 1.2 Counterparties and master data

| Table | Purpose | Notes | Live data |
| --- | --- | --- | --- |
| `companies` | **Single master table for suppliers *and* clients**, Portuguese column names (`nome`, `morada`, `notas`, `telefone`, `industria`) | Role flags `is_supplier`, `is_client`, `is_reimbursement_supplier`; `nif`, `code`, `abbreviation`, `currency`, `payment_terms`, `status` enum `company_status` (`activo`/`prospecto`/`inactivo`), `is_active`, `default_classification_id` → **`expense_categories`** (not `financial_classifications` — see §7) | **Yes — production**, also used by CRM |
| `financial_suppliers` | Older supplier list from the Excel seed era | Superseded in the document chain by `companies` | Legacy, likely seeded rows |
| `financial_clients` | Older client list from the Excel seed era | Same | Legacy, likely seeded rows |
| `pm_suppliers` / `pm_suppliers_directory` | Project-management supplier register, distinct from finance | Referenced by `company_expenses.supplier_id` | Yes (projects domain) |

`companies` is shared with CRM (`crm_accounts`, `crm_activities`, `crm_opportunities`, `contacts` all reference it), so it is not a finance-private table.

### 1.3 Classification / chart

| Table | Purpose |
| --- | --- |
| `financial_classifications` | Hierarchical chart: `code` (globally unique), `name_pt`, `name_en`, `parent_id`, `level` (`category`/`group`/`subgroup`), `financial_nature`, `spending_policy`, `affects_cash_flow`, `affects_profit`, `project_link_allowed`, `collaborator_link_allowed`, `supplier_required`, `reimbursable_default`, `sort_order`, `active` |
| `expense_categories` | Older, flatter category list from the Excel import; still the FK target of `companies.default_classification_id` |

### 1.4 Banking

| Table | Purpose | Notable |
| --- | --- | --- |
| `bank_accounts` | Account register with `opening_balance`, `opening_balance_date`, IBAN/BIC, `is_active` | No `company_id` |
| `bank_balance_snapshots` | Manual/statement closing balances (`snapshot_date`, `balance`, `source`) | |
| `bank_statement_imports` | Import batches: `file_checksum`, `file_name`, `rows_total/imported/skipped`, `period_start/end`, `status` (`pending`/`imported`/`rolled_back`/`archived`), `undone_at`/`undone_by`/`undo_reason`, `moved_at`/`moved_by`/`original_account_id`, `exported_at` | Undo + account-move are first-class |
| `bank_transactions` | Immutable cash truth: `amount`, `transaction_date`, `value_date`, `description`, `row_checksum`, `raw_row` (jsonb), `running_balance`, `status` (`unclassified`/`classified`/`ignored`/`internal_transfer`/`archived`), `suggested_classification_id`, `suggested_by_rule_id`, `classified_at`/`classified_by`, `ignored_reason` | Dedup by `row_checksum` |
| `bank_transaction_classifications` | Split rows: `amount`, `classification_id`, plus optional `project_id`, `supplier_id`, `client_id`, `collaborator_id`, `reimbursable` | This is PSA's dimension mechanism |
| `bank_classification_rules` | `name`, `pattern`, `match_type` (`contains`/`starts_with`/`ends_with`/`equals`/`regex`), `case_sensitive`, `priority`, `needs_review`, `classification_id`, `active` | Suggestion only |

DB functions: `bank_import_undo(_import_id, _reason, _force)`, `bank_import_move_account(_import_id, _new_account_id)`.

### 1.5 Planning / legacy ledger (Excel-seed generation)

| Table | Purpose | Status |
| --- | --- | --- |
| `financial_periods` | Month periods: `year`, `month`, `month_name` (trigger-filled), `status` enum `projected`/`active`/`validated`/`closed` | Live, drives the dashboard |
| `financial_period_totals` | **View**, not a table — per-period rollup incl. `closing_balance` | Derived |
| `financial_income_items` | Planned/actual income lines, `client_id` → `financial_clients`, `financial_invoice_status` | Legacy planning layer |
| `financial_expense_items` | Planned/actual expense lines: `expense_type`, `amount_ex_vat`, `amount_inc_vat`, `actual_amount_inc_vat`, `period_id`, `category_id`, `source_ref_id`, `financial_expense_status` | Still live — benefit expenses link into it |
| `financial_expense_payments` | Settlement rows against `financial_expense_items` | Live (backfill functions exist) |
| `financial_debts` | Loans/creditors: `creditor_name`, `original_amount`, `outstanding_amount`, `financial_debt_status` | Prototype-to-partial |
| `financial_debt_payments` | Planned vs actual instalments, `period_id` | Prototype-to-partial |
| `financial_import_logs` | Excel/CSV import audit: `import_type`, checksum, counts | Live |
| `company_expenses` | Generic company costs, deliberately with **no** `project_id`; `pm_expense_category`/`pm_expense_status` enums | Live, parallel to the document chain |
| `pm_expenses`, `pm_invoices`, `pm_invoice_items`, `pm_invoice_settings` | Project-side billing and the own-company fiscal identity (`pm_invoice_settings.company_nif`) | Live |
| `benefit_expenses` + `benefit_expense_ocr_extractions`, `_events`, `_drive_sync`, `benefit_expenses_v` | HR benefit expense chain that **links into finance** via `financial_expense_items` | Live |

### 1.6 Enums (finance-relevant)

```
financial_doc_direction     issued | received
financial_doc_type          client_invoice | client_credit_note | supplier_invoice |
                            supplier_credit_note | receipt | other
financial_doc_status        draft | issued | partially_paid | paid | cancelled
financial_doc_source        manual | project | import | ocr
financial_payment_method    bank_transfer | cash | card | direct_debit | other
financial_nature            operational | project_cost | payroll | tax | financing | transfer | income
financial_class_level       category | group | subgroup
financial_spending_policy   mandatory | discretionary | pass_through
financial_period_status     projected | active | validated | closed
financial_expense_status    projected | confirmed | paid | overdue | cancelled
financial_expense_type      operational | debt | project | consultant | tax | other | materials
financial_invoice_status    planned | issued | paid | overdue | cancelled
financial_debt_status       open | partially_paid | paid | renegotiated
financial_debt_payment_status  planned | paid | overdue | skipped
bank_tx_status              unclassified | classified | ignored | internal_transfer | archived
bank_import_status          pending | imported | rolled_back | archived
bank_rule_match_type        contains | starts_with | ends_with | equals | regex
company_status              activo | prospecto | inactivo
app_role                    admin | user
pm_role                     admin | partner | project_lead | architect | hr | finance
```

### 1.7 RLS

Uniform pattern, **no tenancy dimension anywhere** — there is no `company_id` / `workspace_id` on any finance table:

| Table | SELECT | WRITE |
| --- | --- | --- |
| `financial_documents`, `_lines`, `_payments` | `has_role(admin) OR has_permission('finance.dashboard')` | same predicate, `FOR ALL` |
| `bank_transactions` (and siblings) | same | same |
| `financial_classifications` | any authenticated (`USING (true)`) | admin only |
| `companies` | any authenticated (`USING (true)`) | admin only |
| `financial_import_logs` | admin only | admin only |

Audit: no generic audit-log table for finance. Auditable facts are column-level (`created_by`, `classified_by`, `undone_by`/`undo_reason`, `moved_by`, `last_sync_error`) plus `financial_import_logs`. `fee_proposal_audit_log` exists but is proposals-only.

### 1.8 Finance-relevant DB functions

`financial_document_recalc_payment()` · `financial_set_month_name()` · `bank_tx_auto_classify_on_payment` · `bank_import_undo` · `bank_import_move_account` · `finance_inconsistency_report()` · `finance_reset_test_data(_confirm)` · `finance_delete_unused_supplier_companies(_confirm)` · `finance_settle_expense(...)` · `finance_mark_benefit_paid(...)` · `financial_expense_payment_backfill_preview/_run()` · `benefit_expense_link_to_finance` / `_cancel_finance_link` / `_finance_backfill_preview` / `_run` · `import_financial_data(...)` (bulk Excel seed) · `get_reimbursement_supplier_id()` · permission helpers `has_role`, `has_permission`, `has_module_permission`, `list_user_effective_permissions`, `is_super_admin`.

---

## 2. Functional modules

| Module | State | Notes |
| --- | --- | --- |
| **Suppliers** | Complete | `SuppliersMasterData`, admin-gated CRUD via `companies.functions.ts`, NIF validation, own-company NIF guard, fuzzy `supplier-matching.ts` |
| **Clients** | Complete | `ClientsMasterData`, symmetric |
| **Companies (counterparty master)** | Complete but overloaded | One table serving finance suppliers, finance clients, CRM accounts and reimbursement pseudo-suppliers |
| **Invoices (sales)** | Complete | `InvoicesWorkspace` + `invoice-editor-dialog`, `direction='issued'` |
| **Bills / purchases** | Complete | `PurchasesWorkspace` + `purchase-editor-dialog` |
| **Quotations** | Complete but **outside finance** | `crm_quotes`, `quote_*`, `fee_proposals` — proposals domain, no link into `financial_documents` |
| **Purchase orders** | Not implemented as such | Nearest equivalent is `pm_external_services` (`draft→approved→ordered→invoiced→partially_paid→paid`) in the projects domain |
| **Projects (as a finance dimension)** | Complete | `project_id` on documents, lines and bank splits; `use-project-financials.ts`, `project-financial-panel`, `project-billing-tab` |
| **Expenses** | Partially complete, **three parallel systems** | (a) `financial_expense_items` legacy planning, (b) `company_expenses` generic, (c) `benefit_expenses` HR chain bridged into (a) |
| **Income** | Partially complete | `financial_income_items` legacy planning, superseded operationally by `financial_documents` |
| **Bank reconciliation** | Complete for the implemented scope | Import → classify → link/split → create-doc-from-tx |
| **Payments / settlement** | Complete forward path, **no reversal** | `SettlementWorkspace` both directions; settlement history is read-only by design |
| **VAT** | Partial | Per-line `vat_rate`/`vat_code`, `vat_preset-picker`, `vat_period` on documents, a `vatMode` toggle in the finance shell; **VAT report screen and `vat-rates` admin are placeholders** |
| **Withholding (retenção na fonte)** | **Absent in finance** | Withholding exists only in HR/IRS payroll (`irs.ts`), not on financial documents |
| **Financial reports** | Mostly placeholder | Cash-flow report implemented; forecast, VAT, project financials are stubs |
| **OCR** | Complete for purchases | `purchase-ocr.functions.ts`, Lovable AI gateway, `google/gemini-2.5-flash`, strict JSON schema, NIF normalisation + supplier auto-match, reads the `financial-documents` storage bucket; does not persist an extraction row (document owns `file_path` and `ocr_metadata`) |
| **InvoiceXpress** | Complete for one operation | `issueFiscalInvoice` — create draft → finalise → write back `atcud`, `series`, `permalink_pdf`, `invoicexpress_id/type/status`; issued direction only, one-shot, no fetch-back/cancel/sync-in |
| **Recurring payments** | Not implemented | No table, no scheduler |
| **Recurring invoices** | Not implemented | Nearest: `quote_payment_schedule_items` / `pm_payment_schedule_items` (project billing plans, not finance recurrence) |
| **Budgets** | Not in finance | `budget` lives on `pm_stages` / quotes, project domain only |
| **Forecasts** | Not implemented in finance | Route is a placeholder; project forecasting exists separately (`src/lib/project-forecasting`) |
| **Document storage** | Partial | Supabase Storage bucket `financial-documents` + `financial_documents.file_path`. **Google Drive sync exists only for HR benefit expenses** (`benefit_drive_folders`, `benefit_expense_drive_sync`), not for financial documents |
| **Imports** | Complete (two flavours) | Bank statement import (`bank-statement-parser.ts`, `bank-imports-manager`) and one-off Excel seed (`import_financial_data`, `import-financial-data.ts`, `import-reference.md`, `financial_import_logs`) |

---

## 3. UI — every financial screen

Shell: `_app.finance.tsx` (`FinanceLayout` + `finance-sidebar` + `finance-top-nav` + `finance-shell-context` carrying the `vatMode` toggle), EN and PT-PT locale files (`i18n/locales/*/finance.json`).

| Route | Component | Completion | Missing / limitations |
| --- | --- | --- | --- |
| `/finance/` | `FinanceOverviewPage` | Partial | Cards read `financial_periods` projections, not `financial_documents` actuals — figures lag the workspaces |
| `/finance/invoicing/invoices` | `InvoicesWorkspace` | Complete | — |
| `/finance/invoicing/receipts` | `SettlementWorkspace direction="issued"` | Complete | No reversal |
| `/finance/invoicing/clients` | `ClientsMasterData` | Complete | — |
| `/finance/invoicing/inflows` | — | **Placeholder** | Empty stub |
| `/finance/payments/purchases` | `PurchasesWorkspace` | Complete | — |
| `/finance/payments/outflows` | `SettlementWorkspace direction="received"` | Complete | No reversal |
| `/finance/payments/suppliers` | `SuppliersMasterData` | Complete | — |
| `/finance/payments/expenses` | `ExpensesSection` (legacy-sections) | Partial | Legacy `financial_expense_items` model |
| `/finance/payments/cards` | — | **Placeholder** | — |
| `/finance/banking/reconciliation` | `BankReconciliationTab` | Complete | No internal-transfer pairing |
| `/finance/banking/balances` | `BankBalancesSection` | Partial | Manual snapshots only |
| `/finance/banking/transactions` | — | **Placeholder** | No standalone transaction browser |
| `/finance/documents` | `FinanceDocumentsPage` | Complete | — |
| `/finance/documents/$documentId` | inline detail editor | Complete | — |
| `/finance/data/classifications` | `FinancialClassificationsAdmin` | Complete | — |
| `/finance/data/rules` | — | **Placeholder** | Rules table exists in DB with no admin UI |
| `/finance/data/vat-rates` | — | **Placeholder** | VAT presets are hard-coded in `vat-preset-picker` |
| `/finance/data/bank-accounts` | — | **Placeholder** | Accounts must be created elsewhere |
| `/finance/data/cards` | — | **Placeholder** | — |
| `/finance/reports/cashflow` | `CashFlowSection` | Partial | Period-projection based |
| `/finance/reports/forecast` | — | **Placeholder** | — |
| `/finance/reports/vat` | — | **Placeholder** | No VAT return output |
| `/finance/reports/projects` | — | **Placeholder** | Project figures live in the projects module instead |
| `/finance/admin/imports` | `ImportLogsSection` | Complete | — |
| `/finance/admin/inconsistencies` | `FinanceInconsistencyReport` | Complete | 3 checked categories |
| `/finance/admin/audit` | — | **Placeholder** | No audit trail UI |
| `/finance/admin/qa` | — | **Placeholder** | — |

**10 of 27 finance screens are placeholder stubs.** Additional finance UI mounted outside `/finance`: `project-billing-tab`, `project-financial-panel`, `quick-finance-dialogs`, `admin-reset-tool`, `companies-import-card`.

---

## 4. End-to-end workflows

| Workflow | Status | Where it stops |
| --- | --- | --- |
| **Supplier invoice (manual)** | Complete | Create draft → lines/VAT/classification/project → `draft→issued` → settle → reconcile |
| **Supplier invoice (OCR)** | Complete | Upload to `financial-documents` bucket → extract → supplier auto-match → prefill editor → save |
| **Client invoice** | Complete | Symmetric to purchases |
| **Client invoice → AT certification** | Complete one-way | `issueFiscalInvoice` writes ATCUD/series/PDF back; **no re-sync, no cancellation, no inbound fetch** |
| **Invoice sending** | **Not implemented** | Nothing emails or delivers the PDF; the InvoiceXpress permalink is the only artefact |
| **Payment / settlement** | Complete forward | Payment row → trigger recomputes `paid_amount`/status → bank tx auto-classified. **No reverse/undo** — a mistake must be fixed by deleting the payment row |
| **Bank statement import** | Complete | Parse → checksum dedup → insert → rule suggestions; undo and move-account available |
| **Bank reconciliation** | Complete | Classify / split / link to doc / create doc from tx |
| **Internal transfers** | **Stops midway** | `bank_tx_status = 'internal_transfer'` exists as a status but there is no pairing mechanism between the two legs |
| **Expense approval (HR benefits)** | Complete | Submit → approve → `benefit_expense_link_to_finance` → `financial_expense_items` → `finance_settle_expense` → paid |
| **Company expense** | Partial | `company_expenses` records exist with their own status enum, not wired into the document chain or settlement |
| **Project costing** | Partial | Costs attach via `project_id` on documents/lines/bank splits; the reporting screen for it is a placeholder |
| **Period close** | **Stops midway** | `financial_periods.status` supports `validated`/`closed` but no UI or function enforces or performs a close |
| **VAT return** | **Not implemented** | `vat_period` is stamped on documents; nothing aggregates or files |

---

## 5. External integrations

| Integration | Scope | Completeness |
| --- | --- | --- |
| **InvoiceXpress** | `src/lib/integrations/invoicexpress.functions.ts`; env `INVOICEXPRESS_ACCOUNT_NAME`, `INVOICEXPRESS_API_KEY` read inside the handler | **Partial (issue-only).** Create + finalise + write-back. Error path stores `last_sync_error` and still records `invoicexpress_id`. No cancel, no status refresh, no inbound import, no credit-note handling |
| **OCR — Lovable AI gateway** | `google/gemini-2.5-flash`, strict JSON schema, confidence scores per field | **Complete** for supplier invoices; no batch mode, no learning loop |
| **Google Drive** | `benefit_drive_folders`, `benefit_expense_drive_sync` (queue with `attempts`, statuses `pending`/`synced`/`failed`/`skipped_rejected`) | **HR benefits only.** Financial documents do not touch Drive |
| **Supabase Storage** | Bucket `financial-documents`, path stored in `financial_documents.file_path` | Complete for upload/read; no versioning or metadata layer |
| **Email** | `src/routes/api.notify-expense.ts` | Expense notification only; no invoice delivery |
| **Bank imports** | CSV/XLSX via `bank-statement-parser.ts` | Complete, file-based; no PSD2/open-banking feed |

---

## 6. Live data

**Contains production data (inferred, high confidence):** `companies`, `financial_documents`, `financial_document_lines`, `financial_document_payments`, `bank_accounts`, `bank_transactions`, `bank_transaction_classifications`, `bank_statement_imports`, `financial_classifications`, `financial_periods`, `financial_expense_items`, `financial_expense_payments`, `benefit_expenses` (+ OCR/events/drive-sync), `company_expenses`, `pm_invoice_settings`, `financial_import_logs`.

**Seeded/legacy, low churn:** `financial_suppliers`, `financial_clients`, `financial_income_items`, `expense_categories`, `financial_debts`, `financial_debt_payments`, `bank_classification_rules` (no UI to edit them).

**Must never lose data:** `bank_transactions` (immutable cash truth, checksum-deduped — re-import would not restore `classified_by`/`classified_at` or split rows), `bank_transaction_classifications`, `financial_documents` + lines + payments (AT-certified rows are legally retained), `financial_import_logs`, `bank_statement_imports` (undo lineage), `benefit_expenses`.

**Externally referenced IDs:** `financial_documents.invoicexpress_id`, `.atcud`, `.series`, `.permalink_pdf` (AT / InvoiceXpress — cannot be regenerated); `bank_transactions.row_checksum` and `bank_statement_imports.file_checksum` (dedup identity); `financial_documents.source_ref_table`/`source_ref_id` and `financial_expense_items.source_ref_id` (untyped soft links from benefits and projects); storage paths in `file_path`; `pm_projects.id` referenced from three finance tables.

**Requires special care in any future change:** the two generated columns (`outstanding_amount`, `amount_inc_vat`) — the inconsistency report exists precisely because they drifted before; the payment-recalc and auto-classify triggers (double-firing would corrupt `paid_amount`); the `companies` table, because CRM and finance share it; `benefit_expenses → financial_expense_items` soft links, which are untyped and unenforced.

---

## 7. Technical debt

**Unfinished work**
- 10 placeholder screens, including three whose backing tables already exist and hold data (`bank_classification_rules`, `bank_accounts`, VAT rates).
- Period lifecycle (`validated`, `closed`) modelled but never exercised.
- `internal_transfer` status with no pairing.
- No settlement reversal.

**Duplicate logic**
- Three counterparty registers: `companies`, `financial_suppliers`, `financial_clients`.
- Two classification systems: `financial_classifications` and `expense_categories` — and `companies.default_classification_id` points at the *older* one, which is almost certainly a latent bug.
- Three expense systems (`financial_expense_items`, `company_expenses`, `benefit_expenses`).
- Two ledgers: the legacy period-planning layer vs the document chain; the dashboard reads the former while the workspaces write the latter.
- Two permission systems: legacy (`user_roles`, `user_permissions`) and v2 (`user_role_assignments`, `list_user_effective_permissions`) — `checkFinanceAccess` queries all four.

**Temporary solutions**
- `finance_reset_test_data(_confirm)` and `admin-reset-tool.tsx` shipped in the app.
- `finance_delete_unused_supplier_companies(_confirm)` — a hard delete against a shared master table.
- Backfill pairs (`*_backfill_preview` / `*_backfill_run`) left in place after their one-off runs.
- QA seed rows documented as still live in the database (QA-PUR-001, QA-INV-001, QA Test Supplier/Client/Bank Account) with a manual cleanup recipe.

**Missing constraints**
- No tenancy column anywhere in finance.
- No uniqueness on `(direction, series, document_number)` — duplicate document numbers are possible.
- No DB-level guard against editing or deleting a `paid`/`cancelled` document or its lines.
- Payments are hard-deletable; nothing prevents over-settlement beyond UI checks.
- Soft links (`source_ref_table`/`source_ref_id`) have no FK or check constraint.
- No soft-delete pattern — deletes are physical.

**Missing RLS**
- Read of `companies` and `financial_classifications` is open to every authenticated user (CRM needs it, but it also exposes the finance chart of accounts).
- Every finance policy is a flat "admin OR `finance.dashboard`" — no per-row, per-project or per-tenant scoping, and no separation between read, record and manage.

**Missing validation**
- VAT presets hard-coded in the picker rather than data-driven.
- NIF validation applies to counterparties but is not enforced on OCR-extracted values before save.
- No currency handling beyond a `currency` column — no FX rate, and mixed-currency documents are unguarded.

**Known bugs / risks**
- `checkFinanceAccess` **fails OPEN**: any transient error in the four permission probes logs a warning and returns `true`. Documented as deliberate UX, but it is a security weakness at the UI layer.
- The 10×100 ms session-hydration retry loop is a workaround for a race, not a fix.
- Server functions in `companies.functions.ts` use `supabaseAdmin` (RLS bypassed) with a manual `requireAdmin` check — correct today, fragile as an idiom.
- Dashboard/workspace figure mismatch (documented in the QA note).

---

## 8. What is missing (judged against PSA Hub's own stated intentions)

1. Settlement reversal / correction with an audit trail.
2. VAT return preparation and a VAT rates admin.
3. Internal-transfer pairing between bank accounts.
4. Period close: validation rules, lock, and reopen.
5. Treasury forecast combining outstanding receivables and payables.
6. Bank rules admin UI and dry-run preview.
7. Bank accounts admin UI.
8. A generic finance audit log (who changed what, when, why) plus the audit screen the sidebar already advertises.
9. Recurring documents and scheduled payments.
10. Credit-note lifecycle — the enum values exist; nothing links a credit note to the document it corrects.
11. Withholding tax on documents.
12. Invoice delivery (email / client portal).
13. Document storage depth: no metadata, versioning, or Drive parity with the HR benefits chain.
14. Dashboard wired to actuals rather than projections.
15. Multi-entity / tenancy scoping.
16. Purchase orders and commitment accounting.

---

## 9. Architecture assessment

**Well designed — keep**
- The document chain shape: `financial_documents` → `_lines` → `_payments`, with accrual truth in documents, cash truth in `bank_transactions`, and payments as the explicit bridge. The separation is clean and correct.
- Generated `outstanding_amount` / `amount_inc_vat` plus the recalc trigger: totals cannot drift through the UI.
- The banking import model: checksum dedup, batch lineage, first-class undo and move-account. Genuinely strong.
- `financial_classifications` — the richest object in the module: hierarchy, nature, spending policy, and per-classification permission flags (`project_link_allowed`, `supplier_required`, `reimbursable_default`).
- `bank_transaction_classifications` as a split/dimension table.
- The `financial_doc_type` × `direction` matrix, and PT fiscal metadata (`atcud`, `series`, `vat_period`) modelled as first-class columns.
- Rule-based suggestion that never auto-reconciles.

**Should probably be redesigned**
- Counterparty master: one table with role flags, Portuguese column names, shared with CRM, and a `default_classification_id` pointing at the deprecated category table.
- The legacy planning layer (`financial_income_items`, `financial_expense_items`, `financial_debts`, `expense_categories`) coexisting with the document chain, with the dashboard reading the old one.
- The permission model: dual legacy/v2 systems, a flat binary capability, and a fail-open guard.
- Three parallel expense paths.
- Untyped soft links (`source_ref_table`/`source_ref_id`).
- Absence of any tenancy column.

**Should never be changed because it already works**
- `bank_transactions` row shape, `row_checksum` semantics, and the import/undo lineage.
- The payment-recalc trigger and generated columns.
- InvoiceXpress write-back fields (`atcud`, `series`, `invoicexpress_id`, `permalink_pdf`) — externally authoritative.
- The purchase-OCR extraction contract, which is shared in spirit with the working benefits OCR.
- The benefits → finance bridge, which is in daily use.

**Risky because production data is already there**
- `companies` — shared by finance and CRM; any structural change touches both, and a hard-delete helper already ships.
- `financial_documents` and children — AT-certified rows with external identifiers, some legally retained.
- `bank_transactions` and `bank_transaction_classifications` — manual classification effort that no re-import can reconstruct.
- `financial_expense_items` — the target of live HR benefit links plus historical backfills.
- The generated columns and their triggers — a past source of drift, now monitored by the inconsistency report.
- `financial_periods` — referenced by expense items and debt payments, and driving the dashboard.

---

_End of inventory. No changes were made to PSA Hub or to this project's application code._
