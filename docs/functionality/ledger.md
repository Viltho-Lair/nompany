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

### Dimensions, and what reconciles to what

**A line can name a deal, a project, a cost code and a department**, all optional. Opening
capital belongs to no deal; a bank transfer to no cost code. Requiring one would force
somebody to invent it, and an invented dimension is worse than an absent one because it
reports as fact.

**They are carried, never validated** — the same decision `milestoneId` on an invoice and
`costCodeId` on a bill already make. An id is checked by the reader that groups on it,
which is the only place that can also cope with the thing being DELETED afterwards. A
write-time check would refuse a foreign id and still be silent about a dimension that
disappeared later, so it buys nothing and costs a read per posting.

**A cut EXCLUDES the lines that do not name the value.** Asking what a deal earned must
not quietly fold in the postings belonging to no deal, or every deal card is wrong by a
share of the studio's overheads — and the smaller the deal, the more wrong it is.

**So the undimensioned residue is reported in its own right**, under an empty key, and
sorts last because it is not a competitor to the deals. That is what makes the sum
reconcile: every row of the breakdown, residue included, adds back to the whole ledger's
profit. Gate A asserts exactly that, which is the programme's acceptance test — *the deal
card's profit figure reconciles to the ledger* — finally being answerable.

**The balance sheet is never cut**, and that is a decision. A balance sheet is a statement
about the whole entity: assets equal liabilities plus equity precisely because every
posting is in it. Filter it to one deal and the identity breaks — the deal's receivable is
there, the bank account that will collect it is not — so it would report itself unbalanced
and be right to.

**The dimension name is checked against a closed set of four.** It is a property the
reader indexes lines by, so accepting whatever arrived in the query string would let a
caller read an arbitrary field off every posting.

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

- ~~**Nothing posts automatically.**~~ **Issuing an invoice posts it, 08/09/2026.** The
  decision that was open is taken: the posting runs under the STUDIO's authority, not the
  issuer's. `finance.ledger.post` is the right to keep the books BY HAND and almost nobody
  holds it; an automatic posting is not that act, because the person issuing the invoice
  was already authorised to do the thing that makes the entry true and the accounts were
  chosen by `postInvoice` rather than by them. `system: true` is the bypass — one named
  place, greppable, unreachable from a request body, and it skips ONLY the permission:
  the entry must still balance, the accounts must exist and be active, the document must
  be postable, and it must not already be posted. Gate A proves it with a clerk holding
  no ledger right at all, and proves the same clerk still cannot post by hand.

  **It cannot fail the invoice.** The document was issued; that happened. A refusal
  travels back beside the invoice for the screen to surface, because a studio unable to
  invoice because its chart is incomplete is worse off than one told its books are an
  entry short.

  **Only the invoice, so far.** A bill, an expense and a payment still post only when
  asked. Each needs the same one-line wiring at its own moment — a bill when it is
  approved, a payment when it is recorded — and each is a decision about WHICH moment
  makes the entry true, not a repeat of this one.

- **A document can also be posted on request.** The five
  posting functions are reachable as of 08/09/2026 — `POST` the ledger route with a
  `document` and it books an invoice, a bill, an expense or a payment through the
  function that knows its accounts. What is missing is the "auto": raising an invoice
  still does not touch the books unless somebody asks.

  **AND THE REASON IT IS NOT AUTOMATIC YET IS A DECISION, NOT AN OVERSIGHT.**
  `postEntry` requires `finance.ledger.post`. If issuing an invoice posted as a side
  effect, it would run under the *issuer's* rights — and most people who may raise an
  invoice hold no ledger right at all, so the posting would fail for them. There are
  only two honest ways out and both need deciding rather than defaulting into:

  - **Post under the studio's authority**, not the user's — the right to ISSUE the
    document is the authority, and the ledger entry is a consequence. This is what
    real books do, and it means a deliberate permission bypass in one named place.
  - **Require the right**, and skip the posting when it is absent — which leaves the
    books silently incomplete for exactly the studios least likely to notice.

  Until that is settled, posting is asked for explicitly and the gap is visible.
- ~~**A journal line carries no dimension but `projectId`.**~~ **Fixed 08/09/2026.** A
  line now carries `dealId`, `costCodeId` and `departmentId` beside it, the P&L can be cut
  by any one of them, and `byDimension` reports what each value earned. **What is still
  missing is the other end**: nothing WRITES a dimension automatically, because nothing
  posts automatically — so a deal's figures are only as complete as the entries somebody
  keyed by hand against it.
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
