# Pedra Rioja Hub — v1.0 Master Specification

Status: **product definition**, current as of 2026-07-29 (end of Phase 7).
Audience: technical leadership, product management, future developers and
future owners of the platform.

This is the document a new senior developer or product owner should read first.
It defines what the product is, why it is shaped the way it is, and how future
work must be evaluated. It does not replace:

| Document | Role |
| --- | --- |
| `PRODUCT-STRATEGY.md` | Why Pedra Rioja Hub and PSA Hub stay separate |
| `DESIGN-PRINCIPLES.md` | The 13 behavioural rules the product obeys |
| `BOOKKEEPING-REFERENCE-DESIGN.md` | The bookkeeping product/UX reference |
| `ROADMAP.md` | What is delivered and what comes next |
| `ARCHITECTURE.md` | Table-level technical reference |

Where those documents already hold a fact, this one links rather than repeats.

Everything described below is **implemented and running** unless explicitly
marked *Planned* or *Excluded*.

---

## 1. Product vision

Pedra Rioja Hub is **a management platform for a professional property
investment company**.

It exists so the people who own and run a property portfolio can answer three
questions at any moment, from one place:

1. What do we own, and what is it worth?
2. What money is coming in and going out, and when?
3. Is the company healthy?

### Intended users

| User | What they use it for |
| --- | --- |
| **Owner / director** | Executive dashboard, reporting, liquidity, debt exposure |
| **Manager** | Properties, financing, projects, recurring obligations |
| **Bookkeeper** | Financial documents, settlements, bank reconciliation, periods |
| **Assistant** | Day-to-day recording, documents, evidence |
| **Approver** | Confirming reconciliations and period totals |
| **Viewer / advisor** | Read-only access to registers and reports |

### Business goals

- Replace spreadsheets as the operational record of the portfolio.
- Make the cash position and forward commitments visible without assembly work.
- Keep every figure traceable back to the document, contract or bank line
  behind it.
- Give directors a decision-grade view without asking them to read a ledger.

### Philosophy

The company is managed **on cash and on operations**, not on statutory
accounts. Pedra Rioja Hub is an operational management system that happens to
be financially rigorous — not an accounting package. It produces the truth an
accountant needs as input; it does not attempt to produce their output.

Explicitly: **no double-entry, no general ledger, no trial balance, no
statutory filing.** Statutory accounting remains with the external accountant,
who is served by exports.

---

## 2. Product scope

### In scope — implemented

| Area | What the product does |
| --- | --- |
| **Portfolio management** | Property register, occupancy, valuations, portfolio KPIs |
| **Properties** | Lightweight core record plus units, valuations, insurance, events |
| **Acquisitions** | Purchase data and acquisition-cost breakdown per property |
| **Financing** | Mortgages, leasing and loans with versioned repayment schedules |
| **Banking** | Accounts, opening balances, statement import, reconciliation |
| **Bookkeeping** | Counterparties, purchase/sales documents, settlements, periods, VAT |
| **Documents** | Google Drive-backed evidence with in-app metadata and links |
| **Projects / CapEx** | Capex projects and costs, budget vs committed vs actual reporting |
| **Recurring income and costs** | Recurring cash-flow rules that generate forward entries |
| **Cash flow** | One timeline across forecast, committed, actual and reconciled |
| **Forecasting** | 30/90/180/365-day liquidity projection and scenarios |
| **Reporting** | Income statement, profitability, cash flow, debt, capex, ageing, VAT, journal |
| **Executive management** | Dashboard with consolidated alerts and proactive insights |
| **Permissions and audit** | Company isolation, six roles, RLS everywhere, audit log |

### Intentionally out of scope

- Statutory accounting, double-entry bookkeeping and tax filing.
- Full lease/tenancy administration and a tenant-facing portal.
- Maintenance ticketing and works scheduling.
- Acquisition underwriting and deal modelling.
- Portfolio optimisation or investment-committee tooling.
- Direct bank feeds and live accounting-package integrations.
- Any PSA Hub integration — see `PRODUCT-STRATEGY.md`.

