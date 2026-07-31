# Pedra Rioja Hub — Phase 8 operational design

Status: **product design, planning only**, written 2026-07-29.
No code, schema or migration is changed by this document.

> **§5C and §5D are frozen architectural contracts.** §5C is binding for Phase
> 8A; §5D is binding for Phase 8A and all later phases. Both take precedence
> over the rest of this document and may not be altered without an explicit
> decision to unfreeze them. §5D defines how records move between domains; it
> does not override the ownership rules frozen in §5C.


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

### 2.1 The genuinely new record types

Everything classified Core above collapses into **four new owned records** plus
extensions of existing ones. This matters: it is the measure of whether Phase 8
respects the architecture.

1. **Commitment** — a promise to pay a known counterparty a known amount on a
   known future date, made before any invoice exists. Owns *the promise*, never
   *the invoice*, *the payment* or *the work*. This is the record Phase 8A is
   built around; see §5B.
2. **Maintenance job** — a dated unit of work on a property/unit, with a
   contractor (counterparty), a status, and links to evidence. Owns *the work*,
   never *the money* — when the work is ordered it raises a commitment.
3. **Obligation** — a recurring or dated compliance/certificate item on a
   property, company or agreement, with a due date, responsible role and
   evidence document. Owns *the deadline*, never *the document* (Drive) or
   *the cost* (a commitment, then bookkeeping).
4. **Pipeline deal** — a pre-property opportunity with a stage, indicative
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

## 5B. The commitment layer — refined Phase 8A design

Phase 8A is redesigned around a single idea: **the commitment is the primary
operational record of intended expenditure.** Maintenance jobs, service
contracts, insurance policies, professional engagements and capex orders are not
separate financial mechanisms — they are different *reasons* for a commitment.
Building the commitment first means each of those later features is a thin
descriptive record plus a link, not a new money pathway.

Nothing in this section is implemented yet. No table, view, RPC or migration is
created by this document.

### 5B.1 What a commitment is, and what it is not

A commitment is a **promise to pay**: a counterparty, an amount, an expected
date or schedule, a reason, and an authority. It exists in the window between
"we intend to spend this" (forecast) and "we have been invoiced" (financial
document).

| A commitment **is** | A commitment **is not** |
| --- | --- |
| The company's own record of an order, contract, engagement, policy or accepted quotation | An invoice, a credit note or any bookkeeping document |
| The authority under which future money may leave | A payment or a bank movement |
| The origin of *committed* cash-flow visibility | A stored cash-flow figure |
| A container for a schedule of expected instalments | A general ledger or an accrual |
| Attributable to a property, unit or project through dimensions | A real-estate foreign key inside bookkeeping |

The distinction that keeps principle 10 (never count twice) intact: a commitment
states what is **still owed**; a financial document states what has been
**billed**. The two never sum. Documents *draw down* commitments.

### 5B.2 Commitment types

One table, one lifecycle, one approval mechanism, typed by purpose:

| Type | Typical origin | Typical shape | Usually attributed to |
| --- | --- | --- | --- |
| `capex` | Contractor contract, works order, architect appointment | Milestone schedule | Project + property |
| `maintenance` | Accepted repair quotation | Single amount, sometimes staged | Property/unit + job |
| `professional_services` | Engagement letter — legal, tax, valuation, agency | Fixed fee or milestones | Company, property or project |
| `insurance` | Annual policy | Annual or instalment schedule | Property, or company for portfolio cover |
| `utilities` | Supply contract | Recurring estimate, variable actuals | Property/unit |
| `tax` | Assessment or self-assessment obligation (IMI, IMT, IRC, Stamp Duty) | One or more dated instalments | Property or company |
| `service_contract` | Lift, cleaning, security, alarm, gardening | Recurring fixed amount, term dates | Property |
| `other` | Anything genuinely operational and promised | Free | Any |

Types differ only in defaults, labels and reporting bucket. They do **not**
differ in lifecycle, ownership or accounting behaviour — that uniformity is the
whole benefit.

### 5B.3 Ownership

| Fact | Owner | Everyone else |
| --- | --- | --- |
| The promise, its amount, schedule and status | **Commitment** | References it |
| The work being done | Maintenance job / capex project | Links to the commitment |
| The supplier identity | `counterparties` (bookkeeping) | Commitment holds the id |
| The invoice, VAT and classification | `financial_documents` + lines | Commitment is drawn down, never restated |
| The payment | Settlement records | Commitment shows remaining balance |
| The bank line | `bank_transactions` | Reconciliation links through the document |
| The evidence file | Google Drive, via the existing evidence adapter | Commitment stores the link only |
| Committed exposure figures | **Nobody** — derived in views | Dashboard, reports, cash flow read the view |

The commitment owns **exactly one number**: the amount promised (with its
schedule). Every other number about it — invoiced to date, paid to date,
remaining, overrun against budget — is computed.

### 5B.4 Lifecycle

```text
   draft ──▶ pending_approval ──▶ approved ──▶ active
                    │                 │           │
                    ▼                 ▼           ├─▶ partially_drawn
                rejected          cancelled       ├─▶ fully_drawn ──▶ closed
                                                  └─▶ cancelled (with reason)
```

