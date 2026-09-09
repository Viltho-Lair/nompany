# Payroll

What people are paid, the runs that pay them, the bank file, and what it does to the
ledger. A tab on Employees (`/<slug>/hr-employees`), two collections — `payRecords` and
`payrollRuns` — and one new permission area, `hr.payroll`.

## What it is

**`hr.employees.salary` has existed since the catalogue was written, labelled "See pay and
salary", and nothing in this product stored a salary.** The right reveals identity and
passport numbers — its own comment says so — so a studio granting somebody "see pay" got
passport numbers and no pay. Invariant 16 from the inside: a right that names something
nothing can exercise it against.

### Two rights, and they are not the same one

`hr.employees.salary` reveals ONE person's record to somebody who may already read it;
`hr.payroll` opens the whole company's wage bill. A studio hands the first to a line
manager and the second to whoever runs payroll, and they are rarely the same person.

**`hr.payroll` is deliberately NOT scoped.** A payroll run is the studio's, and a
departmental view of it would be a partial total nobody could reconcile against the ledger.

**`approve` is an extra on the same area**, because approving is an act ON a run — and
invariant 7 is enforced at the transition rather than in the permission model: the person
who prepared a run never approves it, whichever rights they hold.

### A pay record is now; a run is a snapshot

A pay record is what somebody earns NOW — a monthly basic, plus recurring allowances and
deductions. **A run copies it and freezes it**, so a rise next month cannot rewrite last
month's payslip. The rule the approval engine follows by storing the FX rate on the bill it
routed: a record of what was decided must not move when the inputs do.

**One record per person** — two pay records is two salaries, and the run would pay whichever
it found first. **One run per period** — a second September is two wage bills for one month.

**Somebody with no pay record is not on a run.** They are not paid nothing; nothing has
been decided about their pay, and a nought line would produce a payslip saying they earned
nothing, which is a statement the studio has not made. They are listed on screen in amber.

**Bank details live on the pay record**, not on the collaborator: `hr.payroll` already
gates that row, where a field on the collaborator would be readable by anybody who may read
People — Managers and Team Leads by default. **The account is read LIVE at bank-file time**
rather than frozen with the run: somebody who changed banks between approval and payment
should be paid at the new one, because the account is where the money goes, not what was
decided.

### The arithmetic, and what it refuses to do

**Amounts are always positive and the KIND carries the sign.** A deduction stored as a
negative allowance is the same thing said two ways, and the first report that sums
"allowances" gets it wrong.

**A basic of nought is legal and a negative one is not.** Somebody paid only in commission
has a basic of nought; nobody has a negative wage.

**Unpaid leave is pro-rated on the BASIC alone, not on the gross.** An allowance for a
phone or a car does not stop because somebody took a week unpaid; a studio that wanted it to
would be describing a different allowance. Doing it on the gross is the common shortcut and
it silently docks the wrong amount. Only `Unpaid` leave and only `Approved` leave counts —
a pending request would dock money for a day a manager might refuse — and it is clipped to
the period, so a fortnight spanning a month end is two deductions rather than one counted
twice.

**A net below nought is reported, never clamped.** Deductions exceeding pay is real — a
repaid advance, a month almost entirely unpaid — and clamping to nought would quietly
forgive the difference and leave the ledger short by exactly the amount nobody noticed.

### The ladder

`Draft` → `Approved` → `Paid`, and it never runs backwards. A payroll that could be reopened
after approval is a payroll whose payslips are not evidence of anything.

**A draft run has no bank file.** Its amounts are still being edited, and a payment file is
the one artefact that must never be provisional.

**A slip with no account is left out of the bank file and named.** A payment file with an
empty account number is rejected by the bank as a whole, so one missing detail would
silently fail everybody's pay rather than one person's. A nought or negative net is left out
too — a bank cannot take money out through a salary file.

### The ledger

**Finance posts, HR records.** `postPayroll` lives in `ledger.ts` beside `postBill` and
`postInvoice`, reading the run through a FOREIGN nullable `hrEmployeesSection`, because the
ledger is the one place that knows what a balanced entry looks like.

**Debit Salaries for the GROSS, credit Payroll Payable for the net, credit it again for the
deductions.** What the company spent on people is everything it promised them; what it hands
over in cash is that less what it withheld. Posting the NET as the expense understates the
wage bill by exactly the deductions — the mistake that makes a payroll cost look like it
fell in a month somebody took a loan.

**Deductions go to the same liability as the net rather than to income.** This product does
not know what a deduction IS — a loan repayment, a social security contribution, a fine —
and putting it somewhere more specific would be guessing on the studio's behalf.

**`2200 Payroll Payable` is new and needs no migration**: `ledgerAccounts` seeds any missing
code from the default chart on every read, so an existing studio gains it the next time its
ledger is opened. It is its own liability rather than Accounts Payable, because what a
company owes its staff and what it owes its suppliers are different lines on a balance
sheet.

**Dated by the period's last day, not by the clock.** A run for September posted in October
is September's cost.

**Idempotent by source**, like every other posting.

## What building it found

**`money()` in `ledger.ts` means CENTS → MONEY** (`Math.round(c) / 100`), and the first
draft used it as a rounder on totals that were already money — dividing the wage bill by a
hundred and producing an entry of 35 against 33.02, refused as unbalanced. The pure model
was right and the seam was wrong, which is exactly why the end-to-end case in
`tests/crud.mjs` exists: it caught it on its first run.

## Not built yet

- **No attendance.** Unpaid leave comes from the vacation register; hours worked do not
  exist, so an hourly employee cannot be paid.
- **No tax engine.** Income tax and social security are typed as ordinary deductions; the
  product computes neither and knows no rates.
- **No end of service, no overtime, no bonuses.** Anything one-off has to be typed onto the
  pay record and taken off again.
- **The bank file is a plain CSV**, not a bank's own WPS/SIF layout. The columns are Name,
  IBAN, Bank and Amount, which no bank accepts unmodified.
- **A payslip is a table on screen.** There is no printable or emailable slip, and nobody is
  notified when a run is approved.
- **One currency.** Everybody is paid in the studio's own; there is no per-employee
  currency and no FX.
- **`Paid` is a state somebody sets by hand.** Nothing reconciles it against a bank
  statement, and nothing posts the payment itself — the run posts the accrual only, so
  `2200` is never cleared.