Exclusion is a decision, not a gap. See §15.

---

## 3. Product architecture

Information flows one way: operational records at the bottom, decisions at the
top. Nothing higher up ever owns a figure produced lower down.

```text
                     ┌──────────────────────┐
                     │ Executive dashboard  │   decisions, alerts
                     └──────────▲───────────┘
                                │ derived
                     ┌──────────┴───────────┐
                     │      Reporting       │   income, profitability, debt,
                     └──────────▲───────────┘   capex, ageing, VAT, journal
                                │ derived
                     ┌──────────┴───────────┐
                     │      Cash flow       │   forecast → committed →
                     └──────────▲───────────┘   actual → reconciled
              ┌─────────────────┼─────────────────┐
              │                 │                 │
   ┌──────────┴──────┐ ┌────────┴───────┐ ┌───────┴────────┐
   │    Financing    │ │  Bookkeeping   │ │    Banking     │
   │ agreements +    │ │ documents,     │ │ accounts,      │
   │ versioned       │ │ payments,      │ │ statements,    │
   │ schedules       │ │ periods, VAT   │ │ reconciliation │
   └──────────▲──────┘ └────────▲───────┘ └───────▲────────┘
              │                 │                 │
   ┌──────────┴─────────────────┴─────────────────┴────────┐
   │  Properties · Units · Projects · Counterparties        │
   │  Dimensions (property / unit / project attribution)    │
   └───────────────────────▲────────────────────────────────┘
                           │ evidence links
                  ┌────────┴─────────┐
                  │ Documents (Drive)│
                  └──────────────────┘
```

Two rules make this map load-bearing:

1. **Each arrow is a reference, never a copy.** Cash flow points at a financing
   instalment or a financial document; it does not restate the amount.
2. **Bookkeeping never references real estate structurally.** Attribution to a
   property, unit or project happens through the **dimensions** layer
   (`dimensions`, `dimension_values`, `transaction_dimensions`), which keeps the
   bookkeeping domain independent and portable.

---

## 4. Core modules

Maturity key: **Production Ready** (complete and tested) · **Feature Complete**
(all intended v1 behaviour present, hardening outstanding) · **In Progress** ·
**Planned**.

### Dashboard — `/dashboard`

- **Purpose** — answer "is the company healthy?" in seconds.
- **Responsibilities** — portfolio value and occupancy, liquidity with
  30/90/180/365-day forecast, financing exposure, income, costs, projects,
  bookkeeping state, consolidated alerts.
- **Owns** — nothing. Every figure is derived.
- **Consumes** — `executive_snapshot`, `executive_alerts`, `liquidity_forecast`.
- **Produces** — alerts and insights (liquidity, cost ratio, debt service,
  vacancy, budget overrun, refinancing).
- **Interfaces with** — every module, read-only.
- **Maturity** — Production Ready. Per-property dashboard tab is *Planned*.

### Properties — `/properties`, `/properties/$propertyId`

- **Purpose** — the register of what the company owns.
- **Responsibilities** — searchable card/table register, guided creation, and a
  ten-tab workspace: Overview, Details, Financing, Tenancies, Projects,
  Valuations, Insurance, Depreciation, Documents, Timeline.
- **Owns** — `properties` (deliberately small), `property_units`,
  `property_valuations`, `property_insurance_policies`,
  `property_acquisition_costs`, `property_events`, tenancy and rent records.
- **Consumes** — financing, cash-flow and document summaries by reference.
- **Produces** — the property timeline and the dimension values other modules
  attribute against.
- **Maturity** — Production Ready. Bulk CSV/XLSX import is *Planned*.

### Projects / CapEx

