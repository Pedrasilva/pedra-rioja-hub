# Bookkeeping reference design

A **product and UX reference** for the bookkeeping experience built in Pedra
Rioja Hub. It exists so the same experience can later be reproduced in another
product (PSA Hub) without any technical integration, shared package or shared
database. Nothing here mandates an identical database schema — table and column
names in this document are illustrative of Pedra Rioja's implementation only.

See `PRODUCT-STRATEGY.md` for the decision that frames this document.

---

## 1. Terminology

| Term | Meaning | Avoid |
| --- | --- | --- |
| **Counterparty** | Any external party in a financial relationship: supplier, client, bank, authority. One record may act in several roles. | "vendor", "customer", "company" |
| **Financial document** | An invoice, credit note, receipt, expense or other fiscal document. | "bill", "transaction" |
| **Document line** | One priced row of a document: quantity, unit price, discount, VAT rate, classification. | "item" |
| **Classification** | The financial nature of a line or document (income/expense category). | "account", "ledger code", "category" |
| **Dimension** | An operational attribution: property, unit, project. Never mixed with classification. | "tag" |
| **Period** | A fiscal window (month, quarter, year) with totals. | "close" |
| **Payment / settlement** | Money actually moved against a document; may be partial. | "payoff" |
| **Reconciliation** | Linking a bank transaction to documents and payments. | "matching" alone |
| **Posting** | Committing a draft document so it takes financial effect. | "approve", "submit" |
| **Cancellation / reversal** | The only ways to undo. | "delete" |

Consistency rule: one concept, one word, everywhere — labels, headings, buttons,
toasts, empty states, error messages, exports.

## 2. Navigation and screen patterns

A single **Bookkeeping workspace** with a stable tab set, ordered by daily use:

```text
Bookkeeping
├── Purchases        documents received (supplier side)
├── Sales            documents issued (client side)
├── Counterparties   master data register
├── Classifications  chart of financial classifications
├── Bank rules       automatic classification suggestions
└── Periods          fiscal periods and totals
```

Banking (statements, transactions, reconciliation) and cash flow are **separate
workspaces**; bookkeeping links into them rather than absorbing them.

Repeating screen pattern, used by every tab:

1. **Header** — workspace title, company context, primary action button.
2. **Filter bar** — status, date range, counterparty, free text. Filters are
   visible, never hidden behind a menu.
3. **Register table** — dense, sortable, one row per record, status as a badge,
   money right-aligned with two decimals and explicit currency.
4. **Row actions** — lifecycle-aware: a posted document offers *Settle*,
   *Cancel*, *View*; a draft offers *Edit*, *Post*, *Delete draft*.
5. **Dialog for create/edit** — never a separate page; the register stays behind.
6. **Empty state** — explains the record type and offers the primary action.

Money is always formatted with the document currency; dates as `dd MMM yyyy`.
Read-only users see the same screens with actions absent, not disabled-and-noisy.

## 3. Document lifecycle

```text
draft ──post──► posted ──cancel──► cancelled
  │                │
  └─delete         └─settle──► partially settled ──► settled
     (drafts only)                     │
                                       └─reverse payment──► back to outstanding
```

- **Draft** — freely editable, no financial effect, deletable.
- **Posted** — header and lines become immutable; the document counts towards
  period totals, cash flow and outstanding balances.
- **Cancelled** — requires a reason, keeps the record and its history visible,
  removes its financial effect. Never a hard delete.
- Once a document has settlements or reconciled payments, immutability
  tightens further: only reversal (with reason) can unwind it.

Posting is a deliberate, confirmed action. It never happens implicitly on save.

## 4. Counterparty model

- One register for all external parties; a `counterparty_type` describes the
  usual role (supplier, client, both, bank, authority) but never restricts which
  documents may reference the record.
- Fiscal identity is first-class: legal name, trading name, tax number with
  format validation, country, address.
- Commercial defaults live on the counterparty and pre-fill documents: payment
  terms, payment method, IBAN/BIC, currency, default classification.
- Counterparties are **archived**, never deleted; archived records stay
  selectable on historical documents and disappear from new-document pickers.
- Document snapshots the counterparty's name and tax number at posting time so
  later master-data edits never rewrite history.

## 5. Classifications

- A hierarchical chart with a code, a name, and a nature (income / expense /
  neutral).
