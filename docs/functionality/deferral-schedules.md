# Deferral schedules — revenue over time (IFRS 15) and prepaid costs

**Where:** Finance → General Ledger → Schedules · `modules/finance/schedules.ts` (pure),
`modules/finance/scheduleService.ts`, `/api/studios/<slug>/finance/schedules`, postings
`postDeferral` / `postRecognition` in `modules/finance/ledger.ts`, `tests/schedules-model.mjs`.
Built 18/09/2026 (Finance plan, step 6).

## What it is

Money booked in one month that belongs to several. **Revenue invoiced before it is earned**
(a year's support contract, IFRS 15's revenue over time) and **a cost paid for months not yet had**
(a year's insurance, rent in advance). One mechanism for both, because they are the same act in
two directions.

**The document is not changed.** The invoice still posts AR, Revenue and VAT — the customer does
owe it. The schedule adds its own entries beside it:

| | Deferral (its day) | Each month's share (month end) |
|---|---|---|
| Revenue | Dr the revenue account, Cr **2300 Deferred Revenue** | Dr 2300, Cr the revenue account |
| Prepaid cost | Dr **1450 Prepaid Expenses**, Cr the cost account | Dr the cost account, Cr 1450 |

Both accounts are new default accounts, seeded into every studio's chart on its next read.

## What it does

- **A schedule** names its kind, the P&L account (an income account for revenue, an expense account
  for a cost — refused the other way round), the amount, the first month recognised, 2 to 120
  months, the day the amount is deferred (the first of the first month unless said; never after
  it), a description and the invoice or bill it defers (typed). Creating one posts the deferral at
  once; if its month is closed the schedule stands and says it is not in the books yet, and the next
  run posts it first.
- **The shares add up exactly in the currency's own units** — split in minor units, the remainder
  in the last month. (Split at three places, twelve shares of 1,000 riyals posted 999.97.)
- **The monthly run** — previewed, then posted — brings every schedule's shares due by the end of a
  month into the P&L, oldest first, each dated its own month's last day and posted once
  (`<scheduleId>:<YYYY-MM>`), so a run catches up several months and never writes into one already
  done. A closed month refuses by name and the rest carry on.
- **Cancelling** is allowed only while nothing has been recognised: the deferral is reversed on its
  own day, so the amount returns to the P&L where the document put it. After a month is
  recognised, the correction is a manual entry, and the refusal says so.
- Rights: reading is `finance.ledger.view`; creating, running and cancelling post, and answer to
  `finance.ledger.post`.

## Not built yet

- **No link to the invoice or bill itself**: the reference is typed, and issuing an invoice does not
  offer a schedule. Cancelling the invoice does not cancel its schedule.
- **Straight-line only** — no recognition by milestone, percentage of completion or usage, and no
  separate performance obligations within one contract (IFRS 15's five steps are the studio's to
  apply; this books the result).
- **No automatic monthly run**; somebody runs the month (the close checklist does not yet ask).
- **Accrued revenue and accrued costs** (earned or incurred before the document) are not schedules.
