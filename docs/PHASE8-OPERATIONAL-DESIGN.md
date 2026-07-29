# Pedra Rioja Hub — Phase 8 operational design

Status: **product design, planning only**, written 2026-07-29.
No code, schema or migration is changed by this document.

Reference documents this one obeys rather than repeats:

| Document | Role |
| --- | --- |
| `PRODUCT-STRATEGY.md` | Single product, separate from PSA Hub |
| `DESIGN-PRINCIPLES.md` | The 13 behavioural rules every proposal must pass |
| `V1-MASTER-SPECIFICATION.md` | What exists today, and who owns which record |
| `ROADMAP.md` | Delivered work and the outstanding P0/P1/P2 list |

**The question this document answers:** with v1.0 architecture in place, what
would the operations director of a property investment company still have to do
*outside* Pedra Rioja Hub — in spreadsheets, email, a calendar or their head?
Those activities, and only those, are Phase 8 candidates.

**The bar for every recommendation below:** it must be an activity a property
investment company performs regularly, it must not be solvable by an existing
module, and it must fit the existing architecture without redesign. Where an
existing module already solves the problem, this document says so and stops.

---

## 1. Operational lifecycle

The lifecycle of one investment property, stage by stage, with what the product
does today and what the operator still does elsewhere.

### 1.1 Acquisition

**Today.** A property is created through the guided workflow with its purchase
data and an acquisition-cost breakdown (`property_acquisition_costs`). Purchase
payments reach cash flow through bookkeeping documents or financing.

**Gap.** Everything *before* the property exists. Deals under consideration —
address, asking price, agent, offer made, offer status, expected yield — live
in a spreadsheet. There is no record of what was looked at and rejected, and no
way to see committed acquisition capital against available liquidity.

**Verdict.** A **light acquisition pipeline** is a real gap. Full underwriting
and deal modelling are not (see §10).

### 1.2 Due diligence

**Today.** Nothing. Documents can be filed against a property, but only once the
property record exists — i.e. after the decision.

**Gap.** Due diligence is a *checklist* activity: land registry extract,
licence, energy certificate, structural survey, tax situation, condominium
minutes, tenancy verification. Each item has an owner, a status and an evidence
document. This is currently a Word checklist.

**Verdict.** Gap. Best solved as a **reusable checklist attached to a pipeline
deal**, reusing `documents`/`document_links` for evidence — not as a new
document store.

### 1.3 Financing

**Today.** Fully supported and Production Ready: agreements, versioned
schedules, import, instalments into cash flow, debt and maturity reporting.

**Gap.** Only the *pre-contract* phase: comparing offers from two or three
banks before signing. Low value — this happens once per acquisition and a
spreadsheet is adequate. **Out of scope.**

### 1.4 Refurbishment

**Today.** `capex_projects` and `capex_project_costs` exist, `v_capex_summary`
reports budget vs committed vs actual, overruns raise dashboard alerts, and the
property Projects tab lists them.

**Gap.** The workspace is read-only. There is no way to create or edit a
project, record a supplier quotation, place an order, or track drawdown against
budget in the application. Project managers do this in a spreadsheet and the
numbers only arrive when the invoice is booked — which means *committed* spend
is invisible, breaking design principle 5 (forecast → committed → actual).

**Verdict.** The single largest operational gap. See §5.

### 1.5 Ready to let

**Today.** Nothing. A unit is either occupied or not.

**Gap.** The readiness state of a vacant unit — works finished, certificates
valid, photographs taken, marketing started, viewings held. Today an operator
knows this only by asking.

**Verdict.** Partial gap. A **unit availability state plus a vacancy record**
(void start, reason, target rent, expected re-let date) is worth having because
it feeds voids cost and liquidity forecasting. Marketing and viewings are CRM
work and are **out of scope** (§10).

### 1.6 Occupied

