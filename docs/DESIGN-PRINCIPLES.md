# Pedra Rioja Hub — design principles

These are the rules the application is built on. They are deliberately written
in plain language: they describe how the product should behave, not how it is
coded. Every screen, report and future feature is expected to obey them. When a
new requirement conflicts with one of these principles, the principle wins
until it is explicitly changed here.

---

## 1. One source of truth

Every fact lives in exactly one place. A mortgage instalment is owned by the
financing module, a rent is owned by the tenancy, an invoice is owned by
bookkeeping. Other parts of the application point at that record; they never
keep a private copy of it.

*In practice:* you never type the same amount twice. If a figure looks wrong,
there is exactly one screen where it can be corrected.

## 2. Derived data is never stored

Portfolio value, occupancy, outstanding debt, yields, ageing and every other
KPI are calculated from the underlying records at the moment they are shown.
Nothing is "saved as a total" that could later drift away from its details.

*In practice:* the dashboard cannot disagree with the transactions behind it.
Correct a transaction and every report follows immediately.

## 3. Events, not destructive edits

Financial history is written by adding events, not by overwriting them. Posting,
settling, cancelling, revising a schedule and reversing a reconciliation are all
recorded as new facts. Nothing that has been confirmed is silently rewritten,
and nothing is ever permanently deleted.

*In practice:* revised loan schedules close the old version and open a new one
for future periods; past and reconciled instalments stay exactly as they were.

## 4. Cash flow is the primary view

The company is managed on cash, not on accruals. The cash-flow timeline is the
backbone of the product; the bookkeeping ledger, financing schedules and
projects all feed it. Any figure that affects the bank balance must appear
there.

*In practice:* if you can only look at one screen, it is cash flow — it shows
what has happened and what is coming.

## 5. Forecast before commitment, commitment before payment

Every outflow travels the same path: forecast → committed → actual →
reconciled. Each step increases certainty and each is visibly distinct. A
figure never jumps straight from an idea to a bank line without leaving that
trail.

*In practice:* you always know which part of next quarter's spend is already
contractually owed and which is still a plan.

## 6. Documents are evidence, not bookkeeping

An invoice or contract file proves an entry; it does not create it. Files live
in Google Drive, which stays the repository of record. The application stores
the link, the metadata and the relationship to the property, project or
document.

*In practice:* attaching or removing evidence never changes an amount, and can
be done even on posted documents or in closed periods.

## 7. Simple for people, sophisticated in the model

The data model is rigorous — dimensions, versioning, classification, tenancy.
The interface is not. Complexity is absorbed by the database and by defaults,
not pushed onto the person entering a rent receipt.

*In practice:* guided workflows with a review-and-confirm step, not long forms
of technical fields.

## 8. Clear ownership of every record

Each record knows which company it belongs to, which module created it, and who
last changed it. Nothing is company-less, and no module writes into another
module's records.

*In practice:* multi-company separation is absolute, and every figure can be
traced back to the module and person responsible for it.

## 9. Nothing enters accounting by accident

Draft work is invisible to reports. Only posted documents and settled or
reconciled movements reach the income statement, VAT summary and profitability
figures. Cancelling a document removes it from reporting without erasing it.

*In practice:* you can prepare freely without polluting the numbers directors
look at.

## 10. Never count anything twice

Where several records describe the same money — a forecast instalment, the
supplier invoice for it and the bank line that pays it — the application
collapses them into one movement. Operating costs, financing costs, capex and
taxes are mutually exclusive buckets.

*In practice:* the sum of the parts of a report always equals its total.

## 11. Reconciliation is a human decision

The system proposes matches using amount, date and counterparty history. It
never reconciles on its own, never matches across companies, and always keeps
the reason and author of a reversal.

*In practice:* suggestions save typing; a person still confirms the truth.

## 12. Attribution through dimensions, not through duplication

Property, unit, project and other analytical dimensions are attached to
transactions as tags. Bookkeeping never references real estate structurally;
the two remain independent and can be reported together.

*In practice:* the same bookkeeping module can be used elsewhere, and any
transaction can be sliced by property or project without new tables.

## 13. Executive first, detail on demand

Screens are layered: overview → financial health → detail → individual
transaction. The first screen answers "is the company healthy?" in a few
seconds; drilling down is always possible and never required.

*In practice:* directors read the dashboard; controllers open the ledger.

---

## Applying these principles

- A new module must declare which records it owns and which it only references.
- A new figure on a screen must be derivable from existing records.
- A new destructive action is not acceptable; design the reversing event instead.
- A new report must state the statuses it includes and exclude drafts.
- A new table must carry `company_id` and be protected by access rules.