- Each classification carries fiscal defaults: VAT rate and code, recoverability.
- Behavioural flags decide downstream effect: affects cash flow, affects profit,
  counterparty required, cash-flow category.
- Classifications are **not** properties, units or projects. Those are
  dimensions, applied per line alongside the classification. A screen must never
  offer a property in a classification picker or vice versa.
- Lines inherit the document classification unless overridden.

## 6. Document editor

- Two-part dialog: **header** (counterparty, type, series/number, dates, period,
  currency, attribution) and **lines**.
- Line math is shown live as the user types — net, discount, VAT, total — but the
  authoritative totals are recomputed server-side on save and re-read afterwards.
  The UI never trusts its own arithmetic as the stored value.
- VAT presets for the operating jurisdiction are offered as one-click choices,
  with a free rate available.
- Totals are **derived**, never typed. There is no editable "document total".

## 7. Settlement

- Settlement is recorded against a posted document: amount, date, method,
  optional bank transaction, optional note.
- Partial settlement is normal: the document shows outstanding vs settled and
  moves to *settled* only when the outstanding amount reaches zero.
- Split settlement (many payments to one document) and grouped settlement (one
  bank transaction covering many documents) are both supported.
- Over-settlement is rejected with a clear message, not silently clamped.
- Reversing a payment requires a reason, keeps the original payment row visible
  and restores the outstanding amount.

## 8. Reconciliation

- Bank transactions are imported into a staging area, reviewed, then confirmed.
  Duplicate detection uses a deterministic fingerprint.
- Matching supports one-to-one, one-to-many, many-to-one and partial links.
- Suggestions use amount/date tolerance and counterparty history and are
  **always proposals** — nothing reconciles automatically.
- Reconciliation preserves source ownership: the amount belongs to the document
  or the source record, never to the reconciliation link.
- Unreconciling is an audited action with a reason, not a delete.

## 9. Corrections and reversals

| Situation | Correct action |
| --- | --- |
| Mistake in a draft | Edit the draft |
| Mistake in a posted document | Cancel with reason, issue a corrected document |
| Wrong or duplicated payment | Reverse the payment with reason |
| Wrong bank match | Unreconcile, then rematch |
| Obsolete counterparty or classification | Archive |

No screen offers permanent deletion of a posted document, payment or reconciled
transaction. Reasons are mandatory and displayed in the record's history.

## 10. Documents and attachments

- A financial record and its files stay linked for the record's lifetime;
  cancelling a document keeps its attachments.
- File metadata (name, type, size, source, uploader, date) is stored in the
  application; the file itself may live in an external repository (Google Drive
  in Pedra Rioja). The application always holds the link and the metadata.
- Attachments are added at any lifecycle stage, including after posting, since
  supporting evidence often arrives late. Adding one never mutates amounts.

## 11. Permissions

Four capability levels, expressed independently of any product's role names:

| Capability | Can |
| --- | --- |
| **View** | Read registers, documents, payments, periods, reports |
| **Record** | Create and edit drafts, post documents, record settlements |
| **Approve** | Confirm reconciliations and period totals |
| **Manage** | Cancel, reverse, edit classifications, rules and periods |

Rules: fail closed (no capability ⇒ no access); the UI hides what the user
cannot do; the server re-checks every mutation; shared bookkeeping components
know only the capability names, never product role names.

## 12. Reporting principles

- Figures are **derived** from stored primitives (lines, payments, transactions),
  never duplicated into summary columns that can drift.
- Every headline number is traceable: click through to the documents behind it.
- Period totals are recomputable on demand and show when they were last
  computed.
- Reporting is operational — outstanding balances, VAT per period, cash effects
  — not a general ledger or double-entry trial balance.
- Cash flow consumes bookkeeping through linked source records; it never
  re-enters amounts.

## 13. User-facing consistency rules

1. Same word for the same concept across every screen and message.
2. Status is always a badge with a fixed colour per status.
3. Destructive-looking actions require a reason, and say what will happen.
4. Money: two decimals, right-aligned, explicit currency, no bare numbers.
5. Dates: one format, one locale, everywhere.
6. Create and edit happen in dialogs; registers keep their filter state.
7. Confirmation toasts state the record and the effect ("Invoice 2026/14
   posted"), not "Success".
8. Errors quote the server's reason; the UI never invents a friendlier untruth.
9. Empty states teach the concept and offer the primary action.
10. Anything that changed a financial record appears in that record's history.