**Today.** `tenants`, `tenancy_agreements`, `rent_schedules`,
`tenant_fitout_loans` and `v_property_rent_roll` exist; recurring cash-flow
rules generate expected rent; the property has a Tenancies tab.

**Gap.** Lease *administration* on top of that data: which leases expire in the
next 12 months, which rents are due for indexation and when, deposits held,
break options, arrears per tenant. The rent-roll view exists but there is no
operational screen that turns it into a work list.

**Verdict.** Gap — but an **extension of the tenancy module**, not a new one.

### 1.7 Maintenance

**Today.** Nothing. A repair is visible only when its invoice is booked.

**Gap.** The whole reactive-maintenance cycle: a fault is reported, a contractor
is instructed, a quotation is approved, work is done, an invoice arrives. Today
this lives in WhatsApp and email; the company cannot answer "what is
outstanding on this building?" or "what did we spend on lifts last year?"
without reading invoices.

**Verdict.** Core gap. The maintenance *job* is the missing operational record;
its cost is already owned by bookkeeping and must stay there.

### 1.8 Capital improvements

Same machinery as §1.4 — an editable capex project with commitments serves both.
The only distinction that matters is classification (capitalised vs expensed),
which `financial_classifications` already carries.

### 1.9 Refinancing

**Today.** Debt summary, maturity view and a refinancing insight on the
dashboard. Schedule versioning already handles the *result* of a refinancing
correctly and immutably.

**Gap.** Only the intent: flagging "we intend to refinance this agreement in
Q2, target rate X" so it appears in forecasting. Small.

**Verdict.** Later — a lightweight field/annotation on the agreement, not a
module.

### 1.10 Disposal

**Today.** A property can be archived. There is no sale record, no disposal
proceeds, no gain calculation, no mortgage settlement flow.

**Gap.** Real, but rare — a portfolio of this size disposes of a property every
few years. When it happens it is a bookkeeping document plus a financing
settlement plus a status change, all of which exist.

**Verdict.** **Later.** A guided disposal workflow that stitches the existing
pieces together and computes gain vs book value is worth building once
depreciation and valuation are in daily use — not before.

### 1.11 Lifecycle coverage summary

| Stage | Coverage today | Phase 8 action |
| --- | --- | --- |
| Acquisition | Partial (post-decision only) | 8C — pipeline |
| Due diligence | None | 8C — checklists on pipeline deals |
| Financing | Complete | — |
| Refurbishment | Reporting only | **8A — editable projects + commitments** |
| Ready to let | None | 8B — unit availability + vacancy record |
| Occupied | Data yes, workflow no | 8B — lease administration screens |
| Maintenance | None | **8A — maintenance jobs + contractors** |
| Capital improvements | Reporting only | 8A (same as refurbishment) |
| Refinancing | Reporting yes, intent no | Later |
| Disposal | Archive only | Later |

---

## 2. Operational domains

Classification key: **Core (Phase 8)** · **Later** · **Out of scope**.
"Extends X" means no new module — an existing owner gains records or screens.