| Status | Meaning | Cash-flow effect | Editable |
| --- | --- | --- | --- |
| `draft` | Being prepared | none (invisible to reports, principle 9) | freely |
| `pending_approval` | Submitted for authority | none | no — withdraw to edit |
| `approved` | Authority granted, not yet issued | none | amount locked |
| `active` | Issued to the counterparty; the company is bound | **committed** for the undrawn balance | schedule may be *revised*, creating a new version |
| `partially_drawn` | Some invoices received | committed for the remainder only | as active |
| `fully_drawn` | Invoiced in full | none remaining | no |
| `closed` | Complete and settled, or deliberately closed with a balance released | none | no |
| `cancelled` | Withdrawn before completion, with reason and author | none | no |
| `rejected` | Approval refused, with reason | none | no |

Consistent with principle 3, no status transition rewrites history: revisions
close the current schedule version and open a new one for future instalments
only, exactly as financing schedule versioning already works. Drawn, invoiced or
reconciled instalments are immutable.

### 5B.5 Approval requirements

Approval is what makes a commitment meaningful; without it the record is a note.
The generic approval mechanism proposed in §6 becomes a Phase 8A dependency
rather than a Phase 8C nicety — but only in its minimal form.

- Every commitment above a configurable company threshold requires approval by a
  user holding the `approver` (or `owner`) role before it can become `active`.
- Below the threshold, `manager` may activate directly; the activation is still
  recorded as an event with author and timestamp.
- Approval records the approver, timestamp, the amount approved and any
  condition. Approving a *revision* upward above the threshold requires a fresh
  approval; a downward revision does not.
- Approval never touches accounting. A commitment that is approved has still
  posted nothing.
- Rejection is an event with a reason; the commitment does not disappear.

This also gives the `approver` role — which currently exists in the enum but is
enforced nowhere — its first real duty.

### 5B.6 Relationship with projects

**Projects consume commitments; they do not own expenditure.**

- A capex project owns its **budget** (by cost category), its phases, its
  responsible person and its status. It owns no spend figure.
- Every intended cost on a project is a commitment carrying that `project_id`.
- `v_capex_summary` becomes fully derivable and honest:
  - *budget* — from the project's budget lines;
  - *committed* — sum of undrawn balances of active commitments on the project;
  - *invoiced* — sum of posted documents attributed to the project via
    dimensions;
  - *paid* — sum of settlements against those documents;
  - *remaining budget* — budget − (committed + invoiced), never double counted.
- Overrun alerts fire on the derived figure, so they fire *when the order is
  placed*, not months later when the invoice arrives. This is the single
  biggest practical gain of the commitment-first model.
- On completion, the capitalised total available to book value and depreciation
  is the invoiced (not committed) total, so nothing is capitalised on a promise.

### 5B.7 Relationship with counterparties

- A commitment must reference a `counterparties` row — the same supplier record
  bookkeeping uses. There is no second supplier list.
- The contractor overlay (trade, service area, insurance expiry) proposed for
  Phase 8A remains an extension of `counterparties`, not a new entity.
- Counterparty exposure — total undrawn commitments plus unpaid posted documents
  — becomes a derived figure on the counterparty screen, and a genuinely new
  piece of management information the company does not have today.
- A commitment may be raised against a counterparty created inline during
  capture, so the ten-second flow survives.

### 5B.8 Relationship with bookkeeping

This is the boundary that must not blur.

- Bookkeeping continues to own **documents, lines, VAT, classifications,
  settlement and periods**. The commitment module writes none of them.
- A supplier invoice is linked to the commitment it draws down. The link records
  the drawn amount, so partial and staged billing work naturally, and one
  invoice may draw down more than one commitment.
- The invoice's amount always wins. A commitment is never adjusted to match an
  invoice; the difference is a visible *variance*, which is exactly the figure a
  director wants.
- Attribution to property, unit or project travels through the existing
  **dimensions** layer, so bookkeeping still holds no real-estate foreign key
  (principle 12) and the module stays portable.
- Over-drawing a commitment is permitted but flagged, never silently absorbed.
- Nothing about a commitment enters the income statement, VAT summary or period
  totals. Only posted documents do (principle 9).

### 5B.9 Relationship with cash flow

**Cash flow derives committed values; it does not store them.**

`cash_flow_entries` already carries `source_type` / `source_id`, `state` with a
`committed` value, and `is_included`. The commitment layer reuses that contract
unchanged:

- Each undrawn instalment of an active commitment is represented as a
  cash-flow row with `source_type = 'commitment'`, its `source_id`, and
  `state = 'committed'` — projected from the commitment schedule by the same
  generation mechanism the financing and recurring-rule modules already use, and
  owned by the commitment module, not typed by hand.
- When an invoice draws down an instalment, the committed projection for that
  instalment stops being counted; the document's own entry takes over. The
  timeline shows one movement, not two (principle 10).
- Cash flow never edits a commitment, and the commitment module never writes a
  cash-flow row belonging to another source. The existing source-ownership
  guard trigger already enforces this pattern.
- Forecast rows that a commitment supersedes are marked as superseded by
  reference, so the forecast → committed transition is visible as an event
  rather than as a deletion.

