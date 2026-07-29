# Pedra Rioja Hub — completion roadmap

Frame: finish Pedra Rioja as a complete, stable, single-product application.
No PSA Hub work. See `PRODUCT-STRATEGY.md`.

Priority key:
**[P0]** required before initial production use ·
**[P1]** important shortly after launch ·
**[P2]** optional future enhancement

## Status today

Delivered: foundation and roles (P1), property domain model (P1.5), property
register and workspace (P2), Google Drive documents (P2.5), financing and
versioned schedules (P3), cash-flow engine (P4), banking and reconciliation
(P5), canonical bookkeeping domain and workspace (P6b/6c), internal bookkeeping
module boundary (P6d). 262 database tests + 93 UI tests green.

## 1. Bookkeeping

- **[P0]** Document attachments wired to the Drive documents module from the
  document editor (link, list, open) — currently properties-only.
- **[P0]** Outstanding-balance and ageing view per counterparty (receivables /
  payables) driven from documents and payments.
- **[P0]** Period close: lock a closed period against new postings; recompute
  and freeze totals.
- **[P1]** Credit notes / corrective documents linked to the corrected document
  with automatic outstanding adjustment.
- **[P1]** Document numbering series with per-series counters and gap checks.
- **[P2]** OCR-assisted purchase capture.

## 2. Banking and reconciliation

- **[P0]** Closing-balance control per statement: expected vs computed, blocked
  confirmation on mismatch.
- **[P0]** Unreconcile flow surfaced in the UI with mandatory reason.
- **[P1]** Bank-rule dry run applied in bulk to unclassified transactions.
- **[P1]** Internal transfer pairing between own accounts.
- **[P2]** Direct bank feeds.

## 3. Cash flow

- **[P0]** Reconciled bank transactions visibly collapsing their forecast /
  committed counterparts (no double counting in the chart).
- **[P0]** Scenario comparison view (base vs scenario) on the same horizon.
- **[P1]** Liquidity alerts: projected balance below a per-account threshold.
- **[P2]** Sensitivity on interest rate and vacancy assumptions.

## 4. Recurring costs and income

- **[P0]** Recurring rule editor coverage for indexation (rent uplift, IPC) and
  end dates; regeneration without disturbing actuals.
- **[P1]** Rent roll screen: per-unit expected income, arrears, next indexation.
- **[P2]** Automatic contract-driven rule creation from tenancies.

## 5. Projects and commitments

- **[P0]** Capex project workspace: budget vs committed vs actual, fed by
  documents and cash-flow commitments.
- **[P1]** Commitment register (orders, contracts) with drawdown against budget.
- **[P2]** Milestone-based progress billing.

## 6. Taxation

- **[P0]** VAT period report: output/input VAT per period, per rate, drillable
  to documents; export.
- **[P1]** Property tax (IMI/AIMI) and stamp-duty commitments as scheduled
  cash-flow items per property.
- **[P2]** Corporate-tax estimate worksheet.

## 7. Depreciation

- **[P1]** Depreciation schedules per property/component: method, rate, useful
  life; generated non-cash entries excluded from cash flow.
- **[P1]** Accumulated depreciation and net book value on the property
  workspace.
- **[P2]** Component-level revaluation.

## 8. Accounting-oriented reporting

- **[P0]** Portfolio income statement (operational) by period, per property and
  consolidated.
- **[P0]** Accountant export pack: documents, lines, payments, classifications
  as CSV for the external accountant.
- **[P1]** Investment reporting: yield, cash-on-cash, DSCR, LTV per property and
  portfolio.
- **[P2]** Investor-facing PDF report.

## 9. Document management

- **[P0]** Drive folder provisioning verified for every property and for
  bookkeeping documents; retry for pending folder plans.
- **[P1]** Document search across properties, documents and counterparties.
- **[P2]** Expiry reminders (insurance, licences, contracts).

## 10. Dashboards

- **[P0]** Replace the phase-status dashboard with the real portfolio dashboard:
  portfolio value, debt, occupancy, 12-month net cash flow, overdue items.
- **[P1]** Per-property dashboard tab consolidating the same KPIs.
- **[P2]** Configurable widgets.

## 11. Data import

- **[P0]** Bulk property and unit import (CSV/XLSX) with the existing
  review-and-confirm pattern.
- **[P1]** Counterparty and opening-balance import.
- **[P2]** Historical bookkeeping backfill import.

## 12. Permissions

- **[P0]** Team management screen: invite, assign role, revoke — end-to-end
  against `user_roles`.
- **[P0]** Approver capability actually used by reconciliation and period close.
- **[P1]** Per-property access scoping for external stakeholders.
- **[P2]** Fine-grained audit-log viewer.

## 13. Testing

- **[P0]** End-to-end smoke covering create property → financing → document →
  settlement → bank reconciliation → cash flow.
- **[P0]** RLS regression test per new table added after Phase 6.
- **[P1]** Visual/interaction tests for the reference-design consistency rules.

## 14. Production readiness

- **[P0]** Auth hardening: email confirmation policy, password reset, Google
  provider verified.
- **[P0]** Per-route SEO/head metadata and error boundaries on every workspace.
- **[P0]** Performance pass on the register queries (indexes, pagination on
  documents and bank transactions).
- **[P1]** Backup/restore rehearsal and a data-retention note.
- **[P1]** Onboarding: first-run company setup wizard.

## Proposed next phase

**Phase 7 — Operational completeness (all P0 items above)**, sequenced:

1. Real portfolio dashboard + income statement (visible value first).
2. Bookkeeping attachments, ageing, period close.
3. Banking closing-balance control + unreconcile UI.
4. Cash-flow double-count collapse + scenario comparison.
5. VAT period report + accountant export.
6. Team management and approver capability.
7. Property/unit import, performance and auth hardening, end-to-end smoke.
