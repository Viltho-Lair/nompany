# The ledger, and the statements it produces

**Where:** `/api/studios/<slug>/finance/ledger`, behind `finance.ledger`.

## What it is

Double-entry bookkeeping: a chart of accounts, balanced journal entries, a trial
balance, a profit and loss, and a balance sheet.

**IT HAD NO DOOR AT ALL UNTIL 08/09/2026, and this is the thing worth knowing about
it.** `postEntry`, `reverseEntry`, `listJournal`, `trialBalance` and the four
document-posting helpers were written, typed and guarded — and **nothing imported the
module**. No route, no caller anywhere in `src`. A whole double-entry book the product
could not open, while `docs/progress.md` recorded the ledger as built.

That is the same class of defect as a right nothing can exercise (invariant 16), at
module scale, and it is why the programme's own acceptance test — *"the deal card's
profit figure reconciles to the ledger"* — was never going to pass. Nothing could post
to the ledger to reconcile against.

## What it stores

**`ledgerAccounts`** — the chart, which **seeds itself on first read** from a small
KSA-shaped default, so a studio can post the day it opens Finance rather than being
asked to build a chart of accounts first. Every account carries a `type`: asset,
liability, equity, income or expense.

**`journalEntries`** — a balanced set of lines posted as a unit, with a `source` tying
it back to what caused it and a `reference` from the counter (invariant 10).

**Everything is whole cents.** A ledger that carries floating-point crumbs stops
balancing after enough postings, so amounts are rounded on the way in and every balance
check compares integers. Three postings of 0.10 balance exactly against one of 0.30,
which is asserted rather than assumed.

## What it does

**An unbalanced entry is refused.** That is the whole of double entry, and it is the
service's rule rather than the route's — the route could be replaced and the refusal
would still stand.

**A posted entry is never edited and never deleted.** The correction is another entry
that mirrors it, so the book keeps showing both what was posted and what undid it.
That is why the route has **no PUT and no DELETE**, only a `PATCH` that reverses. An
entry records its own reversal, so it cannot be reversed twice.

**One read serves the whole screen** — chart, journal, trial balance, P&L and balance
sheet. They all read the same entries; serving them separately would be four reads of
one collection and four chances to show a profit and a trial balance computed a second
apart.

### The statements

**Income and liabilities read positive.** They are credit-normal, so reporting every
type as debit-minus-credit would show 4,000 of sales as −4,000 — arithmetically true
and read as a loss by everybody who is not an accountant.

**An account with no movement is omitted, not shown at nought.** A statement listing
the whole chart at 0.00 buries the dozen rows that moved among the fifty that did not.

**A contra balance is real and shows as negative** — a credit balance on an expense
account happens (a refund, a reclass) and must not vanish.

**An undated posting is in no statement.** A statement is a claim about a period, and
a posting naming no day belongs to no period; including it would put it in every report
ever run.

**The balance sheet's retained result is computed, not stored**, and it is what makes
the sheet balance. No account holds it until a year-end closes the books, and periods
and close are not built — so omitting the term would show every trading studio out of
balance by exactly its own profit, which reads as a broken ledger rather than a missing
feature.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing posts automatically.** `postInvoice`, `postBill`, `postExpense` and
  `postPayment` exist and are still reached by nothing: raising an invoice does not
  touch the ledger. Every entry is keyed by hand. This is the programme's
  "auto-posting from every module" and it is the largest remaining piece.
- **A journal line carries no dimension but `projectId`.** No deal, no cost code, no
  branch, no department — so the ledger cannot be cut by any of them, and the
  acceptance test that the deal card reconciles to the ledger still cannot be written.
- **No periods and no close.** Nothing locks a date range, nothing rolls a year end,
  and the retained result is therefore recomputed from the beginning of time on every
  read rather than carried into equity.
- **No cash flow statement.** The P&L and balance sheet are here; the third statement
  needs cash movements classified as operating, investing or financing, which no
  account or entry records.
- **No credit notes**, so a correction to an invoice is a manual journal.
- **No tax engine.** VAT is a rate on an invoice, not a posting rule; there is no
  ZATCA adapter and no withholding.
- **No bank reconciliation**, no cash-flow forecast, no post-dated cheques, no letters
  of guarantee.
- **Seeding the chart is not safe under concurrency.** `ledgerAccounts` creates the
  default accounts read-then-create with no compare-and-set, so two first requests to a
  brand-new studio can each find it empty and each seed it — a chart with every account
  twice. The ledger route avoids it by resolving the chart once before its concurrent
  reads, which is why that `await` sits alone above the `Promise.all`; nothing makes the
  seed itself atomic. It had never been reachable before this route existed, because
  nothing called `ledgerAccounts` at all.
- **There is no screen.** The route serves the whole ledger and nothing renders it —
  the door exists, the room is empty.