| Domain | Class | Rationale |
| --- | --- | --- |
| **Asset management** | Core — extends Properties | The per-property operational view (condition, open jobs, compliance status, vacancy, capex in flight) is the manager's home screen and does not exist. Everything it shows is derived from other modules. |
| **Maintenance (reactive)** | **Core** | The most frequent daily activity in the company and entirely absent. Without a job record, spend has no operational cause and contractors cannot be evaluated. |
| **Preventive maintenance** | Core — thin | Lifts, boilers, fire systems and gutters recur on fixed intervals. A recurring maintenance schedule that raises jobs is a small addition once jobs exist, and it converts surprise spend into forecast spend (principle 5). |
| **Contractors** | Core — **extends Counterparties** | A contractor is a counterparty that already exists in bookkeeping. What is missing is the operational overlay: trade, service area, insurance expiry, rating. Do **not** create a second supplier register. |
| **Insurance** | Already solved — extend slightly | `property_insurance_policies` exists with a property tab. Missing only: renewal alerts on the dashboard and premium visibility in cash flow. |
| **Compliance** | Core | Licences, condominium obligations, tax obligations (IMI/AIMI), habitation permits. A compliance obligation is a dated, evidenced, recurring item; failure is expensive. Implement as one **obligations register**, not one table per obligation type. |
| **Certificates** | Core — same register | An energy certificate, lift inspection certificate and fire certificate are all "an obligation with an expiry date and an evidence document". One register, one alert path. |
| **Energy performance** | Core — same register | As above. No separate module; a certificate type. |
| **Inspections** | Core — thin | A periodic property inspection is a preventive job whose output is a report document and possibly new maintenance jobs. Reuse jobs; do not build an inspection module. |
| **Health & safety** | Later — same register | For a residential/commercial landlord in Portugal this is a subset of compliance obligations. No separate treatment until a specific legal requirement demands it. |
| **Utilities** | Later | Meters, suppliers and consumption. Utility *cost* is already handled by recurring rules and bookkeeping. Consumption tracking is only worth it once void periods and re-billing are common. |
| **Keys & access** | Later | Real, small, and safely a property-level document/note until then. |
| **Warranties** | Later — extends Projects | A warranty is an attribute of completed capex work (contractor, expiry, evidence). Trivial once the project workspace exists; worthless before. |
| **Service contracts** | Core — thin | Cleaning, lift maintenance, security, gardening: recurring obligations with a supplier, a renewal date and a cost that must appear in cash flow. Model as a **contract record that owns a recurring cash-flow rule** — the rule already exists. |
| **Rent reviews** | Core — extends Tenancies | Portuguese leases index annually (IPC). Missing the review means losing revenue permanently. `ROADMAP.md` already lists indexation in the recurring editor as P0; the operational half is a review work list. |
| **Vacancies** | Core — extends Properties/Tenancies | Void tracking with reason and target re-let date. Feeds vacancy alerts (which exist) with real data instead of inference. |
| **Tenant management** | Core (administrative only) | Tenant record, contact, deposit, arrears position. Already largely present in `tenants`; needs a screen. Tenant-facing portal and communications: **out of scope**. |
| **Lease administration** | **Core** | Expiries, break options, deposits, indexation, arrears — the work list on top of existing tenancy data. |
| **Acquisition pipeline** | Core — light | See §1.1. Stage, price, agent, decision, linked due-diligence checklist. Converts to a property on completion. |
| **Disposal pipeline** | Later | Too infrequent to justify before the rest. |
| **Business planning** | Later — extends Cash flow | Annual plan by property and category. Real value, but scenarios already provide the mechanism; adding budgets before projects are editable would create a plan nobody can execute against. |
| **Budgeting** | Later — extends Cash flow | Same. Budget vs actual per property/category is a reporting layer over existing records. |
| **Scenario planning** | Already solved — finish it | `cash_flow_scenarios` exists; the base-vs-scenario comparison view is an outstanding P0 in `ROADMAP.md`. Finish, do not redesign. |
| **Investment analysis** | Already solved | Yield, ROI, IRR (XIRR) ship in reporting. Cash-on-cash, DSCR and LTV are listed P1 additions to the same report — extend, do not build. |
| **Portfolio strategy** | Out of scope | Hold/sell/refinance strategy is a boardroom judgement informed by the reporting the product already produces. Encoding it would be modelling opinion, not fact. |

### 2.1 The three genuinely new record types

Everything classified Core above collapses into **three new owned records** plus
extensions of existing ones. This matters: it is the measure of whether Phase 8
respects the architecture.

1. **Maintenance job** — a dated unit of work on a property/unit, with a
   contractor (counterparty), a status, optional quoted amount, and links to
   evidence and to the resulting financial document. Owns *the work*, never
   *the money*.
