# Product strategy — Pedra Rioja Hub and PSA Hub

Status: **binding decision**, recorded 2026-07-29. Supersedes the Phase 6e
"shared bookkeeping runtime" direction described in `BOOKKEEPING-SHARED.md`
and `BOOKKEEPING-EXTRACTION.md`, which are now historical background only.

## Decision

Pedra Rioja Hub and PSA Hub remain **separate applications with separate
databases**. There is no shared runtime package, no cross-project integration,
and no PSA migration work in this repository.

The immediate objective is to finish Pedra Rioja Hub as a complete, stable
application. Pedra Rioja's bookkeeping experience becomes the **reference
design** that PSA Hub may later adopt — as a product and UX reference, not as a
technical contract. See `BOOKKEEPING-REFERENCE-DESIGN.md`.

## Scope of each product

**Pedra Rioja Hub** — property ownership, acquisitions, mortgages and leasing,
bank balances, recurring income and costs, investment projects, property cash
flow, taxes, depreciation, documents, investment reporting.

**PSA Hub** — architectural projects, professional clients, suppliers,
proposals, invoicing, expenses, VAT, payroll-related and operational finance,
practice management.

## Explicitly not required

- a shared database
- a shared deployment
- cross-project writes
- a shared authentication domain
- a live shared bookkeeping package
- synchronized records

The only intended convergence is that the same administrative users should
eventually meet a **consistent bookkeeping experience** in both products.

## Reference bookkeeping principles (frozen)

Product-level principles, not cross-project technical contracts:

1. Counterparties may act as suppliers, clients or both.
2. Financial documents contain lines and classifications.
3. Document totals are derived from line data.
4. Documents use a controlled lifecycle such as draft, posted and cancelled.
5. Posting creates the relevant financial or cash-flow effects.
6. Payments and settlements are auditable.
7. Corrections use cancellation or reversal rather than destructive deletion.
8. Bank transactions can be matched to documents and payments.
9. Partial and split settlements are supported.
10. Financial classifications are distinct from properties, projects and other
    operational dimensions.
11. Documents and attachments remain linked to the financial record.
12. Historical accounting records become increasingly immutable after posting
    and reconciliation.
13. Archiving is preferred over deletion.
14. Permissions distinguish recording, managing, approving and administrative
    actions.
15. The interface uses consistent bookkeeping terminology and interaction
    patterns.

## Consequences for this codebase

- `src/packages/bookkeeping-core/` stays. It is a clean internal boundary that
  benefits Pedra Rioja on its own merits (testability, no leakage of real-estate
  concepts into finance screens). It is **not** maintained as a publishable
  package and is not versioned against PSA Hub.
- Host adapters in `src/modules/bookkeeping/host/` stay: they are Pedra Rioja's
  own composition layer, not PSA scaffolding.
- No PSA-specific adapters, compatibility views, migration scripts or live-data
  probes are kept in this project.
- Module boundaries (bookkeeping, banking, cash flow, properties, projects,
  documents, permissions) are maintained where they make Pedra Rioja easier to
  reason about, and are **not** further generalised for PSA compatibility.