Net effect: the 30/90/180/365-day liquidity forecast on the dashboard finally
includes money the company has already promised — currently its largest blind
spot.

### 5B.10 Relationship with reporting

All new reporting is view-level and derived:

- **Commitment register** — open commitments by type, counterparty, property,
  project and due date.
- **Committed exposure** — total undrawn, by month and by category, alongside
  bank balances; the practical solvency question.
- **Budget vs committed vs invoiced vs paid** on every project and property.
- **Variance** — invoiced against committed, per commitment and per counterparty.
- **Ageing extension** — commitments overdue for invoicing (the date passed, no
  document arrived) is a control the company currently lacks entirely.
- Operating cost, financing cost, capex and tax remain mutually exclusive
  buckets; a commitment inherits its bucket from its type and never appears in
  two.

Nothing is stored as a total.

### 5B.11 Relationship with documents

- A commitment's own paperwork — quotation, order, signed contract, policy
  schedule, engagement letter, tax assessment — is evidence, attached through
  the **existing Drive evidence adapter** with `source_type = 'commitment'`.
- No new storage mechanism, no Drive dependency inside `bookkeeping-core`.
- Attaching or removing evidence never changes an amount, including on an active
  or fully drawn commitment (principle 6).
- The invoice that draws down a commitment keeps its own document evidence in
  bookkeeping; the commitment does not copy it, it links through the drawdown.

### 5B.12 The end-to-end lifecycle

```text
FORECAST                 recurring rule, budget line, or manual expectation
  │                      state = forecast · owned by cash flow / project budget
  ▼
COMMITMENT               quotation accepted, order placed, policy renewed
  │                      approved → active · owns the promise
  │                      projects committed cash-flow rows by reference
  ▼
FINANCIAL DOCUMENT       supplier invoice received and posted
  │                      owns amounts, VAT, classification · draws down commitment
  │                      commitment's committed projection retires by the drawn amount
  ▼
PAYMENT                  settlement against the document
  │                      owned by bookkeeping settlement
  ▼
BANK RECONCILIATION      bank line matched to the payment, confirmed by a person
                         owned by banking · never automatic
```

Worked example — a €40,000 roof refurbishment:

| Step | Record created | Owner | Cash-flow effect |
| --- | --- | --- | --- |
| Budgeted in the project | Project budget line €40,000 | Project | forecast |
| Quotation accepted, order placed | Commitment €38,500, 3 milestones | Commitment | forecast retires; 3 committed rows appear |
| Approved by director | Approval event | Approval | none |
| Milestone 1 invoiced €12,000 | Supplier invoice, posted | Bookkeeping | milestone 1 committed row retires; document entry appears |
| Invoice paid | Settlement | Bookkeeping | entry becomes actual |
| Bank line matched | Reconciliation | Banking | entry becomes reconciled |
| Project completes | Commitment `fully_drawn` → `closed` | Commitment | none |

At no point does the same €12,000 exist twice, and at every point exactly one
module can change it.

### 5B.13 Why maintenance, insurance and service contracts fit without new machinery

| Feature | What it adds | What it reuses |
| --- | --- | --- |
| Maintenance job | The work: property/unit, description, status, photos, contractor | Raises a `maintenance` commitment when the quote is accepted; all money behaviour identical |
| Insurance policy | Cover details, insured value, renewal date, broker | An `insurance` commitment with an annual schedule; renewal creates the next commitment |
| Service contract | Term, notice period, scope | A `service_contract` commitment with a recurring schedule; termination closes it |
| Utilities | Supply point, meter, tariff | A `utilities` commitment with an estimated recurring schedule and variance against actual invoices |
| Professional engagement | Scope, engagement letter | A `professional_services` commitment, fixed or milestone |
| Tax assessment | Reference, assessment period | A `tax` commitment with dated instalments |

Each is a small descriptive table (or, for several, just fields on an existing
one) plus a commitment. Without the commitment layer, each would have invented
its own way of reaching cash flow — six pathways instead of one. That is the
argument for building this first.

### 5B.14 Validation checklist before implementation

The model is considered validated when all of the following hold on paper:

1. No amount appears in two owned tables.
2. Cash flow contains no commitment figure that is not projected from a
   commitment schedule by reference.
3. A posted invoice can always be traced to at most the commitments it draws
   down, and drawdowns never exceed reporting totals.
4. Removing the commitment module would degrade visibility but corrupt nothing.
5. Every commitment status change is an event with author, timestamp and reason
   where applicable.
6. Bookkeeping still contains no real-estate foreign key.
7. Every derived figure in §5B.10 can be expressed as a view over existing plus
   proposed tables, with nothing stored.

---

## 5C. FROZEN ARCHITECTURAL CONTRACT — Phase 8A

Status: **binding**. These rules were frozen before implementation began and
must not be altered while Phase 8A is built. They take precedence over any
other statement in this document, including §5B, where the two disagree.

### 5C.1 Commitment ownership

- A commitment is the **canonical owner of all expected expenditure**.
- Operational modules — capex projects, maintenance jobs, obligations, service
  contracts, insurance, utilities, tax schedules — describe *why* an
  expenditure exists. They **do not own financial amounts**.