- **Purpose** — capital works tracked against budget.
- **Owns** — `capex_projects`, `capex_project_costs`.
- **Consumes** — property links, committed cash-flow entries.
- **Produces** — `v_capex_summary`: budget vs committed vs actual, with overrun
  alerts on the dashboard and a CapEx report tab.
- **Maturity** — **In Progress.** The data model, reporting view and property
  Projects tab exist; an editable, standalone capex workspace with a commitment
  register does not. This is the first P0 gap a reader should know about.

### Financing — property Financing tab, `/financing/$agreementId`

- **Purpose** — mortgages, leasing and loans, and what they will cost.
- **Owns** — `financing_agreements`, `financing_schedule_versions`,
  `financing_schedule_rows`, schedule imports.
- **Consumes** — properties.
- **Produces** — confirmed instalments pushed into cash flow with principal,
  interest, VAT and commission split; debt summary and maturity views.
- **Frozen behaviour** — schedules are **versioned, never overwritten**. A
  revision closes the current version from an effective date and opens a new
  one for future periods; historical and reconciled instalments are immutable.
- **Maturity** — Production Ready.

### Banking — `/banking`

- **Purpose** — what the bank actually did.
- **Owns** — `bank_accounts`, `bank_transactions`, statement imports and staging
  rows, `bank_reconciliation_matches`, `bank_transfers`.
- **Consumes** — expected items from financing, bookkeeping and recurring rules.
- **Produces** — reconciled cash movements and account balances.
- **Behaviour** — CSV/XLSX import into a staging area with deterministic
  duplicate fingerprinting and atomic confirmation; suggestions by amount/date
  tolerance and counterparty history; one-to-one, one-to-many, many-to-one and
  partial matching. **Nothing reconciles automatically.** Reversal is audited
  and requires a reason.
- **Maturity** — Feature Complete. Outstanding P0s: statement closing-balance
  control blocking confirmation on mismatch, and an unreconcile flow surfaced
  in the UI.

### Bookkeeping — `/bookkeeping`

- **Purpose** — the fiscal record of what was invoiced and paid.
- **Owns** — `counterparties`, `financial_classifications`,
  `financial_documents`, `financial_document_lines`, `financial_payments`,
  `financial_periods`, `financial_period_totals`, `bank_classification_rules`.
- **Consumes** — dimensions for attribution, documents for evidence, bank
  transactions for settlement.
- **Produces** — outstanding balances, ageing, VAT summaries, journals, and the
  cash-flow entries a posted document implies.
- **Structure** — six tabs: Purchases, Sales, Counterparties, Classifications,
  Bank rules, Periods.
- **Code boundary** — the reusable core lives in
  `src/packages/bookkeeping-core/` and knows nothing about real estate; Pedra
  Rioja injects host adapters from `src/modules/bookkeeping/host/`. This
  boundary is enforced by `tests/ui/module-boundary.test.ts` and is kept for
  cleanliness, **not** as preparation for a shared runtime package
  (`PRODUCT-STRATEGY.md`).
- **Maturity** — Production Ready. Credit notes and numbering series are
  *Planned*.

### Documents — property Documents tab, evidence panels

- **Purpose** — evidence, not bookkeeping.
- **Owns** — `documents`, `document_links`, `drive_folders`.
- **Consumes** — Google Drive as the repository of record.
- **Produces** — links and metadata attached to properties, financial documents
  and other records.
- **Maturity** — Feature Complete. Folder-provisioning retry for pending plans
  and cross-entity document search are *Planned*.

### Cash flow — `/cash-flow`

- **Purpose** — the backbone view of the product.
- **Owns** — `cash_flow_entries` (only for genuinely standalone items),
  `cash_flow_recurring_rules`, `cash_flow_scenarios`.
- **Consumes** — financing instalments, posted financial documents, bank
  transactions, capex commitments — always by linked source record.
- **Produces** — the projection, monthly aggregation and liquidity forecast.
- **Maturity** — Feature Complete. Outstanding P0s: visible collapse of
  reconciled entries against their forecast/committed counterparts in the
  chart, a base-vs-scenario comparison view, and indexation/end-date support in
  the recurring rule editor.

