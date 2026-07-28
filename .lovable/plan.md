## Pedra Rioja — Phase 0 review

Nothing built, no Cloud, no migrations. This is a read-back of `docs/ARCHITECTURE.md` plus the decisions I verified against PSA Hub, with two amendments I recommend adopting before Phase 1.

---

## 1. The seven open questions

**Q1 — Does Pedra Rioja file its own VAT, and is the exemption waived on any property?**
Matters: property rental in Portugal is normally VAT-exempt; waiving the exemption turns rent taxable and unlocks input VAT deduction on that property. It decides whether input VAT on works/invoices is a cost or recoverable, and whether pro-rata applies.
Recommended: model VAT per property and per transaction as configurable data (waiver flag on the property, recoverable/non-recoverable split on each line), decide the real rules with your accountant later.
Alternatives: assume fully exempt (simplest, wrong the moment one property waives); assume fully taxable (over-recovers VAT).
Consequences: the recommended route costs a few extra columns now and zero rework later; either assumption costs a data migration plus restated VAT figures.

**Q2 — Full double-entry, or transaction-and-classification like PSA Hub?**
Matters: this is the single largest schema decision. Double-entry means every event produces balanced debit/credit journal lines and a trial balance; the operational model means documents, payments and classifications, with reports derived by grouping.
Verified: I searched PSA Hub's codebase — it has no journal/debit/credit tables. It runs on `financial_documents`, `financial_document_payments`, `bank_transactions`, `bank_transaction_classifications`, `financial_classifications`, `bank_classification_rules`, `bank_statement_imports`. That is operational bookkeeping.
Recommended: match PSA Hub — operational bookkeeping for v1, as you stated.
Alternative: full GL (statutory-grade, but doubles Phase 3 and breaks port parity with PSA Hub).
Consequences: you get management reporting, VAT and cash flow, not a statutory trial balance; the accountant keeps the official ledger. Amendment: **drop `journal_entries` / `journal_lines` from the Phase 1–4 schema** and keep `periods` only for period locking. A GL can be layered later as a derived posting engine without touching the operational tables.

**Q3 — Properties held directly, or through SPVs?**
Matters: SPVs mean several legal entities, separate VAT returns, separate accounts, consolidation.
Recommended: keep `company_id` on every business table from day one (already in the blueprint) but ship one company and no entity switcher.
Alternatives: hard single-entity (cheap now, a full-schema migration if an SPV appears); build multi-entity UI now (weeks of work you may never need).
Consequences: the recommended path costs one column and one RLS clause; the UI can be added in a day when needed.

**Q4 — Which banks, and which statement formats?**
Matters: reconciliation quality is set by input quality. CAMT.053 / MT940 carry structured counterparty and reference fields that let matching run automatically; bank CSV usually gives a free-text description only, forcing rules and manual review.
Recommended: build a parser interface with a CSV adapter first, add CAMT.053 when a sample file exists.
Alternatives: CSV only (permanent manual matching); CAMT first (blocked until the bank enables the export).
Consequences: adapter interface makes format a plug-in, not a rewrite. I need one real statement export per bank before Phase 4.

**Q5 — Do leasing agreements need IFRS 16?**
Matters: IFRS 16 puts a right-of-use asset and a lease liability on the balance sheet with an interest unwind; a simple amortisation schedule just tracks the payments.
Recommended: simple amortisation schedule for v1 — the versioned schedule model already handles rate resets and early repayment.
Alternative: IFRS 16 (only needed if statutory accounts are prepared under IFRS, unlikely for a Portuguese SME on SNC).
Consequences: if IFRS 16 is later required, it is an added asset/liability layer on top of existing schedules, not a rebuild.

**Q6 — Is the accountant a user, or do they receive exports?**
Matters: a user needs a role, RLS scoping, PII access rules and training; exports need a stable file format and a period-close discipline.
Recommended: exports first (CSV/XLSX per period, plus document bundles), with the `Bookkeeper` role available if they later want direct access.
Alternatives: accountant as full user from day one (more Phase 1 work, more sensitive-data exposure).
Consequences: exports are needed either way; the role matrix already covers the upgrade.

**Q7 — Must rent invoicing issue certified invoices?**
Matters: Portuguese law requires certified software for issuing invoices; *recibos de renda* are typically issued on the Finanças portal. Building issuance inside a non-certified app would be non-compliant.
Recommended: this app **does not issue** legal invoices or receipts in v1. It generates rent schedules, tracks amounts due, and records the externally-issued document number and PDF.
Alternatives: pursue certification (out of scope, costly); issue uncertified documents (compliance risk).
Consequences: rent invoicing becomes "prepare and record", not "issue". This should be locked before Phase 5 because it changes the tenancy screens.