- Expected cost must always come from a linked commitment.
- A commitment **may** exist without an operational source.
- An operational record **may** exist without an approved commitment, but in
  that case it must **not** generate committed cash flow.

### 5C.2 Cash-flow generation

- Only **approved and active** commitment schedule lines may generate included
  committed cash-flow entries.
- Commitment projections must continue to use the existing mechanism only:
  `cash_flow_entries.source_type`, `cash_flow_entries.source_id`,
  `state = 'committed'`, `is_included`, and the source-ownership guard trigger.
- Cash flow remains a **projection engine only**. It never owns commitments.

### 5C.3 Drawdowns

- Drawdowns **consume** commitments. They never modify bookkeeping source
  amounts.
- Invoices continue to own invoice values. Payments continue to own payment
  values. Drawdowns only allocate commitment consumption.
- Derived values — committed, invoiced, paid, remaining, variance — must remain
  **derived** wherever practical, never duplicated.

### 5C.4 Schedule versioning

- Commitment schedules follow the **same immutability model as financing
  schedules**.
- Historical schedule lines remain immutable.
- Only **future eligible** projections may be replaced.
- Historical, invoiced, paid or reconciled schedule lines must never change.
- Every superseded schedule version remains available for audit.

### 5C.5 Capex ownership

- Capex projects own: budgets, phases, programme, project status, attribution
  context.
- Capex projects **do not own expenditure**.
- Capex financial summaries are derived from commitments, invoices and
  payments. `v_capex_summary` is updated accordingly.

### 5C.6 Approval

- Minimal approval belongs in Phase 8A. Its only purpose is to authorise
  commitments and material commitment changes.
- Phase 8C will later generalise the approval engine **without changing the
  commitment model**.
- Approval is **fail-closed**: no approval means no included committed
  cash-flow projection.

### 5C.7 Frozen ownership boundaries

| Module | Owns |
| --- | --- |
| Bookkeeping | Invoices, accounting values, VAT, payments |
| Banking | Bank transactions |
| Reconciliation | Allocations |
| Cash flow | Projections only |
| Financing | Financing agreements and repayment schedules |
| Documents | Evidence and file metadata |
| Dimensions | Attribution |

No implementation may move ownership across these module boundaries.

### 5C.8 Implementation guard

Before creating any migration or schema change, verify that the implementation
preserves **every** rule in §5C. If any rule cannot be preserved, **stop
immediately and report the conflict** rather than adapting the architecture.
The model is not to be redesigned during implementation.

---


## 5D. FROZEN ARCHITECTURAL CONTRACT — Canonical Financial Lifecycle

**Frozen for Phase 8A and all later phases.** §5D defines how records move
between the existing financial domains. It does not override the ownership
rules frozen in §5C; where §5D describes ownership it restates §5C rather than
amending it.

### 5D.1 Canonical lifecycle

Every expenditure-side financial obligation must follow this canonical
progression:

```text
Operational Event
  → Commitment
    → Committed Cash Flow
      → Financial Document
        → Payment
          → Bank Transaction
            → Reconciliation
```

Each stage owns a different business fact.

The lifecycle is directional. Earlier-stage modules may create or reference
later-stage records only through approved domain contracts, adapters or server
functions.

No module may bypass ownership boundaries by writing directly into another
module's records.

### 5D.2 Stage ownership

**Operational Event.** Examples include: capex project; maintenance job;
insurance renewal; service contract; utility obligation; tax instalment;
compliance obligation; procurement request.

The operational record owns: business context; operational status; dates and
deadlines; responsible parties; attribution context; supporting evidence.

It does not own expected expenditure, invoice amounts, payments, bank
transactions or reconciliation.

**Commitment.** The commitment owns: the authorised future obligation;
counterparty; authorised and committed values; schedule versions; approval
state; approved variations; remaining commitment; drawdown capacity.

It does not own accounting documents, payments or bank activity.

**Committed Cash Flow.** Cash flow owns: the projection of approved commitment
schedule lines; inclusion or exclusion from forecasts; expected timing;
forecast state.

It does not own the underlying obligation and cannot directly edit
source-owned commitment projections.

**Financial Document.** Bookkeeping owns: supplier invoices; credit notes;
accounting values; VAT; document lifecycle; document lines; accounting
classification.

It does not own the original operational obligation or commitment authority.

**Payment.** Bookkeeping owns: recorded settlement of financial documents;
payment allocations; payment reversals; document settlement state.

A recorded payment is not, by itself, proof that money moved through a bank
account.

**Bank Transaction.** Banking owns: imported or recorded bank movements;
transaction identity; account balance effects; duplicate detection;
transaction metadata.

A bank transaction must not alter accounting source values.

**Reconciliation.** Reconciliation owns: matching; allocation; partial
matching; split matching; transfer matching; reversal lineage; reconciliation
status.

Reconciliation must never mutate source amounts in commitments, bookkeeping or
banking.

### 5D.3 No direct jumps

The following direct actions are prohibited:

- an operational record creating or owning an invoice;
- an operational record creating a payment;
- an operational record creating a bank transaction;
- a capex project storing actual expenditure totals;
- a maintenance job storing an independent expected cost;
- an obligation generating committed cash flow without a commitment;
- a commitment creating or modifying a bookkeeping document;
- a commitment creating a bank transaction;
- a cash-flow entry creating an invoice or payment;
- a payment creating or modifying a bank transaction;
- reconciliation modifying invoice, payment or bank-transaction values.

Where two stages need to be linked, the relationship must be explicit and
auditable.

### 5D.4 Permitted links

The design may support explicit links including:

- operational record → commitment;
- commitment schedule line → committed cash-flow entry;
- commitment → financial-document drawdown;
- financial document → payment;
- payment → bank transaction through reconciliation;
- bank transaction → reconciliation match;
- document or evidence link → any authorised domain record.

These links do not transfer ownership.

### 5D.5 Drawdowns

A financial document may consume one or more commitments through drawdown
allocations. A commitment may be consumed by multiple financial documents.

Drawdowns:

- allocate commitment consumption;
- support partial allocation;
- support retained amounts;
- support approved overrun or variation;
- preserve reversal lineage;
- do not change invoice amounts;
- do not change payment amounts;
- do not change bank-transaction amounts.

The committed, invoiced, paid and remaining values must be derived from the
relevant source records and allocations.

### 5D.6 Exceptions

A stage may be absent only where the business event genuinely does not require
it. Examples:

- a forecast scenario may exist without an operational event or commitment;
- an unplanned invoice may exist without a prior commitment;
- a bank fee may be imported before a bookkeeping document exists;
- an opening balance may not have a complete historical lifecycle.

Such exceptions must be explicit and must not become shortcuts for normal
workflows.

The absence of an earlier stage must not cause a later module to assume
ownership of that earlier business fact.

### 5D.7 Income-side lifecycle

This section governs the expenditure-side lifecycle.

Income-side workflows, including lease administration, rent schedules, tenant
billing and receipts, will be defined separately.

Do not force income-side events into the expenditure commitment model unless
explicitly approved in a later frozen design decision.

### 5D.8 Audit and immutability

Every transition or link between lifecycle stages must be auditable.

Historical, posted, paid, reconciled or superseded records must remain
immutable according to their owning module's lifecycle.

Corrections must use: reversal; cancellation; superseding version; approved
variation; new allocation.

Do not update historical source records in place merely to align later stages.

### 5D.9 Enforcement

Implementations must use:

- foreign-key or typed reference contracts where appropriate;
- server-side validation;
- source-ownership guards;
- fail-closed permissions;
- idempotent synchronisation;
- audit triggers;
- reversal rather than deletion.

UI-level restrictions alone are not sufficient.

### 5D.10 Implementation stop condition

Before implementing Phase 8A, confirm that the commitment, cash-flow,
bookkeeping, banking and reconciliation integrations can preserve this
lifecycle.

Stop and report before creating migrations if implementation would require:

- direct cross-module writes;
- duplicated financial ownership;
- mutable historical source records;
- weakening a source-ownership guard;
- bypassing commitment approval;
- storing derived totals as competing sources of truth.

---







## 5E. FROZEN ARCHITECTURAL CONTRACT — Generic Approval Principle

**Status: FROZEN. Binding for Phase 8C and all later phases.**

§5E does **not** override §5C or §5D. It defines how a generic approval engine
may orchestrate decisions while preserving domain ownership and the canonical
financial lifecycle. Where §5E appears to touch a rule owned by §5C or §5D, the
earlier contract wins.

### 5E.1 Approval engine purpose

The approval engine is a reusable orchestration service. It owns: workflow
definitions; workflow versions; approval requests; approval steps; approver
assignments; decisions; delegation; escalation; quorum; deadlines; status;
audit history.

It does **not** own the business object being approved. It must never become
the source of truth for commitment values, contract values, budget values,
invoice values, payment values, bank values, project status, maintenance
status, lease status, procurement status, or any other domain-specific
business fact.

### 5E.2 Generic target contract

The engine may reference a target only through: `target_type`; `target_id`;
`company_id`; workflow definition and version; an optional immutable request
snapshot; an optional domain callback or server contract.

The engine must not import or depend directly on domain tables, domain
clients, domain components or domain-specific row types. A workflow must be
able to approve future domain types without schema redesign.

Initial target types may include: commitment; commitment variation; commitment
schedule replacement; service contract; insurance policy; lease; procurement
request; budget; capex project decision; financial document; other future
domain records. These are typed references, not ownership transfers.

### 5E.3 Domain ownership

The owning domain remains authoritative for: whether approval is required;
which workflow applies; the business value under review; validation of the
target; lifecycle transition after approval; rejection and cancellation
consequences; whether a decision may be overridden; what constitutes a
material change; what evidence is required; whether the target remains
eligible for decision.

The engine orchestrates the decision process only. It must not duplicate
domain lifecycle rules.

### 5E.4 Request snapshots

An approval request may store an immutable snapshot of the information
presented to approvers. The snapshot exists for audit and decision context
only. It must not become an editable or competing source of truth.

A snapshot should support: target label; summary; submitted values; currency
where applicable; requester; requested action; evidence references; relevant
dimensions; material-change explanation; domain-provided metadata.