2. **Obligation** — a recurring or dated compliance/certificate item on a
   property, company or agreement, with a due date, responsible role and
   evidence document. Owns *the deadline*, never *the document* (Drive) or
   *the cost* (bookkeeping).
3. **Pipeline deal** — a pre-property opportunity with a stage, indicative
   figures and a due-diligence checklist. Owns *the intent*, and is converted
   into a property rather than duplicated as one.

Everything else in Phase 8 is a screen, a work list, an alert, or a field on a
table that already exists.

---

## 3. Daily operations — the property manager

A realistic weekday, and where each activity should happen.

| Time | Activity | Today | Should be |
| --- | --- | --- | --- |
| Morning | "What needs me today?" | Nothing — email inbox | **Operations work list**: overdue jobs, quotes awaiting approval, obligations expiring, leases expiring, arrears, unreconciled bank lines. One screen, role-filtered. |
| Morning | Tenant reports a leak | WhatsApp | Create a **maintenance job** against the unit in two fields: property/unit + description. Everything else optional. |
| Morning | Instruct a plumber | Phone + email | Assign the contractor on the job; the contractor is an existing counterparty. Record expected cost as a **committed** cash-flow amount. |
| Midday | Quotation arrives for a roof repair | Email, then a folder | Attach the quotation to the job (Drive evidence, existing adapter). Mark job as *awaiting approval* — it now appears on the director's approval list. |
| Midday | Book supplier invoices | **Already supported** — bookkeeping purchases | Unchanged, plus: pick the job so the cost attaches to the work. Attribution via **dimensions**, not a foreign key (principle 12). |
| Afternoon | Chase an unpaid rent | Spreadsheet | Arrears list from `v_property_rent_roll` and outstanding balances — both already computed. Needs a screen, not data. |
| Afternoon | Lift inspection due next month | Wall calendar | Obligation due in the work list; completing it files the certificate and rolls the next due date. |
| Afternoon | Refurbishment progress | Spreadsheet | Editable **capex project**: record commitment, log progress cost, see remaining budget. |
| End of day | File documents | Drive by hand | Already solved — Drive folders are provisioned per property and evidence is linked from the record it evidences. |

**Design conclusion.** The property manager does not need many new screens. They
need **one work list** that aggregates due and overdue items across the modules
that already hold the data, plus **the ability to create a job or an obligation
in under ten seconds**. Capture must be trivially cheap or it will not happen,
and an empty maintenance module is worse than none.

---

## 4. Executive operations — the investment director

### 4.1 Weekly

| Workflow | Status |
| --- | --- |
| Review liquidity and 30/90-day forecast | **Exists** — dashboard |
| Review consolidated alerts | **Exists** — alerts panel |
| Approve supplier invoices before payment | **Missing** — no approval state on a document, no approval queue |
| Approve maintenance quotations | **Missing** — depends on maintenance jobs |
| Review arrears | Data exists, no screen |
| Review reconciliation exceptions | View exists (`v_bank_reconciliation_exceptions`); no work list |

### 4.2 Monthly

| Workflow | Status |
| --- | --- |
| Close the period | **Exists** — close/reopen with audit trail |
| Review income statement and profitability | **Exists** — reporting |
| Review debt, maturity and covenants | Debt and maturity exist; **DSCR/LTV missing** (P1) |
| Review occupancy and rent roll | View exists; **rent-roll screen missing** (P1) |
| Approve budgets | **Missing** — no budget concept |
| Review forecast vs plan | **Missing** — no plan to compare against |
| Approve capex drawdowns | **Missing** — depends on the project workspace |
| Review VAT position | **Exists** — VAT summary |
| Review portfolio performance (yield/ROI/IRR) | **Exists** — reporting |

### 4.3 The approval gap

The single recurring theme is **approval**. The database has an `approver` role
that nothing currently enforces (`ROADMAP.md` P0), and the operational reality
of the company is that four things need a director's confirmation before money
moves: a supplier invoice, a maintenance quotation, a capex commitment, and a
bank reconciliation. Phase 8 should implement approval **once**, generically,
and apply it to those four — not build four bespoke approval flows. See §6.