---

## 2. Summary of the proposal

**Modules** — `modules/bookkeeping/` (portable, company-agnostic, mirrors PSA Hub) and `modules/realestate/` (properties, tenancies, financing, capex, depreciation, forecast). One-way rule: bookkeeping never imports real estate.

**Tables**
- Platform: `companies`, `profiles`, `user_roles`, `audit_log`, `settings`, `bookkeeping_config`, `bookkeeping_module_version`, `documents`, `document_links`
- Bookkeeping: `accounts`, `classifications`, `classification_rules`, `vat_rates`, `suppliers`, `clients`, `purchase_invoices(+lines)`, `sales_invoices(+lines)`, `receipts`, `payments`, `expenses`, `credit_notes`, `bank_accounts`, `bank_transactions`, `bank_statement_imports`, `import_staging_rows`, `reconciliation_matches`, `periods`, `vat_returns`, `approvals` *(journal tables removed per Q2)*
- Dimensions: `dimensions`, `dimension_values`, `transaction_dimensions`
- Real estate: `properties`, `property_units`, `property_acquisition_costs`, `property_valuations`, `tenants`, `tenancy_agreements`, `rent_schedules`, `rent_charges`, `financing_agreements`, `financing_schedule_versions`, `financing_schedule_rows`, `capex_projects`, `capex_project_costs`, `depreciation_assets`, `depreciation_schedules`, `depreciation_postings`, `cashflow_forecast_scenarios`, `cashflow_forecast_lines`

**Relationships (essentials)**
```text
company 1─* property 1─* unit
property 1─* acquisition_cost | valuation | financing_agreement | capex_project
unit    1─* tenancy_agreement *─1 tenant
tenancy 1─* rent_schedule ─0..1 sales_invoice
financing_agreement 1─* schedule_version 1─* schedule_row ─0..1 bank_transaction
capex_project 1─* project_cost ─0..1 purchase_invoice → depreciation_asset → schedule → postings
bank_account 1─* bank_transaction *─* invoices (reconciliation_matches)
any transaction *─* dimension_value (transaction_dimensions, with % allocation)
```

**Navigation** — Dashboard · Properties (→ property dashboard with overview/costs/tenancy/financing/projects/documents/transactions) · Cash Flow · Bank Accounts · Bookkeeping · Tenants · Financing · Projects · Documents · Depreciation · Reports · Settings.

**Phases** — 1 Foundation · 2 Properties core · 3 Bookkeeping port · 4 Banking & reconciliation · 5 Tenancies · 6 Financing · 7 Projects & depreciation · 8 Forecast & reports · 9 Hardening. Phases 1–4 carry most of the value.

---

## 3. The dimensions extension model

Bookkeeping tables never gain a `property_id`. Instead, three generic tables sit inside the bookkeeping module and let any host app tag any financial record:

- `dimensions` — the *kinds* of tag that exist: `property`, `unit`, `tenancy`, `financing`, `capex_project`, `receivable`. PSA Hub declares its own (`client_project`, `collaborator`).
- `dimension_values` — one row per taggable thing: `{dimension: 'property', entity_table: 'properties', entity_id: <uuid>, label: 'Rua X, 12'}`. This is the only place a bookkeeping table references a real-estate entity, and it does so by loose reference, not a hard FK.
- `transaction_dimensions` — the link: `{source_table, source_id, dimension_value_id, allocation_pct, amount}`. Many tags per record, and splits across properties are first-class.

Examples:

1. **Purchase invoice → property.** Roofing invoice EUR 12,000 on two buildings: one `purchase_invoices` row, two `transaction_dimensions` rows to the two `property` values at 60% / 40%. Per-property cost reporting sums through this table.
2. **Transaction → construction project.** The same invoice also tags `capex_project`. `capex_project_costs` references the invoice, and capitalisation reads the project tag to roll the cost into a `depreciation_asset`.
3. **Rental income → tenancy.** A `sales_invoice` for March rent tags `property`, `unit` and `tenancy`. The matching `rent_schedules` row stores `sales_invoice_id`, so the rent roll and the ledger agree without the invoice table knowing tenancies exist.
4. **Mortgage payment → financing agreement.** A bank debit of EUR 1,842.17 tags `financing` and `property`; reconciliation writes `financing_schedule_rows.actual_transaction_id`. The interest/principal split comes from the schedule version effective at that date, so the transaction stays a single line while reporting still splits it.
5. **Tenant fit-out repayment → receivable.** Fit-out paid by you and repaid monthly: a `receivable` dimension value represents the agreement. The original cost tags `property` + `receivable`; each monthly repayment tags the same `receivable` value, so the outstanding balance is the signed sum over that tag — no bespoke table, and PSA Hub's schema is untouched.