Later changes to the source record must not silently alter the historical
request snapshot. If the underlying business record changes materially while
approval is pending, the owning domain decides whether to invalidate the
request, withdraw it, create a new request, or require reapproval.

### 5E.5 Workflow definitions

Workflow definitions must be versioned. A definition may support: one or more
ordered steps; parallel steps; sequential steps; individual approvers;
role-based approvers; group-based approvers; threshold-based routing;
unanimous approval; majority approval; minimum quorum; any-one approval;
escalation; delegation; reminders; expiry; withdrawal; rejection;
cancellation.

A request remains bound to the workflow version active when it was submitted.
Later workflow edits must not change historical or in-flight requests unless
an explicit migration or restart action is performed.

### 5E.6 Approver resolution

Approvers may be resolved from: named users; company roles; capability groups;
management hierarchy; dimension ownership; project responsibility; value
thresholds; domain-provided approver candidates.

Approver resolution must be company-scoped and fail-closed. An unresolved
approver blocks the request from progressing. The system must not silently
skip a required step.

### 5E.7 Segregation of duties

The engine must support: requester cannot approve own request; record creator
cannot approve where prohibited; prior-step approver cannot approve a later
incompatible step; delegated approver must have equivalent authority; override
approval requires explicit permission; override reason is mandatory;
higher-value requests may require additional approval levels.

Self-approval exceptions must be explicit, authorised and audited. The default
is fail-closed.

### 5E.8 Decisions

Decision types may include: approve; reject; return for changes; abstain;
delegate; withdraw; cancel; expire; override approve; override reject.

Every decision must record: request; step; approver; decision; timestamp;
reason or comment where required; delegation or override context; evidence
where applicable; audit metadata.

Historical decisions are immutable. Corrections use a new event, reversal,
withdrawal or superseding request.

### 5E.9 Domain callbacks

The engine must not directly update target-domain records. After a workflow
reaches a terminal state it may invoke an approved domain callback or server
contract such as `onApprovalGranted`, `onApprovalRejected`,
`onApprovalReturned`, `onApprovalWithdrawn`, `onApprovalExpired`.

The owning domain validates the target again before applying any lifecycle
change. The callback must be server-side; company-scoped; permission-checked;
idempotent; auditable; safe under retries; safe under concurrent execution.

If the callback fails, the approval decision remains recorded, but the request
must expose a clear integration or application status instead of pretending
the domain transition succeeded.

### 5E.10 Approval status versus domain status

Approval status and domain lifecycle status are separate facts. A request may
be approved while the domain callback is still pending; a commitment may
remain pending activation after approval; a contract may be approved but not
yet active; a rejected request returns the business record to draft only
through the owning domain; an expired request must not automatically cancel
the business record.

Do not collapse workflow state and domain state into one field.

### 5E.11 Minimal Phase 8A approval migration

The narrow approval mechanism introduced in Phase 8A remains valid until Phase
8C provides a safe migration path. Phase 8C may generalise it, but must not:
break existing commitment approvals; rewrite historical decisions; lose
approval events; weaken self-approval restrictions; change approval outcomes;
invalidate audit history; create duplicate active approval requests.

The migration strategy must be additive. Historical Phase 8A approvals must
remain queryable, migrated or exposed through compatibility views without
destructive rewriting.

### 5E.12 Permissions and security

Use the existing six-role capability model and fail-closed RLS. Distinguish
capabilities for: view workflows; configure workflows; publish workflow
versions; submit requests; withdraw requests; decide; delegate; escalate;
override; retry failed callbacks; inspect audit history.

Requirements: anonymous access denied; missing company denied; missing
capability denied; cross-company references denied; direct execution revoked
where appropriate; privileged actions use server functions; UI-only
restrictions are insufficient; no fail-open default.

### 5E.13 Audit and immutability

Audit: workflow creation; workflow version publication; request submission;
approver resolution; step activation; decision; delegation; escalation;
reminder; expiry; withdrawal; override; callback attempt; callback success;
callback failure; request completion.

Do not delete workflow history. Use archive-not-delete where applicable.
Published workflow versions, submitted requests and decisions are immutable.

### 5E.14 Evidence and documents

Use the existing documents model and Drive adapter. Evidence may link to:
workflow definition; workflow version; request; step; decision; override;
callback failure. Do not introduce a separate file-storage model.

### 5E.15 No financial ownership

The engine must not: create cash-flow entries; create commitments; change
commitment amounts; create financial documents; change invoice values; create
payments; create bank transactions; reconcile transactions; own budgets;
calculate authoritative financial totals.

It may display an immutable domain-provided snapshot for decision context.

### 5E.16 No direct domain coupling

The generic approval core must not directly import or reference: commitment
tables; bookkeeping tables; banking tables; cash-flow tables; financing
tables; operational tables; project tables; lease tables; property tables;
domain-specific Supabase clients; host-specific route or workspace context.

All domain interaction passes through typed adapters, callbacks or server
contracts.

### 5E.17 Concurrency and idempotency

The engine must safely handle: two approvers deciding at the same time;
duplicate requests; repeated callbacks; repeated delegation; workflow expiry
racing with a decision; withdrawal racing with approval; workflow publication
while requests are in flight; retries after network failure.

