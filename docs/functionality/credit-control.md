# Credit control — customer credit limits and payment reminders

**Where:** Finance → Receivables → Credit and → Reminders · Finance settings → Payment reminders ·
`modules/finance/credit.ts` (pure), `modules/finance/creditService.ts`,
`/api/studios/<slug>/finance/receivables`, `tests/credit-model.mjs`. Built 18/09/2026 (Finance
plan, step 5).

## What it is

How much a customer may owe, and who is late. Before it, nothing limited what a studio would
invoice a customer who had not paid in ninety days, and "overdue" was a flag on one invoice at a
time that chased nobody.

**A customer is the name on its invoices.** An invoice carries `clientName` and no client id, so
the name is the only join; it is compared case- and space-insensitively ("ACME Ltd" and
"Acme  Ltd" are one customer) and never rewritten.

**Rows are filed under `finance-receivables`** — `customerCredit` and `dunningNotices`, the first
rows that section owns. Invoices stay under `finance-cash` where every studio wrote them.
`customerCredit` carries the customer's name, which is a sealed field (invariant 18) by name.

## What it does

- **Credit** lists every customer who owes anything on issued invoices, or has a limit: what it
  owes, how much is overdue, its limit, and the headroom left (a dash with no limit — "unlimited"
  and "nought left" must not read alike). A holder of `finance.receivables.edit` sets a limit, a
  note, or **puts the customer on hold**. A blank limit is no limit; a limit of 0 means every
  invoice needs an override.
- **The limit is checked when an invoice is ISSUED** (Draft → Sent), because issuing is when the
  studio extends the credit. Over the limit (`credit-limit`, with the limit, what is owed and what
  it would become) or on hold (`credit-hold`) is refused. The issuer may insist — the screen asks —
  and the invoice then records **`creditOverride`**: who, when, the reason and the figures. A limit
  nobody may ever pass is one people stop setting; one passed silently is not a limit.
- **Reminders** lists every overdue invoice with days late, what has been sent and the level now
  due. Three levels by default — at **1, 15 and 30 days** late (Reminder, Second notice, Final
  notice) — and a studio sets its own day counts in Finance settings (ascending, up to five). The
  run proposes the HIGHEST level reached, never each one skipped: three letters on one morning is
  not a reminder.
- **nompany does not send the reminder.** It holds no client's address. The screen offers the
  letter's text in the studio's language to copy; recording the chosen invoices as sent writes one
  notice each (`dunningNotices`), which is what moves the next run on.

## Also fixed in this slice

- **Cash & Bank's Treasury tab rendered nothing** from the step-3 split (`f0b64c1c`) — the tab bar
  offered it and no branch drew it. It draws the treasury panel again.
- **Finance settings' read checked no right**, so any member could read the withholding rules and
  payment-hold tolerances. It asks for `finance.settings.view` now.

## Not built yet

- **No client id on an invoice**, so two customers with the same name are one customer here, and a
  renamed customer starts a new line.
- **Foreign-currency invoices** count at their own figures, unconverted, against a limit in the
  studio's currency.
- **No sending**: no email, no letterhead PDF, no statement of account; and no automatic run (a
  cron) — somebody opens Reminders.
- **Nothing blocks at quotation or sales-order stage**, and the POS till does not check credit.
- **No interest or late fees** on overdue invoices.