---

## 5. Projects / CapEx — what is still required

**What exists.** `capex_projects`, `capex_project_costs`, `v_capex_summary`
(budget vs committed vs actual), overrun alerts on the dashboard, a CapEx report
tab, and a read-only Projects tab on the property workspace.

**What is missing before it is operationally complete:**

1. **An editable project workspace** at `/projects` and `/projects/$projectId` —
   create, edit, budget by cost category, phase dates, responsible person,
   status (planned → approved → in progress → complete → closed).
2. **A commitment register.** An order or a signed contractor contract is a
   commitment: an amount owed on a future date, before any invoice exists. This
   is the missing rung of principle 5 and the reason committed spend is
   currently invisible. A commitment must generate a *committed* cash-flow entry
   by reference and be drawn down by invoices, never restate their amounts.
3. **Approval on the project and on each commitment**, using the generic
   approval mechanism of §6, so budget authority is real.
4. **Invoice-to-project attribution** through the existing dimensions layer,
   so an actual cost consumes its commitment instead of double counting
   (principle 10).
5. **Progress and completion**: percentage complete, completion date, and
   capitalisation — on completion the project's capitalised total should be
   available to the property's book value and to depreciation
   (`depreciation_assets` already exists).
6. **Retention and warranty** fields on completion — low cost, high value at
   handover.
7. **Photographic and documentary record** through the existing Drive evidence
   adapter — no new storage.

**Explicitly not required:** Gantt scheduling, resource levelling, task
dependencies, contractor time tracking. Those are construction-management tools;
this company commissions works, it does not execute them.

---

## 6. Team, roles and approvals

**What exists.** Six roles (`owner`, `manager`, `bookkeeper`, `assistant`,
`approver`, `viewer`) in `user_roles`, enforced by security-definer helpers and
RLS on every table; a read-only `/team` screen; four capabilities (View, Record,
Approve, Manage) understood by the bookkeeping core.

**What is missing.**

1. **Membership management** — invite, assign role, revoke, end to end. Already
   P0 in the roadmap. Nothing else in §6 is usable without it.
2. **An enforced `approver` capability.** The role exists and does nothing.
3. **A generic approval record.** Recommendation: one approval concept,
   applicable to a target record (financial document, maintenance job/quotation,
   capex commitment, reconciliation batch), holding requester, approver,
   decision, reason and timestamp. This obeys principle 3 — an approval is an
   *event*, and a rejection or withdrawal is another event, never an edit.
4. **Authorisation thresholds.** A company-level rule such as "commitments above
   €5,000 require an owner; below, a manager suffices". Kept as configuration,
   evaluated server-side. Thresholds are what make approval meaningful without
   making it bureaucratic.
5. **Delegation.** Time-boxed: an approver may nominate a substitute for a date
   range, and the audit trail records both the delegate and the source of their
   authority. Do not implement permanent delegation — that is just a second
   role assignment.
6. **Workflow ownership.** Every job, obligation, project and pipeline deal
   carries a *responsible member*. This is what makes the work list of §3
   personal instead of a shared pile.

**Principles this must respect.** Roles stay in `user_roles` and never on a
profile. The UI hides what a user may not do; the server re-checks regardless.
An approval never mutates the approved record's amounts — it records that a
person accepted them.

---

## 7. Banking and cash flow — operational gaps

Architecture is settled; these are workflow gaps only.