No request may reach contradictory terminal states. No step may be satisfied
twice. No callback may apply the same domain transition twice.

### 5E.18 Phase 8C implementation stop conditions

Before creating schema or migrations, verify that the proposed approval engine
preserves §5C, §5D and §5E. Stop and report before implementation if the
design would require: direct approval-engine writes into domain tables;
duplicated domain lifecycle logic; duplicated financial ownership; mutable
historical decisions; fail-open approver resolution; implicit self-approval;
silent skipping of required steps; workflow edits changing historical
requests; collapse of approval state into domain state; destructive rewriting
of Phase 8A approval history; bypassing server-side callbacks; weakening RLS
or audit.

Do not reinterpret or weaken the frozen contracts to proceed.

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

### Phase 8A — The commitment layer

*Theme: commitments become the primary operational record; everything
operational is expressed through them. Full design in §5B.*

Ordered so that the money pathway is proven before any descriptive module is
built on top of it.

**8A.1 — Foundations (prerequisite work already outstanding)**
1. Banking P0s: closing-balance control and unreconcile with reason.
2. Cash-flow chart collapse of reconciled vs forecast/committed, and the
   base-vs-scenario comparison view.

**8A.2 — The commitment record**
3. **Commitments** — one owned table with the eight types of §5B.2, the
   lifecycle of §5B.4, schedule versioning modelled on financing schedules, and
   Drive evidence through the existing adapter.
4. **Minimal approval**: company threshold, `approver`/`owner` authority,
   approve/reject as events. Only the commitment case — the general approval
   mechanism stays in 8C.
5. **Committed cash-flow projection by reference**: `source_type =
   'commitment'`, undrawn instalments only, nothing stored.
6. **Drawdown**: link a posted supplier invoice to the commitments it consumes,
   with variance visible and no restatement in either direction.

**8A.3 — Consumers of the commitment**
7. **Editable capex project workspace** — owns budget, phases, status and
   evidence; consumes commitments for all spend. `v_capex_summary` recast onto
   budget / committed / invoiced / paid.
8. **Commitment register and exposure views** (§5B.10), including commitments
   overdue for invoicing and counterparty exposure.
9. **Maintenance jobs** — the work record; accepting a quotation raises a
   `maintenance` commitment. No independent money pathway.
10. **Contractor overlay on counterparties** — trade, service area, insurance
    expiry.

*Value:* the company can run refurbishments and repairs in-product; committed
spend becomes visible at the moment of ordering rather than of invoicing; the
liquidity forecast includes money already promised.
*Architecture:* two new owned tables (commitment with its schedule/drawdown
children, and maintenance job), one narrow approval record, plus fields and
views. No existing ownership changes.

*Gate:* 8A.3 does not start until the §5B.14 validation checklist passes against
the implemented 8A.2 behaviour.


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
2. **Generalise the approval record** introduced narrowly in 8A: authorisation
   thresholds by type, time-boxed delegation, and application to supplier
   invoices, maintenance quotations and reconciliation as well as commitments.

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

- 8A first, and **commitment-first within 8A**, because committed spend is the
  biggest hole in the cash-flow promise and because every later operational
  feature (maintenance, insurance, utilities, service contracts, professional
  services, taxes) would otherwise invent its own route to cash flow. One
  pathway built once is cheaper than six built separately and reconciled later.

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

Four new owned records — **commitment**, **maintenance job**, **obligation**,
**approval** — plus an editable **capex project** that consumes commitments
instead of owning spend, plus screens over data the platform already computes,
is the whole of what stands between v1.0 architecture and running the company
entirely in-product.

The commitment is the keystone. It closes the missing rung between forecast and
actual, gives the `approver` role its first duty, makes committed exposure a
derived fact rather than a spreadsheet, and reduces maintenance, insurance,
utilities, service contracts, professional engagements and taxes to descriptive
records over one shared money pathway.

No table needs redesigning to get there.


---

## 13. Phase 8F — FROZEN SCOPE

**Status: FROZEN.** Derived only from work already named in this document and
`docs/ROADMAP.md`. No new scope is invented here. §5C, §5D and §5E remain
frozen and take precedence over anything below.

### 13.1 Delivered vs original plan

| Original plan (§11) | Delivered | Note |
| --- | --- | --- |
| 8A — commitment layer | **8A ✓** | Commitments, minimal approval, drawdowns, capex, maintenance jobs, contractor overlay. |
| 8B — operate the income | **8B ✓** | Indexation and end dates, obligations register, service contracts, vacancy, rent roll. |
| 8C — govern and decide | **8C ✓ (approval engine + team management only)** | Generic workflow engine replaced the narrow 8A mechanism. Items 4 and 5 of §11/8C were **not** built. |
| 8D — plan and harden | **8D ✓** | Budgets, forecast vs plan, DSCR/LTV/cash-on-cash, preventive maintenance, imports, cross-entity search, hardening. |
| (not in original plan) | **8E ✓** | Lease and asset management: versioned leases, tenants, occupancy, rent roll, rent reviews, WAULT and expiry reporting. |