### Reporting — `/reports`

- **Purpose** — management reporting, drillable to the record.
- **Owns** — nothing.
- **Consumes** — views and RPCs only.
- **Produces** — eight tabs: Income statement, Profitability, Cash flow, Debt,
  CapEx, Ageing, VAT, Journal — with property and period filters, drill-down
  and CSV export. Yield, ROI and IRR (XIRR) are computed in
  `src/modules/executive/report-utils.ts`.
- **Maturity** — Production Ready. Cash-on-cash, DSCR, LTV and an investor PDF
  pack are *Planned*.

### Settings — `/settings`

- Profile, company context and Google Drive configuration.
- **Maturity** — Feature Complete for v1. A first-run company setup wizard is
  *Planned*.

### Permissions

- Six roles in the `app_role` enum: `owner`, `manager`, `bookkeeper`,
  `assistant`, `approver`, `viewer`. Roles live in `user_roles` — never on a
  profile record. Checks go through security-definer helpers
  (`has_company_role`, `can_view_company`, `can_record_company`,
  `can_manage_company`, `is_company_member`).
- **Maturity** — Production Ready at the database layer.

### Team — `/team`

- Lists members and their roles for the current company.
- **Maturity** — **In Progress.** Invite, assign and revoke are not yet wired,
  and the `approver` capability is not yet enforced by reconciliation or period
  close. Both are P0 in `ROADMAP.md`.

---

## 5. Data ownership

**Every business entity has exactly one owner.** One module writes it; every
other module references it. This single rule prevents the drift that spreadsheet
portfolios die of.

| Entity | Owner | Consumers | Derived from it | Immutable once |
| --- | --- | --- | --- | --- |
| Property | Properties | Financing, Projects, Reporting, Dimensions | Portfolio value, occupancy, timeline | never (archived, not deleted) |
| Unit | Properties | Tenancies, Reporting | Occupancy, rent roll | archived only |
| Financing agreement | Financing | Cash flow, Banking, Reporting | Debt outstanding, maturity, interest | agreement terms after first instalment |
| Schedule version | Financing | Cash flow | Current schedule, forward instalments | closed versions, always |
| Instalment | Financing | Cash flow, Banking | Committed outflows | once settled or reconciled |
| Counterparty | Bookkeeping | Documents, Banking, Ageing | Ageing, exposure | name/tax number snapshotted at posting |
| Financial document | Bookkeeping | Cash flow, Reporting, Periods | Income statement, VAT, outstanding | on posting (header and lines) |
| Payment / settlement | Bookkeeping | Banking, Cash flow | Outstanding, ageing | always — reversal only |
| Bank transaction | Banking | Cash flow, Bookkeeping | Balances, actual cash | once reconciled |
| Reconciliation match | Banking | Cash flow, Reporting | Reconciled status | always — reversal only |
| Capex project | Projects | Cash flow, Reporting | Budget vs committed vs actual | never |
| Document / evidence | Documents | Everything | — | link is audited; file lives in Drive |
| Cash-flow entry | source module (or Cash flow for standalone items) | Reporting, Dashboard | Projection, liquidity | once actual or reconciled |
| Dimension value | Dimensions | Bookkeeping, Cash flow | Attribution slices | — |

Corollaries enforced in the database, not merely by convention:

- No module writes into another module's records; guard triggers reject it.
- Reconciliation and settlement **preserve source ownership** — the amount
  belongs to the document or instalment, never to the link.
- Nothing is hard-deleted. Posted documents, payments and matches have
  no-delete triggers; correction happens through cancellation or reversal with
  a mandatory reason.

---

## 6. Design principles

The behavioural contract is `docs/DESIGN-PRINCIPLES.md` — 13 rules, from *one
source of truth* to *executive first, detail on demand*. They are not
aspirational; they are the acceptance criteria for new work.

