# Payment runs — paying the bills that are due, together

**Where:** Finance → Payables & Expenses → Payment run · `modules/finance/paymentRun.ts` (pure),
`modules/finance/paymentRunService.ts`, `/api/studios/<slug>/finance/payment-runs`,
`tests/payment-run-model.mjs`. Built 18/09/2026 (Finance plan, step 5).

## What it is

The approved bills due by a date, paid in one act from one money account. **It is not a second
way to pay**: every bill in a run is paid through `recordBillPayment`, the one door a bill payment
has, so approval, the payment hold (`payment-hold.md`), the overpayment check against the NET of
withholding, the foreign rate, the ledger posting and the withholding settlement all happen bill
by bill exactly as they do for one payment.

## What it does

- **Lists** every Approved bill with something owing, due on or before the chosen date (today by
  default), **plus any bill with no due date** — payable now, and left out it would wait for ever.
  Oldest due first, undated last. A **held** bill is listed with its badge and cannot be chosen.
- **Pays** the chosen bills, each for what it still owes, on the chosen date, from the chosen money
  account (1010 Bank by default). Needs `finance.payables.pay` — the same right as one payment.
  A wrong money account is refused once, before anything is paid.
- **A refusal does not stop the run.** A bill the pay door refuses (held since the list was drawn,
  no longer approved, paid meanwhile by somebody else) is recorded with its reason and the rest
  are still paid, so nobody has to guess which suppliers were paid.
- **Each run is kept** (`paymentRuns`, filed under `finance-payables`): the date, the account, and
  per bill the amount and the outcome. The last twenty show under "Earlier runs". A run in which
  nothing was even payable is refused and leaves no record.
- Totals are shown per currency; a foreign bill is paid in its own currency and converted at the
  day's rate by the pay door, as a single payment is.

## Not verified in the sandbox

The list, the refusals and the screen were exercised; **paying a bill through a run was not**,
because approving a bill in the sandbox now asks for the owner's signing PIN, which was not
entered. `recordBillPayment` itself is unchanged.

## Not built yet

- **No bank payment file** (ISO 20022 pain.001, a local bank's CSV): the run records the payments;
  the transfer is still made in the bank.
- **No approval of the run itself** as one document — each bill was already approved.
- **Partial amounts**: a run pays what each bill still owes, never part of it.
- **No scheduling**: a run is made by somebody opening the tab.