Trade-off, stated plainly: loose references mean the database cannot enforce that a `dimension_value` points at a live property. A nightly integrity check plus deletion guards in server functions cover this. That is the price of a genuinely portable bookkeeping module.

---

## 4. Bookkeeping model — confirmed

**Operational bookkeeping, not double-entry.** Confirmed against PSA Hub's code: no journal, debit or credit tables exist there. Documents (supplier/client invoices, credit notes, receipts), payments, bank transactions, classifications and rules. Pedra Rioja matches this exactly, so the port stays a file copy. `accounts` is retained only as a *classification mapping* for accountant exports, not as a posting ledger. The `journal_entries` / `journal_lines` tables are removed from the plan.

---

## 5. Portuguese VAT — structure, not rules

No tax rules hard-coded. Every invoice/expense line carries:

`net_amount` · `vat_rate_id` + `vat_rate_pct` (snapshotted) · `vat_amount` · `gross_amount` · `recoverable_vat_amount` · `non_recoverable_vat_amount` · `vat_treatment` (`standard` / `exempt` / `reverse_charge` / `not_subject` / `out_of_scope`) · `vat_exemption_reason_code` · `deduction_basis` (`full` / `pro_rata` / `none`) with `pro_rata_pct` · `tax_period` (YYYY-MM or quarter) · `vat_status` (`pending` / `included_in_return` / `settled` / `recovered` / `excluded`) · `vat_return_id` · `reviewed_by` / `reviewed_at`.

Defaults are *suggested* from configurable sources — a `vat_treatment_defaults` table keyed by property, classification and activity — then always shown for review before a line is finalised. Nothing is silently inferred, every default is overridable per line, and the override is audited. `vat_rates` is date-effective so historical documents keep the rate in force at their date. `vat_returns` groups lines by tax period and freezes the figures at submission.

---

## 6. "Canonical source + assisted port" — confirmed

All four of your points are exactly the intent:
1. Identical filenames, folder paths, table/column names, function names and interfaces in both apps — a port is a file copy plus a numbered migration.
2. Changes are ported deliberately, on request, in one direction at a time. PSA Hub is canonical; a fix lands there first, then here. `bookkeeping_module_version` records what was last ported.
3. Pedra Rioja extensions never alter core bookkeeping tables — they attach through `dimensions` and `bookkeeping_config`. If a change genuinely needs a core table, it goes into PSA Hub too, or it is not a bookkeeping change.
4. Zero data sharing: separate Cloud project, separate database, separate auth, separate users, separate storage. No cross-app API, no shared keys.

One honest caveat: this is discipline, not tooling. Lovable cannot diff or merge across projects. If both apps edit bookkeeping in parallel, the port becomes a manual merge.

---

## 7. Expensive to change after Phase 1

| Decision | Why it is costly later |
| --- | --- |
| `company_id` on every table | Adding it later means backfilling every row and rewriting every RLS policy. Keep it, even with one company. |
| Operational vs. double-entry | Switching to a GL later means a posting engine and restating history. Low risk of regret for v1 reporting needs. |
| Dimensions instead of `property_id` columns | Adding direct FKs later is easy; *removing* them after they spread through queries is not. Never add them. |
| Money type and rounding convention | `numeric(14,2)`, EUR, half-up. Changing rounding after reconciliation invalidates matched history to the cent. |
| Soft delete + audit log from day one | Retrofitting audit means history that simply does not exist for earlier periods. |
| Table and column naming parity with PSA Hub | Renaming after the port breaks parity permanently and makes every future port a merge. |
| Mortgage schedule *versioning* (vs. editing in place) | In-place edits silently restate closed periods; recovering the history afterwards is impossible. |
| Document storage path convention | Files are already written; changing the layout means moving objects and rewriting links. |
| VAT fields on lines | Adding recoverable/non-recoverable later means re-reviewing every historical line by hand. |

---

## Awaiting your approval

Nothing will be created until you confirm. On approval I will apply the two amendments (drop the journal tables; add the VAT field set and `vat_treatment_defaults`), then start Phase 1: enable Cloud, design system, auth, `companies`/`profiles`/`user_roles`/`audit_log`, app shell and RLS baseline.