How they govern future decisions:

| Proposal | Test it must pass |
| --- | --- |
| A new figure on a screen | Derivable from existing records — never a stored total (P2) |
| A new module | Declares what it owns and what it only references (P1, P8) |
| A destructive action | Rejected. Design the reversing event instead (P3) |
| A new report | States the statuses it includes; excludes drafts (P9) |
| A new table | Carries `company_id` and RLS from the first migration (P8) |
| A new outflow type | Travels forecast → committed → actual → reconciled (P5) |
| A new attribution need | Uses dimensions, not a foreign key into real estate (P12) |

When a requirement conflicts with a principle, the principle wins until
`DESIGN-PRINCIPLES.md` is explicitly amended.

---

## 7. Bookkeeping philosophy

The full product and UX reference is `docs/BOOKKEEPING-REFERENCE-DESIGN.md`.
In summary:

- **Counterparties** — one register for suppliers, clients, banks and
  authorities. Fiscal identity is first-class; commercial defaults pre-fill
  documents; records are archived, never deleted; identity is snapshotted onto
  the document at posting so later edits cannot rewrite history.
- **Documents** — a header plus priced lines. Line math is shown live but
  totals are authoritative only after server-side recomputation. There is no
  editable "document total".
- **Posting** — a deliberate, confirmed action, never implicit on save. It is
  what makes a document count towards reports, periods and cash flow.
- **Payments** — recorded against posted documents; partial, split and grouped
  settlement are all normal; over-settlement is rejected with a clear message
  rather than silently clamped.
- **Reconciliation** — proposals only; a person confirms. Matching supports
  one-to-one, one-to-many, many-to-one and partial links.
- **Attachments** — evidence can be added at any lifecycle stage, including
  after posting and in a closed period, and never mutates an amount.
- **Reversals** — cancellation and payment reversal require a reason and stay
  visible in the record's history. Nothing is deleted.
- **Permissions** — four capabilities (View, Record, Approve, Manage) that the
  shared core understands, mapped onto Pedra Rioja's six roles by the host
  adapter. The UI hides what the user cannot do; the server re-checks anyway.

Reporting from this domain is **operational** — outstanding balances, VAT per
period, cash effect — not a general ledger.

---

## 8. Cash flow philosophy

Cash flow is the primary management view because the company is managed on
cash. Every figure that will touch the bank account appears on one timeline.

The four statuses are a certainty ladder, and each step is visibly distinct:

```text
forecast ──► committed ──► actual ──► reconciled
   plan       contractually  money       matched to a
              owed           moved       confirmed bank line
```

- **Forecast** — recurring rules, planned works, expected income.
- **Committed** — signed instalments, posted supplier invoices, ordered works.
- **Actual** — money recorded as moved.
- **Reconciled** — tied to a confirmed bank transaction; the strongest claim.

Sources feeding the timeline, all by linked source record:

| Source | Enters as |
| --- | --- |
| Recurring obligations (rents, service charges, insurance, taxes) | forecast, generated by rules |
| Mortgages and leasing | committed, from confirmed schedule instalments |
| Projects / capex | forecast then committed as budget is drawn |
| Bookkeeping documents | committed on posting, actual on settlement |
| Bank transactions | actual, then reconciled on confirmed match |

Two invariants:

1. **Never count anything twice.** A forecast instalment, the invoice for it and
   the bank line paying it are one movement, collapsed as certainty increases.
   (Making that collapse visible in the chart is an outstanding P0.)
2. **Cash flow never re-enters an amount.** If a number is wrong, it is wrong in
   the owning module, and there is exactly one screen where it is fixed.

---

## 9. Reporting philosophy

All reporting is **derived at read time** from operational records. There are no
stored summary columns that could drift, and no report writes anything back.