| Gap | Priority | Note |
| --- | --- | --- |
| Statement closing-balance control (expected vs computed, blocked confirmation on mismatch) | P0, already on roadmap | The control that makes an import trustworthy. |
| Unreconcile flow in the UI with mandatory reason | P0, already on roadmap | The database supports it; the operator cannot reach it. |
| Reconciled entries visibly collapsing their forecast/committed counterparts in the chart | P0, already on roadmap | Principle 10 is currently only true in the data, not on screen. |
| Base-vs-scenario comparison on one horizon | P0, already on roadmap | Finishes an existing feature. |
| Recurring rule editor: indexation (IPC uplift) and end dates | P0, already on roadmap | Directly enables rent reviews (§2). |
| A **payment run**: select approved, due, outstanding items and produce one payment batch | New, P1 | The director's weekly "what do we pay this Friday" is currently manual. Reuses outstanding balances and settlements; owns only the batch. |
| Per-account liquidity thresholds | P1, on roadmap | Portfolio-level exists. |
| Internal transfer pairing between own accounts | P1, on roadmap | `bank_transfers` exists. |
| Bank-rule dry run in bulk | P1, on roadmap | Reduces classification effort at scale. |

**No architectural change is implied by any row above.**

---

## 8. Documents — operational strategy

**What exists.** Google Drive is the repository of record; `documents`,
`document_links` and `drive_folders` hold metadata and links; evidence can be
attached to properties and to financial documents at any lifecycle stage,
including after posting and in closed periods, without ever mutating an amount.
Folder plans are provisioned per property.

**The gap is not storage — it is reachability and expiry.**

Recommended operational document strategy, in order:

1. **Every operational record gets the same evidence panel.** Maintenance jobs,
   obligations, projects, commitments, tenancies and pipeline deals should reuse
   the *existing* attachment adapter with a new `source_type`. No new storage
   path, no new component, no Drive dependency inside `bookkeeping-core`.
2. **Document type taxonomy, small and fixed.** Insurance policy, certificate,
   licence, contract, lease, quotation, order, invoice evidence, inspection
   report, maintenance record, photograph, manual, correspondence. A short list
   people actually apply beats a long one they ignore.
3. **Expiry is a property of the obligation, not the file.** An insurance policy
   or energy certificate expires; put the date on the obligation record so it
   raises an alert, and let the file remain evidence (principle 6).
4. **Cross-entity document search** (already P1 in the roadmap) — by type,
   property, counterparty, date and expiry. Without it, filing quality decays.
5. **Folder-provisioning retry** for pending plans (already P0) — a property
   without a folder silently breaks the filing habit.
6. **Photographs are documents, with one concession:** a thumbnail grid on the
   property and on maintenance jobs. Condition evidence is only useful if it is
   glanceable.
7. **Do not build a second document store, versioning system or e-signature
   flow.** Drive already versions; signature belongs to the counterparty's own
   process.

---

## 9. Dashboard evolution

The dashboard answers "is the company healthy?" and must keep doing so in
seconds. Additions must earn their place; anything that is merely interesting
belongs in reporting.

**Recommended additions — five, no more.**

| KPI / panel | Why it changes a decision |
| --- | --- |
| **Open operational exposure** — approved but uninvoiced commitments and quoted maintenance | This is real money already owed that today appears nowhere. It is the missing term in "can we afford this?". |
| **Obligations expiring in 60 days** (certificates, insurance, licences) | Lapsed compliance is a legal and insurance risk with a hard date; it is the cheapest possible alert to act on. |
| **Leases expiring / rent reviews due in 90 days** | Both are revenue events with a lead time. Missing an indexation date loses income permanently. |
| **Approvals awaiting me** | Turns the dashboard from a report into a place where work is completed; without it approvals stall invisibly. |
| **DSCR and LTV per agreement and portfolio** (P1 already) | The two ratios a lender and a director actually judge the company on. |

**Deliberately rejected**, to avoid clutter: maintenance job counts by status,
per-contractor spend league tables, average job resolution time, document counts,
utility consumption charts, and any KPI that does not have a decision attached
to it. These belong in reporting or nowhere.

**Structural recommendation.** Keep the executive dashboard as-is and add a
**separate operations work list** (§3) for the manager. Mixing "is the company
healthy?" with "what must I do today?" degrades both, and violates principle 13
(executive first, detail on demand).

