# Periods and close — and the ledger screen

A month that is finished with. A tab on the Ledger (`/<slug>/finance-ledger`), one
collection — `accountingPeriods` — and one new right, `finance.ledger.close`.

## The screen that was not there

**`finance-ledger` had no branch in `StudioFinance` and fell through to the CASH screen.**
A studio granted `finance.ledger.view` opened a page of invoices, while the trial balance,
the journal, the profit and loss and the balance sheet were all computed by a route nothing
in the product ever called.

That is the project `/costs` routing bug in a second place, and the shape CLAUDE.md already
names: **a section that silently renders the wrong screen is how a right ends up exercising
nothing** (invariant 16). Both halves were individually valid — a view switch with no case,
and a default that returns a real screen — which is why nothing failed.

`StudioLedger` is that screen: trial balance, journal, P&L, balance sheet and periods, all
from ONE read of the route. The route computes them from a single read of the journal, so
serving them separately would be four reads and four chances for the profit and the trial
balance to be computed a second apart.

**The trial balance shows the two sides separately and never as a difference.** A single
"out by" figure hides which side is wrong, which is the only thing the report is read for
when it does not balance.

## Periods

**Every entry in this ledger has always been postable into any month.** A studio could
report September, send the figures to its accountant, and then post a bill dated the 3rd of
September in November — and the September it had already reported would quietly stop being
the September in the system. Nothing said it had changed, because nothing was watching.

**The lock lives in `postEntry`**, the one door every entry passes through. A check in each
of the seven posting functions would be seven chances to add an eighth without it. The date
is resolved FIRST, because an unparseable one becomes today and the lock must judge the date
that will actually be stored.

**It refuses the POSTING, not the document.** An invoice raised late still exists; what it
cannot do is land in a month somebody has already reported. Silently posting it into the
next open period would put September's revenue in November and give two people two different
answers to "what did we do in September" — worse than a refusal somebody has to think about.

### A close is a lock, not a checklist

It does not require every document to be posted first, and deliberately so: a studio that
cannot close until everything is perfect never closes, and a lock that is never applied
protects nothing.

**What it does instead is say what is still unposted.** A close that only counted entries
would be a button somebody presses; one that says "12 entries, and 3 bills dated in this
month are not in the books" is a decision. Draft and cancelled documents are not listed —
they were never meant to be in the books, and listing them would make every close look
incomplete for reasons nobody can act on. The question is asked of the JOURNAL rather than a
flag on the document, exactly as `alreadyPosted` is.

**A future month cannot be closed.** Locking a month whose entries have not been made is not
a close; it is a way to stop people working, discovered by somebody unable to post today's
invoice.

### Reopening is allowed, and recorded

A period that can never be reopened turns one honest mistake into a permanent wrong number,
and every accounting system that pretends otherwise grows a "period 13" to put the
corrections in. What matters is that reopening is a decision somebody made, with a name on
it — so **a reopening without a reason is the one thing refused**. The act is legitimate;
doing it silently is not, because the reason is the whole audit value of allowing it.

**A reopened period keeps its row.** Deleting it would erase the fact that it was ever
closed and reopened, which is precisely the fact an auditor wants. `isClosed` therefore asks
whether a row exists AND has no `reopenedAt`, and a month closed again reuses its row rather
than adding a second — two rows for one month and `isClosed` would depend on which it read
first.

**A closed month with no entries is still a row.** Closing an empty month says "nothing
happened and nothing may", and hiding it would make the lock invisible.

**The month list is derived from the entries**, not from a calendar: a studio's first month
is the month of its first posting, and listing every month since the epoch would be a screen
of empty rows nobody closes. The current month is included even when empty, because it is
the one somebody is working in.

## What building it found

**The trial balance's totals are `totalDebit` / `totalCredit`, not `debit` / `credit`** —
those are the per-ROW names. The first draft guessed, and the footer printed 0.00 under two
columns of real figures, which looks like a broken report rather than a wrong field. Found
by opening the screen, which is the only instrument that could.

## Not built yet

- **No year-end.** Nothing moves the retained result into equity, so the balance sheet
  computes it on every read and says so. Closing twelve months is not closing a year.
- **Nothing else consults the lock.** A closed month still accepts a new INVOICE or BILL
  dated in it — only the posting is refused — so a document can exist that can never reach
  the books until somebody reopens.
- **No lock date beyond the month.** The unit is a calendar month; there is no "locked up
  to the 15th".
- **The journal is a list, not a register.** It cannot be filtered, searched or cut by a
  dimension on screen, though the route already computes a breakdown when asked.
- **No hand-keyed entry from the screen.** `postEntry` accepts one and the UI offers no
  form, so a manual adjustment is an API call.