- **Executive dashboard** — the first layer. Portfolio, liquidity, financing,
  income, costs, projects, bookkeeping state and a single consolidated alerts
  panel. Built from `executive_snapshot`, `executive_alerts` and
  `liquidity_forecast`.
- **Management reports** — the second layer: income statement, profitability
  per property and consolidated, cash-flow statement, debt summary, capex,
  counterparty ageing, VAT summary and document journal.
- **Drill-down** — every headline number leads to the records behind it. A KPI
  that cannot be opened is a defect.
- **Filters** — property and period filters are visible on the report surface,
  never hidden in a menu, and registers keep their filter state.
- **Exports** — CSV per report, forming the accountant hand-off pack.
- **KPIs** — occupancy, yield, ROI, IRR (XIRR), debt service, cost ratio,
  liquidity runway. Cash-on-cash, DSCR and LTV are *Planned*.

Reporting rules: drafts and cancelled documents are excluded; every report
states the statuses it includes; period totals are recomputable on demand.

---

## 10. Security model

- **Companies** are the tenancy boundary. Every domain table carries
  `company_id`. Cross-company reads and writes are impossible, including in
  reconciliation and reporting.
- **Roles** live in `user_roles`, never on a profile — a hard rule that prevents
  privilege escalation through profile edits. Six roles: `owner`, `manager`,
  `bookkeeper`, `assistant`, `approver`, `viewer`. The first user of a company
  becomes owner.
- **Capabilities** — the bookkeeping core reasons in View / Record / Approve /
  Manage; the host adapter maps roles onto them, so shared components never
  learn product role names.
- **RLS** is enabled on every public table, with explicit `GRANT`s per
  migration. Policies call security-definer helpers (`has_company_role`,
  `can_view_company`, `can_record_company`, `can_manage_company`) to avoid
  recursive policy evaluation. No policy means no access — the model fails
  closed.
- **Audit** — `audit_log` plus per-row audit triggers record who changed what.
  Reversals and cancellations carry a mandatory reason that stays visible in
  the record's history.
- **Server-side enforcement** — the UI hides what a user cannot do, and every
  mutation is re-checked server-side. UI state is never the authorisation.

Verified by `tests/rls/roles.test.ts` and per-module database tests.

---

## 11. Document strategy

- **Google Drive is the repository of record.** Files live there; the
  application stores the link and the metadata. This is deliberate: the company
  already runs on Drive, and evidence must outlive the application.
- **Metadata in-app** — name, type, size, source, uploader, date, and the
  relationships to property, unit, project, counterparty or financial document.
- **Attachments** — evidence is attached through the shared
  `AttachmentsPanel`, which reaches storage only through a host adapter, so
  `bookkeeping-core` carries no Drive dependency.
- **Immutability** — attaching or detaching evidence never changes an amount or
  a classification. That separation is what allows evidence to be added to
  posted documents and inside closed periods.
- **Lifecycle** — a record and its files stay linked for the record's lifetime;
  cancelling a document keeps its attachments. Documents are archived, never
  deleted.
- **Folder provisioning** — folder plans are generated per property from a
  template. Retry for pending plans is a *Planned* P0.

---

## 12. Product workflow

The canonical lifecycle the product is designed around:

```text
Acquire property              Properties · acquisition costs · Drive folders
        ↓
Arrange financing             Agreement + schedule version → committed instalments
        ↓
Create recurring costs        Rules → forecast entries (insurance, taxes, service)
        ↓
Manage projects               Capex budget → committed costs
        ↓
Receive supplier invoices     Counterparty + document draft + evidence attached
        ↓
Post documents                Immutable, counted in periods, VAT and cash flow
        ↓
Bank reconciliation           Statement import → suggested match → human confirms
        ↓
Cash flow updated             Forecast collapses into reconciled actuals
        ↓
Management reporting          Income, profitability, debt, capex, VAT, ageing
        ↓
Executive dashboard           Health, liquidity runway, alerts
```

