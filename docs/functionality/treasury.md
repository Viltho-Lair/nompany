# Treasury — post-dated cheques, the cash-flow forecast, and letters of guarantee

Cash that has not moved yet. A tab on Cash (`/<slug>/finance-cash`), two collections —
`cheques` and `guarantees` — and **no new permission key**.

## What it is

**The product knows what it is owed and what it owes, and has never been able to say when
the bank account runs out.** Receivables have due dates, payables have due dates, and
nothing put them on a timeline — so "can we pay the subcontractors on the 30th" was answered
by somebody adding up spreadsheets, and answered again next week.

Three things live here, and they are one feature because they are all the same question:

- **Post-dated cheques.** Ubiquitous across this product's region and modelled nowhere. A
  cheque dated the 30th is not cash and is not a receivable either: the debt is settled, the
  money has not arrived, and the paper can still bounce.
- **The forecast.** Today's bank balance, walked forward through what is due.
- **Letters of guarantee.** Not cash and not a liability — a commitment against the studio's
  facility that expires, and expires silently.

**Reading is `finance.cash.view`** — a forecast is made of receivables and payables the
reader can already open — **and writing is `.edit`**. A separate right would gate a view
assembled entirely from things it does not gate.

### Cheques

**Five states**: `held` → `deposited` → `cleared`, with `bounced` off the deposit and
`returned` off the hold. A bounced cheque and a returned one are DIFFERENT events — one is
the bank refusing it, the other the studio handing it back — and a register calling both
"cancelled" could not tell a studio which customers pay in paper that fails.

**A deposited cheque can go back to `held`** when the bank returns it unpresented, which is
not a bounce: calling it one would mark a customer as having failed to pay when nothing was
ever presented.

**A cleared cheque is finished.** The money arrived; the only correction is a new record of
what actually happened, not a rewrite of this one.

**The amount is always positive and the DIRECTION carries the sign** — the rule a payslip's
allowances and deductions follow, and for the same reason: one field meaning two things is
the first report that sums them getting it wrong.

**A cheque needs its number**, because without it it cannot be found at the bank, chased, or
told apart from the next one for the same amount from the same customer.

**An edit never moves the status.** A cheque's state is a transition with its own ladder,
and letting an edit set it would be the generic-PUT shape that once let a rejected change
order approve itself.

### The forecast

**Assembled, never stored.** Every figure is computed from documents that already exist, so
it cannot go stale and there is nothing to reconcile it against.

**A cheque REPLACES its invoice, it does not add to it.** When a customer settles with a
post-dated cheque the invoice is paid and the cheque is the money in flight; counting both
would forecast the same receipt twice. Reading each document's OUTSTANDING rather than its
total is what keeps the two from double-counting without either knowing about the other.
**Only `held` and `deposited` cheques are counted** — a cleared one is already in the
opening bank balance, and a bounced or returned one is not coming.

**Anything dated before the start is counted in the first bucket**, not dropped. An invoice
due last month is still expected, and a forecast that silently ignored overdue money would
be optimistic by exactly the amount a studio is worried about.

**Buckets, not a daily line**, because nobody schedules a payment run by the day three
months out and a daily series would draw ninety points of false precision over data whose
dates are mostly "end of month".

**The closing balance is cumulative**, which is the point: a week that is net positive can
still be the week the account goes under, and a chart of per-bucket nets would not show it.

**A null shortfall is not "you are fine".** It means nothing in the horizon takes the
account negative — a different statement — so the screen names the horizon.

### Guarantees

**`expired` is not `released`, and the difference is money.** An expired guarantee has
lapsed at the bank; a released one has been given back and the margin returned. A studio
whose register conflated them would think its cash was free when the bank still holds it,
which is the exact failure a guarantee register exists to prevent. **An expired guarantee
still counts as locked up** for the same reason: expiry does not return the margin, somebody
has to ask for it back, and that asking is what `released` records.

**Releasing is its own act**, not a field an edit sets, because it is the moment the margin
comes back — the one fact about a guarantee that changes what a studio has in the bank.

**The margin cannot exceed the guarantee**: a bank holding more than the instrument is worth
is a typo, and it would overstate the cash a studio thinks is locked up.

## Not built yet

- **Nothing posts a cheque.** Clearing one does not touch the ledger, so the bank balance
  the forecast opens with does not move until somebody posts the payment separately.
- **No link to an invoice or a bill.** A cheque names a party and a number, not the document
  it settles, so "which invoices did this cheque cover" has no answer and the
  double-counting rule relies on the invoice being marked paid.
- **No cheque book or ranges.** Numbers are typed, and nothing notices a gap or a duplicate.
- **Payroll and recurring costs are not in the forecast.** Only invoices, bills and cheques
  are, so the wage bill — usually the largest predictable outflow — is missing.
- **No opening/closing bank statement balance.** The forecast opens from the LEDGER's bank
  balance, which is right, and differs from the bank's own until a reconciliation clears.
- **A guarantee is a record, not a document.** No file, no bank, no facility limit, and
  nothing warns before one expires except the colour on this screen.