---

## 10. Product boundaries — what must not be built

| Not building | Why |
| --- | --- |
| **Full accounting package** (double-entry, general ledger, trial balance, statutory filing) | Frozen decision in `V1-MASTER-SPECIFICATION.md`. The company is managed on cash; the external accountant is served by exports. Adding a ledger would double the maintenance cost and duplicate a solved market. |
| **CAD / BIM / drawing management** | Drawings are documents. Drive holds them. Viewing or editing geometry is a different profession's tool. |
| **Property portals / listing syndication** | Letting and sales marketing is an agent's job and an external market. The product needs the *outcome* (a tenancy, a sale), not the channel. |
| **CRM** (leads, campaigns, tenant communications, mail merge) | Pedra Rioja manages assets and money, not relationships. Counterparties are fiscal and operational records, not a sales funnel. |
| **HR / payroll** | The company has few employees and this is PSA Hub's domain and an external payroll provider's. |
| **General ERP** (inventory, procurement catalogues, manufacturing) | No physical goods, no stock. |
| **Tenant-facing portal** | A support surface with its own auth, notifications and abuse considerations, for a small number of tenants. Not proportionate. |
| **Construction project management** (Gantt, dependencies, site diaries) | The company commissions works; the contractor executes them. Budget, commitment and evidence are the company's concern. |
| **Deal underwriting / investment modelling** | Judgement, assumption-heavy and personal to each deal. Spreadsheets are genuinely the better tool; the product records the decision, not the model. |
| **Direct bank feeds** | Already excluded in v1. Adds provider dependency and cost for a portfolio whose statement import already works. Revisit only on volume. |
| **PSA Hub integration in any form** | Binding decision in `PRODUCT-STRATEGY.md`. |

Rule for future proposals: if the feature does not help answer *what we own*,
*what money moves and when*, *is the company healthy*, or *what must be done to
the buildings* — it is out.

---

## 11. Phase 8 proposal

Four sub-phases. Each is independently shippable, delivers a coherent operating
capability, reuses existing tables wherever possible, and adds no figure that is
stored rather than derived.

### Phase 8A — Operate the buildings and the works

*Theme: make committed spend and physical work visible.*

1. Finish the outstanding banking P0s: closing-balance control and unreconcile
   with reason.
2. Cash-flow chart collapse of reconciled vs forecast/committed, and the
   base-vs-scenario comparison view.
3. **Editable capex project workspace** with budget by category, status and
   evidence.
4. **Commitment register** feeding committed cash-flow entries by reference,
   drawn down by invoices through dimensions.
5. **Maintenance jobs** with contractor (counterparty), status, quotation
   evidence and optional committed cost.
6. **Contractor overlay on counterparties** — trade, service area, insurance
   expiry.

*Value:* the company can run refurbishments and repairs in-product, and the
cash-flow forecast finally includes money it has already promised.
*Architecture:* two new owned tables (job, commitment) plus fields; everything
else is existing.

### Phase 8B — Operate the income

*Theme: stop losing revenue.*

1. Recurring rule editor: indexation (IPC) and end dates — the P0 that unlocks
   rent reviews.
2. **Lease administration work list**: expiries, break options, deposits,
   indexation due, arrears — over existing tenancy data and
   `v_property_rent_roll`.
3. Rent roll screen (P1 on the roadmap).
4. **Vacancy record** per unit: void start, reason, target rent, expected re-let
   date; feeds the existing vacancy alert with facts.
5. **Obligations register** covering compliance, certificates, energy
   performance, licences and insurance renewals, with expiry alerts and Drive
   evidence.
6. **Service contracts** as records that own their recurring cash-flow rule.

*Value:* income is protected and compliance deadlines stop being personal
knowledge.
*Architecture:* one new owned table (obligation), extensions to tenancy and
units, reuse of recurring rules.

### Phase 8C — Govern and decide