Every step is a reference to the step before it. Nothing in the lower half of
this diagram re-types a figure from the upper half.

---

## 13. Testing strategy

Testing is treated as part of the architecture because the product's central
promise — *derived data never drifts* — is only credible if it is continuously
proven.

| Layer | What it proves | Where |
| --- | --- | --- |
| **Database tests** | Lifecycle, triggers, versioning, immutability, view maths | `tests/db/` |
| **RLS tests** | Company isolation and role behaviour per table | `tests/rls/` |
| **Contract tests** | Views and RPCs return the agreed shape and exclusions | `tests/db/executive-reporting.test.ts`, `views.test.ts` |
| **Helper tests** | Reporting maths — yield, ROI, XIRR, CSV, insights | `tests/ui/executive-helpers.test.ts` |
| **UI tests** | Panels, permissions, documents, settlement, attachments | `tests/ui/` |
| **Boundary tests** | `bookkeeping-core` imports nothing product-specific | `tests/ui/module-boundary.test.ts` |
| **Type safety** | Clean typecheck across the app and generated DB types | `tsgo` |
| **Production build** | The Worker bundle actually builds | `bun run build` |
| **Browser smoke** | Key routes render with zero console errors | Playwright |

Current coverage at the close of Phase 7: **285 database tests and 143 UI and
helper tests green**, with clean typecheck, successful production build and
clean smoke on `/dashboard`, `/reports` and `/bookkeeping`.

Standing rules: every new table gets an RLS regression test; every new view or
RPC gets a contract test; every financial rule that must not be broken gets a
database test rather than a comment.

---

## 14. Current state

| Module | Maturity | Notes |
| --- | --- | --- |
| Dashboard | **Production Ready** | Per-property tab planned |
| Properties | **Production Ready** | Bulk import planned |
| Financing | **Production Ready** | Versioned schedules fully covered |
| Bookkeeping | **Production Ready** | Credit notes, numbering series planned |
| Reporting | **Production Ready** | Cash-on-cash, DSCR, LTV, PDF pack planned |
| Permissions (database) | **Production Ready** | Roles, helpers, RLS, audit |
| Banking | **Feature Complete** | P0: closing-balance control, unreconcile UI |
| Cash flow | **Feature Complete** | P0: double-count collapse, scenario comparison, indexation |
| Documents | **Feature Complete** | P0: folder-provisioning retry |
| Settings | **Feature Complete** | Setup wizard planned |
| Operational intelligence | **Feature Complete** | Per-account thresholds planned |
| Projects / CapEx | **In Progress** | Reporting exists; editable workspace does not |
| Team | **In Progress** | Read-only list; invite/assign/revoke not wired |
| Depreciation | **In Progress** | Tables and property tab exist; schedules generation planned |
| Tenancies / rent roll | **In Progress** | Records exist; rent-roll screen planned |
| Data import (properties, counterparties) | **Planned** | — |
| Direct bank feeds, OCR capture, investor PDF | **Planned** | — |

Production readiness items still open — auth hardening, per-route metadata and
error boundaries on every workspace, a register-query performance pass and an
end-to-end smoke — are tracked as P0 in `ROADMAP.md`.

---

## 15. Known limitations

These are **deliberate exclusions**, each with a reason. None is an oversight,
and none should be added without revisiting this document.

| Excluded | Why |
| --- | --- |
| **Full lease management** | The portfolio's tenancies are few and stable; contract administration is handled outside. Tenancy records exist only to explain income. |
| **Tenant portal** | No external-user surface in v1; it would force a second authentication and permission model. |
| **Maintenance scheduling** | Operational ticketing is a different product category; maintenance reaches the Hub as cost and evidence. |
| **Acquisition modelling** | Underwriting happens before a property exists; modelling tools would blur the line between plan and record. |
| **Scenario planning beyond basic scenarios** | Scenario records exist, but comparison and sensitivity analysis are deferred so the base timeline stays trustworthy first. |
| **Advanced forecasting (ML, seasonality)** | Rules-based forecasting is explainable; statistical forecasting is not, and directors must be able to trace a number. |
| **Portfolio optimisation** | Decision support, not record-keeping. Out of the product's remit. |
| **External accounting integrations** | The accountant is served by CSV exports. Live integration would import another system's ownership model and break §5. |
| **Double-entry / general ledger** | The product is operational, not statutory. Stated in `DESIGN-PRINCIPLES.md` and frozen. |
| **PSA Hub integration** | Frozen decision in `PRODUCT-STRATEGY.md`: separate applications, separate databases, reference design only. |

