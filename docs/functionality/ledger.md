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

### When a posted document changes

**The entry follows the document**, reversed rather than edited (`reverseDocument`, under the
studio's authority like `autoPost`). Cancelling an issued invoice reverses its entry; editing
an expense's amount, category or date reverses and re-posts it, and deleting one reverses it;
cancelling a received bill reverses it, changing its lines, VAT or date re-posts it, and
deleting it reverses it. `alreadyPosted` no longer counts a reversed entry, which is what lets
the corrected document post again. A reversal is dated today and held to the period lock, so a
closed current month refuses it by name. Until 11/09/2026 none of this happened: the document
changed and its entry stood, so a cancelled invoice stayed in revenue.

### What else reaches the book, 18/09/2026

The Finance plan review (`docs/progress.md`, decision ledger) found money that moved and never
posted. Step 1 closed four of those gaps:

- **Fixed assets** (`modules/finance/depreciation.ts`, pure; `tests/asset-posting-model.mjs`).
  *Acquisition* — Dr Fixed Assets (1500), credited to what the asset was paid from, which is
  **asked and never assumed** (`fundedBy`: bank 1010, payable 2000, opening 3000, or a bill,
  whose cost is moved OUT of that bill's expense account rather than paid again). An asset with
  no source stays **off the books**, says so on the register, and is listed at the period
  close. *Depreciation* — a monthly run, previewed first, posts per asset the DIFFERENCE between
  the schedule's accumulated figure at the month end and what the book holds (Dr Depreciation
  5400, Cr 1510), so a late run, a corrected life or an asset bought years ago all come right
  in one entry, and a lengthened life posts the excess back. Source id `<assetId>:<YYYY-MM>`.
  *Disposal* — one entry: the depreciation the runs had not reached, Accumulated Depreciation
  cleared, proceeds into the bank, cost out, and the balance to Gain or Loss on Disposal (4900),
  the same figure the register shows. A booked asset that has been depreciated cannot be
  deleted; one only booked reverses its acquisition when deleted.
- **Tax a client withheld** — see `withholding.md`: settled invoices move it to 1300.
- **Foreign-currency bills** — converted at a rate frozen on the bill; see `money.md`.
- **Input VAT** — its own account, VAT Recoverable (1400). Bills posted before stay on 2100.

Five accounts joined the default chart (1300, 1400, 4900, 5400, 5800) and reach every studio
the next time its chart is read, like 2200 did. The journal-entry schema's source kinds had
been six while the ledger wrote eleven; it lists all fourteen now.

**Not posted, on purpose:** cheques and the deal-level `payments` collection. Each is the same
money an invoice or bill payment already posts, so posting either unlinked would count it
twice. They post once they name the document they settle.

### Setup the studio has not done, said before it bites (18/09/2026)

The owner's rule: **there is no home market** — the studio's country sets it — and **important
setup is annotated for users**. `financeSetup` (`modules/finance/setup.ts`, pure,
`tests/finance-setup-model.mjs`) reads the studio row and its country's definition
(`shared/compliance`) and lists what Finance needs and does not have: **no country** (tax rules
and what documents must carry come from it); **no currency** (the books are kept in it, and bill
and bid approval refuse without it); **a country with a sales tax and no VAT rate**, flagged to
*check* rather than as wrong, because an unregistered business is right to have none; and every
official value the country marks mandatory — or conditional, once its condition holds, like a
VAT number for a registered studio — in the company, finance or invoicing departments that is
blank or not in the country's format (the resolver prints neither). `FinanceSetupNotice` shows
it at the top of the Cash, Payables, Fixed assets and Ledger screens, the country's values
grouped into one line, with a link to Studio settings for somebody holding
`administration.settings.edit` and a sentence for everybody else. **It blocks nothing**: the
refusals stay where they are; this is what makes them unsurprising. **Not built:** the same
annotation for other departments (HR's official values, Logistics' licences); a dismiss.

**A refusal is said, not swallowed.** The invoices, expenses and bills routes hand back
`posting: { posted: false, reason }` and the finance screens now show "Saved — but the books
were not updated" with the reason. Before, the expenses and bills routes dropped it and both
screens ignored it.

**A reversal carries every dimension** — the mirror used to keep `projectId` alone and drop
`dealId`, `costCodeId` and `departmentId`, leaving those views off by the whole amount.

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

  **ALL FIVE NOW, 08/09/2026**, and each moment was its own decision rather than a repeat
  of the invoice's:

  - a **bill** posts on RECEIPT, not on approval. Approval authorises PAYMENT; the debt
    is owed from the day the supplier's invoice arrives, and a book that waited for a
    signature would understate what the company owes for exactly as long as its
    paperwork was behind. Reached from both doors — created `Received`, or drafted and
    then marked `Received` — because a studio that drafts its bills first would
    otherwise keep books that silently omit every one of them. A draft posts nothing.
  - an **expense** posts on creation. It has no states, so there is no later moment: it
    is money that has already left, being recorded.
  - both **payment** kinds post when the payment is recorded, as their own entry rather
    than a correction of the accrual. Issuing recognised the revenue and the receivable;
    the payment clears the receivable against the bank.

  **AND WIRING THEM FOUND A BUG THAT COULD NOT FIRE BEFORE.** A payment id is `pay1`,
  `pay2`… numbered WITHIN its invoice or bill, so every invoice in the studio has a
  `pay1`. `alreadyPosted` matches on kind and id alone, so the SECOND invoice's first
  payment looked like one already in the book: refused `already-posted`, the money never
  reaching the ledger, and nothing anywhere saying so. It was unreachable while
  `postPayment` and `postBillPayment` had no callers at all — which is the argument for
  wiring a function rather than leaving it written and admired. The source id carries its
  parent now (`<invoiceId>:pay1`), and no migration was needed for the same reason the
  bug existed: nothing had ever posted a payment.

- **A document can also be posted on request.** The five
  posting functions are reachable as of 08/09/2026 — `POST` the ledger route with a
  `document` and it books an invoice, a bill, an expense or a payment through the
  function that knows its accounts. That is the manual door; the automatic one above is
  what a studio actually relies on.

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
- **No year-end close.** Months can be closed and reopened (`periods.md`); nothing rolls
  a year end, so the retained result is recomputed from the beginning of time on every
  read rather than carried into equity.
- **No cash flow statement.** The P&L and balance sheet are here; the third statement
  needs cash movements classified as operating, investing or financing, which no
  account or entry records.
- **Credit notes are raised only by a return.** Finance → Cash → Credit notes (18/09/2026) lists
  them and issues or cancels a draft, and issuing posts (`postCreditNote` reverses the invoice's
  revenue and VAT proportionally); the only thing that RAISES one is a signed return against an
  invoice (`pos.md`). Finance cannot type one of its own on screen yet. An issued note is now taken
  off what the invoice still owes on the Cash screen and in its summary (`credited`), which
  `netOfCredits` described and nothing read.
- **No tax codes.** VAT is one studio rate that each document may change (`vat.md`). Input
  tax has had its own account (1400) since 18/09/2026, but bills posted before then netted it
  on 2100, so the Tax return tab still reads the documents rather than the journal.
  Withholding exists on invoices (`withholding.md`), not on bills.
- **Depreciation is not automatic.** Somebody runs the month from the Fixed assets screen;
  no job runs it and the period close does not yet list a month's depreciation as missing
  (it lists an asset that is off the books). Existing assets stay off the books until somebody
  says how each was paid for.
- ~~**One bank account.**~~ **Several, 18/09/2026.** An asset account marked `cash` (Ledger →
  Accounts, "money moves through it") is a MONEY ACCOUNT beside 1000 Cash and 1010 Bank, which
  are money accounts without the mark and cannot lose it (`isMoneyAccount`). An invoice
  payment, a bill payment and an expense may name the account (`accountId`); none named is
  1010, which is every one recorded before — so nothing stored changes meaning. A named
  account that is not (or no longer) a money account is refused at the form (`bank-account`)
  and at the posting. **Transfers** move money between two of them from Cash → Treasury
  (`transferFunds`, `finance.cash.edit`, source kind `transfer`): the ENTRY is the record,
  and undoing one is reversing it. Reconciliation is per account and the forecast opens from
  their total (`reconciliation.md`, `treasury.md`). **Still not built:** a fixed asset paid
  from the bank and a disposal's proceeds still use 1010; a transfer carries no fee line; the
  POS till does not post to a money account of its own.
- **Seeding the chart is not safe under concurrency.** `ledgerAccounts` creates the
  default accounts read-then-create with no compare-and-set, so two first requests to a
  brand-new studio can each find it empty and each seed it — a chart with every account
  twice. The ledger route avoids it by resolving the chart once before its concurrent
  reads, which is why that `await` sits alone above the `Promise.all`; nothing makes the
  seed itself atomic. It had never been reachable before this route existed, because
  nothing called `ledgerAccounts` at all.
- ~~**The screen reads and does not write.**~~ **It writes, 18/09/2026.** The Journal tab has
  a **New entry** form (lines, a live balanced/out-by chip, retired accounts not offered) and
  a **Reverse** button on every entry that is neither reversed nor itself a reversal, which
  asks why and makes that the mirror's memo. An **Accounts** tab lists the chart with each
  account's balance read on its own side (an overdrawn bank shows negative) and edits it
  through `/finance/ledger/accounts` — add, rename, re-parent, retire, restore; never delete.
  The rules, in `createAccount`/`editAccount`: a code is a short unique key and never changes;
  a parent is the same type and never the account or anything beneath it; the TYPE moves
  only while nothing is posted to it, and never on a default account; RETIRING refuses a
  default account (the automatic postings name them — rename instead), an account with a
  balance, and a parent with a live child. All of it answers to `finance.ledger.post`, the
  right to keep the books by hand, rather than a new key: an account nobody may post to by
  hand is only reached by the automatic postings, which name the default chart alone.
  **Still not built:** reversing an AUTOMATIC entry by hand is allowed (it always was, by
  API) and leaves its document unposted — the period close then lists it; a sub-account does
  not yet roll up into its parent on the statements; no import of a chart from a file.