### 13.2 Deferred inventory (the whole of it)

Carried forward from §11/8C items 4–5, §1.1, §1.2 and §9:

1. **Payment run** — §9 table row and §11/8C.4. Batch approved, due,
   outstanding items into one settlement session.
2. **Acquisition pipeline** — §1.1, §4 table, §11/8C.5. Stage, price, agent,
   decision; converts to a property on completion.
3. **Due-diligence checklist** — §1.2, §11/8C.5. A reusable checklist attached
   to a pipeline deal.
4. **Disposal pipeline** — §4, classified **Later**. Explicitly excluded below.

Everything else on the roadmap that is still open is P1/P2 polish over shipped
modules, not a Phase 8F domain.

### 13.3 Phase 8F scope (in this order)

**8F.1 — Payment run**
- One owned table (`payment_run`) with a line child referencing outstanding
  items by `source_type` / `source_id`. The run owns **only the batch**.
- No amount is stored that bookkeeping or banking already owns; outstanding
  balances stay derived.
- A run is submitted through the Phase 8C approval engine — no bespoke
  approval mechanism (§5E).
- Confirming a run produces settlements through the existing settlement
  pathway; it never posts a document and never writes cash-flow entries
  directly (§5D).

**8F.2 — Acquisition pipeline**
- One light owned table (`pipeline_deal`): stage, asking/offer price, agent
  counterparty, decision, target property attributes.
- Stage transitions are events, not destructive edits.
- Pipeline value is **not** portfolio value: excluded from all existing
  portfolio, valuation and investment views.
- Cash-flow exposure only by reference, as forecast, and only for a deal in an
  advanced stage — never as a commitment.
- Completion converts the deal into a property record; the deal remains as
  history and is never deleted.

**8F.3 — Due-diligence checklist**
- A checklist template plus per-deal instance child of `pipeline_deal`.
- Items carry status, responsible member, due date and Drive evidence through
  the existing document adapter.
- Blocking items gate the deal's move to the completion stage; enforcement is
  server-side and fail-closed.

### 13.4 Exclusions (not Phase 8F)

- Disposal pipeline; full underwriting, valuation modelling or IRR on deals.
- Any new approval mechanism, any new cash-flow pathway, any new document store.
- Investor-facing PDF reporting, OCR capture, direct bank feeds, credit notes,
  depreciation schedules, per-property access scoping — all remain P1/P2 items
  on `docs/ROADMAP.md`.
- Any change to leases, commitments, bookkeeping or banking ownership.

### 13.5 Ownership boundaries

| Fact | Owner |
| --- | --- |
| Payment batch membership and batch state | `payment_run` |
| Outstanding balance of an item | Bookkeeping (derived) |
| Money leaving the account | Banking settlement / reconciliation |
| Authority to pay | Approval engine (§5E) |
| Deal stage, offer, decision | `pipeline_deal` |
| Checklist completion | `pipeline_checklist_item` |
| Property once acquired | `properties` |
| Evidence files | Google Drive via the existing adapter |
| Attribution | Dimensions only |

### 13.6 Is a new frozen contract needed?

**No.** §5C (commitment ownership), §5D (canonical financial lifecycle) and
§5E (generic approval) already govern every 8F record. Phase 8F adds
consumers, not a new architectural layer. If implementation reveals a payment
run needing to originate money outside §5D, work stops rather than the
contract being amended.

### 13.7 Unresolved decisions

1. Whether a payment run may include items with no approval requirement at all
   (auto-eligible below threshold), or whether every run requires one decision.
2. Whether a pipeline deal in an advanced stage appears in the liquidity
   forecast by default or only when explicitly flagged.
3. Whether checklist templates are company-level only, or per deal type.
4. Whether an abandoned deal is archived or retained as a closed stage.

### 13.8 Implementation readiness

Ready. Every dependency (approval engine, settlements, dimensions, Drive
adapter, reminders, search index) is shipped and tested. Nothing in 8F
requires a migration to an existing owned table beyond additive columns.

## 14. Version 1 Closure

This section closes Version 1. It changes nothing above it.

- **Payment Runs complete the financial execution workflow.** Approved,
  outstanding items are batched, authorised, exported and marked executed. The
  chain forecast → commitment → financial document → payment → reconciliation
  is complete end to end.
- **The Acquisition Register provides sufficient acquisition tracking for
  current business needs.** Opportunities, stages, offers, agents and decisions
  are recorded and kept out of portfolio value.
- **Due Diligence and Closing & Handover are intentionally deferred.** They add
  little value at Pedra Rioja's current scale. The architecture supports adding
  them later without redesign; they are not required for Version 1.
- **Existing ownership boundaries remain unchanged.** Operational records never
  own amounts; financial documents, payments and the ledger do.
- **§5C and §5D remain the governing architectural contracts**, alongside §5E
  for approvals.

### 14.1 Future Ideas

Backlog only — nothing here is designed or committed.

- Due Diligence workflow
- Closing & Handover
- Disposal pipeline
- Executive dashboard enhancements
- Portfolio KPI dashboards
- Scenario modelling
- AI insights
- Document intelligence
- Mobile optimisation
- Additional bank export providers
- Investor portal