---

## 16. Future vision

Direction, not commitment. The sequenced backlog lives in `docs/ROADMAP.md`;
**Phase 8 — Operational completeness** closes the remaining P0 items:

1. Banking closing-balance control and unreconcile UI.
2. Cash-flow double-count collapse and scenario comparison.
3. Editable capex project workspace with commitments.
4. Recurring rule editor: indexation and end dates.
5. Team management and the approver capability in reconciliation and period
   close.
6. Property/unit import and Drive folder-provisioning retry.
7. Performance pass, auth hardening, per-route metadata, end-to-end smoke.

Beyond Phase 8, the roadmap points towards depreciation schedules, a rent-roll
screen, credit notes and numbering series, richer investment metrics, and an
investor-facing report pack. None of these is scheduled here.

---

## 17. Architectural decisions

Frozen decisions. Changing one is a product-level decision, not a refactor, and
requires updating this document and `DESIGN-PRINCIPLES.md`.

| # | Decision | Why it exists | Cost of breaking it |
| --- | --- | --- | --- |
| 1 | **Single source of truth** — one owner per entity | Duplicate amounts are how spreadsheet portfolios go wrong | Two screens disagree and nobody knows which is right |
| 2 | **Derived data is never stored** | Totals drift away from their details | Dashboard contradicts the ledger behind it |
| 3 | **Cash flow owns no amounts** | It is a consumer of every other module | Corrections stop propagating |
| 4 | **Bookkeeping owns fiscal records** and never references real estate structurally | Keeps the domain independent and reportable by dimension | Attribution needs new tables per analytical question |
| 5 | **Properties table stays small** | Everything else is a related record with its own lifecycle | Wide-table sprawl and unversioned history |
| 6 | **Events, not destructive edits** | Financial history must be additive | Audit trail becomes unreliable |
| 7 | **Archive, never delete** | Historical documents must keep resolving their references | Orphaned history and broken reports |
| 8 | **Financing schedules are versioned** | Revisions must not rewrite settled instalments | Reconciled past changes retroactively |
| 9 | **Reconciliation is a human decision** | Machine matching is a proposal, not a fact | Silent wrong matches in the bank record |
| 10 | **Evidence attaches to records; Drive is the repository** | Files outlive the app; attaching must never move money | Storage lock-in and mutable amounts |
| 11 | **Reporting derives only from posted, non-cancelled data** | Draft work must not reach directors' numbers | Reports become unusable for decisions |
| 12 | **Executive-first layering** — overview → health → detail → transaction | Directors and controllers need the same data at different depths | Product becomes a ledger with a homepage |
| 13 | **Company isolation and RLS on every table, failing closed** | Multi-company separation is absolute | Cross-tenant leakage |
| 14 | **Roles in a separate table** | Profile-stored roles are a privilege-escalation vector | Users can grant themselves access |
| 15 | **Separate from PSA Hub** | Two products, two databases, reference design only | Re-opens the coupling that Phase 6e was cancelled to avoid |

---

*Maintained alongside `PRODUCT-STRATEGY.md`, `DESIGN-PRINCIPLES.md`,
`BOOKKEEPING-REFERENCE-DESIGN.md` and `ROADMAP.md`. When implementation and this
document disagree, one of the two is a defect — resolve it, do not annotate it.*
