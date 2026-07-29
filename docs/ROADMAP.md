# Pedra Rioja Hub — completion roadmap

Frame: finish Pedra Rioja as a complete, stable, single-product application.
No PSA Hub work. See `PRODUCT-STRATEGY.md`.

See also `DESIGN-PRINCIPLES.md` for the behavioural rules every item below
must respect.

Priority key:
**[P0]** required before initial production use ·
**[P1]** important shortly after launch ·
**[P2]** optional future enhancement

## Status today

Delivered: foundation and roles (P1), property domain model (P1.5), property
register and workspace (P2), Google Drive documents (P2.5), financing and
versioned schedules (P3), cash-flow engine (P4), banking and reconciliation
(P5), canonical bookkeeping domain and workspace (P6b/6c), internal bookkeeping
module boundary (P6d), and **Phase 7 — executive dashboard, management
reporting, bookkeeping completion and operational intelligence**.

Phase 7 shipped: `/dashboard` executive snapshot with consolidated alerts;
`/reports` suite (income statement, profitability, cash-flow statement, debt,
performance, capex, yield/ROI/IRR) with filters, drill-down and CSV export;
document attachments, counterparty ageing, period close/reopen, journals and
VAT summaries; proactive insights (liquidity, cost ratio, debt service,
vacancy, budget overrun, refinancing).

Test coverage: 285 database tests + 143 UI and helper tests green.

## 1. Bookkeeping

- ~~Document attachments wired to the Drive documents module from the document
  editor (link, list, open).~~ **Done (Phase 7C)** — evidence can be linked,
  uploaded and detached, including on posted documents and in closed periods.
- ~~Outstanding-balance and ageing view per counterparty.~~ **Done (Phase 7C)**
  — `v_counterparty_ageing`, buckets not-due / 1-30 / 31-60 / 61-90 / 90+.
- ~~Period close: lock a closed period against new postings.~~ **Done
  (Phase 7C)** — close and reopen with audit trail.
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
- ~~Liquidity alerts: projected balance below threshold.~~ **Done (Phase 7D)**
  at portfolio level. Remaining **[P1]**: per-account thresholds.
- **[P2]** Sensitivity on interest rate and vacancy assumptions.

## 4. Recurring costs and income

- **[P0]** Recurring rule editor coverage for indexation (rent uplift, IPC) and
  end dates; regeneration without disturbing actuals.
- **[P1]** Rent roll screen: per-unit expected income, arrears, next indexation.
- **[P2]** Automatic contract-driven rule creation from tenancies.

## 5. Projects and commitments

- ~~Capex reporting: budget vs committed vs actual with overrun alerts.~~
  **Done (Phase 7B/7D)**. Remaining **[P0]**: an editable capex project
  workspace (the reporting view is read-only today).
- **[P1]** Commitment register (orders, contracts) with drawdown against budget.
- **[P2]** Milestone-based progress billing.

## 6. Taxation

- ~~VAT period report: output/input VAT per period, per rate, drillable to
  documents; export.~~ **Done (Phase 7C)** — `vat_summary` per direction, rate
  and VAT code, with CSV export.
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

- ~~Portfolio income statement (operational) by period, per property and
  consolidated.~~ **Done (Phase 7B)**.
- ~~Accountant export pack: documents, lines, payments, classifications as CSV.~~
  **Done (Phase 7C)** — journals and per-report CSV export.
- ~~Investment reporting: yield, ROI, IRR per property and portfolio.~~
  **Done (Phase 7B)**. Remaining **[P1]**: cash-on-cash, DSCR and LTV.
- **[P2]** Investor-facing PDF report.

## 9. Document management

- **[P0]** Drive folder provisioning verified for every property and for
  bookkeeping documents; retry for pending folder plans.
- **[P1]** Document search across properties, documents and counterparties.
- **[P2]** Expiry reminders (insurance, licences, contracts).

## 10. Dashboards

- ~~Replace the phase-status dashboard with the real portfolio dashboard.~~
  **Done (Phase 7A)** — portfolio, liquidity with 30/90/180/365-day forecast,
  financing, income, costs, projects, bookkeeping and a consolidated alerts
  panel.
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

## Phase 7 — closed

Delivered as described under "Status today": executive dashboard (7A),
management reporting (7B), bookkeeping completion (7C) and operational
intelligence (7D), with database contract tests for the new views and RPCs,
helper tests for the reporting maths, and UI tests for document attachments.

Deliberately left out of Phase 7 (and now sequenced below): editable capex
project workspace, scenario comparison, per-account liquidity thresholds, and
the accountant PDF pack.

## Proposed next phase

**Phase 8 — Operational completeness (remaining P0 items)**, sequenced:

1. Banking closing-balance control + unreconcile UI.
2. Cash-flow double-count collapse in the chart + scenario comparison.
3. Editable capex project workspace with commitments.
4. Recurring rule editor: indexation and end dates.
5. Team management screen and the approver capability in reconciliation and
   period close.
6. Property/unit import, Drive folder provisioning retry.
7. Performance pass, auth hardening, per-route metadata, end-to-end smoke.