*Theme: authority, and the front of the lifecycle.*

1. **Team management**: invite, assign role, revoke (P0).
2. **Generic approval record** plus authorisation thresholds and time-boxed
   delegation, applied to supplier invoices, maintenance quotations, capex
   commitments and reconciliation.
3. **Approvals awaiting me** on the dashboard; **operations work list** for
   managers.
4. **Payment run**: batch approved, due, outstanding items into one settlement
   session.
5. **Acquisition pipeline** with stages and a **due-diligence checklist**,
   converting to a property on completion.

*Value:* money cannot move without authority, and deals are visible before they
become assets.
*Architecture:* one new owned table (approval), one light pipeline table with a
checklist child; no change to existing ownership.

### Phase 8D — Plan and harden

*Theme: close the loop and be production-safe.*

1. **Budgets** per property and category per year, and **forecast vs plan**
   reporting over existing cash-flow data.
2. DSCR, LTV and cash-on-cash added to the existing investment report; per-agreement covenant view.
3. Preventive maintenance schedules generating jobs; inspections as preventive
   jobs producing report documents.
4. Property/unit bulk import; counterparty and opening-balance import (P0/P1).
5. Cross-entity document search; folder-provisioning retry.
6. Production readiness: auth hardening, per-route metadata and error
   boundaries, register query performance and pagination, end-to-end smoke,
   RLS regression tests for every table added in 8A–8C.

*Value:* the company plans a year, measures itself against the plan, and the
platform is safe to depend on entirely.
*Architecture:* budget is the only new owned record; everything else extends.

### 11.1 Ordering rationale

- 8A first because **committed spend is the biggest hole in the cash-flow
  promise**, and because maintenance is the highest-frequency activity still
  outside the product.
- 8B second because rent indexation loses money silently every month it is
  missing, and because compliance expiry is the highest-severity, lowest-effort
  risk.
- 8C third because approval is only meaningful once there are commitments and
  quotations to approve — building it earlier would produce ceremony without
  substance.
- 8D last because budgeting requires an execution mechanism to budget against,
  and hardening should cover everything 8A–8C introduces.

### 11.2 Principle compliance check

| Principle | How Phase 8 respects it |
| --- | --- |
| 1 — one source of truth | Jobs own work, bookkeeping owns cost, Drive owns files. No amount is restated. |
| 2 — derived data never stored | Exposure, arrears, budget remaining and DSCR are all computed in views. |
| 3 — events, not destructive edits | Approvals, rejections, delegations, job status changes and commitment cancellations are all events. |
| 4 — cash flow is primary | Commitments, service contracts and quoted maintenance all surface in the timeline. |
| 5 — forecast → committed → actual | The commitment register is precisely the missing rung. |
| 6 — documents are evidence | Every new record reuses the existing Drive evidence adapter. |
| 7 — simple for people | Ten-second job capture; one work list; approval thresholds instead of forms. |
| 8 — clear ownership | Every new table carries `company_id`, a responsible member and RLS from its first migration. |
| 9 — nothing enters accounting by accident | A job never posts anything; only the invoice does. |
| 10 — never count twice | Commitments are drawn down by invoices; quoted maintenance collapses into its document. |
| 11 — reconciliation is human | Unchanged; approval is likewise explicit. |
| 12 — attribution via dimensions | Job and project attribution uses dimensions, not real-estate foreign keys in bookkeeping. |
| 13 — executive first | Operations work list kept separate from the executive dashboard. |

---

## 12. Summary

Pedra Rioja Hub has the financial spine of a property investment company. What
it lacks is the **operational layer above it**: the work on the buildings, the
deadlines attached to them, and the authority to spend money on them.

Three new owned records — **maintenance job**, **obligation**, **approval** —
plus an editable **capex project with commitments**, plus screens over data the
platform already computes, is the whole of what stands between v1.0 architecture
and running the company entirely in-product.

No table needs redesigning to get there.
