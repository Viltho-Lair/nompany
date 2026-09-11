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
invariant 7 is enforced at the transition rather than in the permission model: the person who prepared a run does not approve it, whichever rights they hold — **unless
they are the studio's Admin** (its owner, or a holder of the Admin role), who may approve a
run they prepared: the owner's instruction, 10/09/2026, because a one-person studio could
otherwise never pay itself. `isAdministrator` in `platform/access/resolve.ts` is the test.

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

## Statutory pay (tier 6, 11/09/2026)

The owner's choice: **country presets the studio confirms.** Studio settings → Employment
rules has a *Fill from {country}'s law* button for Jordan, Saudi Arabia and the UAE
(`modules/hr/statutory.ts`, every figure there with its source, researched for 2026). It
fills the form and saves nothing; **nothing touches pay until the studio saves**, because the
law moves every year and a figure applied from code goes stale in a customer's payroll with
nobody deciding it should. Studios elsewhere enter their own figures.

- **Social security**: employee %, employer %, a monthly ceiling, and whether the scheme
  covers everybody by default (Jordan and Saudi yes, the UAE's Emiratis-only scheme no).
  Charged on the basic plus the allowances a pay record marks **insurable** (housing, under
  GOSI), on the contractual wage before unpaid-leave docking, up to the ceiling. A pay record
  may say covered or not covered, and may carry its own rates — a Saudi first insured after
  July 2024 (10.75% / 12.75% from July 2026) or a non-Saudi (0% / 2%). The employee's share
  is a deduction on the payslip; **the employer's is a cost on top of gross**, frozen on the
  run with the lines and **posted with the wage bill**: Salaries is debited gross plus the
  employer's share and 2200 credited the same (`postPayroll`).
- **End of service**: months of wage per year for the first N years, then per year after,
  on the basic or on basic plus allowances, a minimum service, a cap, and resignation steps
  (under N years, X% of the award). Service is counted by the calendar, so three years to the
  day is exactly three. The Pay records list shows **what each person would be owed leaving
  today**, by termination. Jordan's preset has none: the Labour Law gives it only to
  employees the SSC does not cover.
- **The UAE's WPS file**: with a 13-digit employer ID and a 9-digit bank routing code saved
  and the studio's currency AED, an approved run offers a `.SIF` beside the CSV
  (`?format=sif`). One EDR per employee — labour-card ID (14 digits), their bank's routing
  code (9 digits), account, the period, the net as fixed income, unpaid-leave days — and one
  SCR, last by default and first if the studio's bank wants it first (the published guides
  disagree). Anybody missing an ID or an account is left out rather than failing the whole
  file. Named `<employer ID><YYMMDD><HHMMSS>.SIF` in UAE time.

## What building it found

**`money()` in `ledger.ts` means CENTS → MONEY** (`Math.round(c) / 100`), and the first
draft used it as a rounder on totals that were already money — dividing the wage bill by a
hundred and producing an entry of 35 against 33.02, refused as unbalanced. The pure model
was right and the seam was wrong, which is exactly why the end-to-end case in
`tests/crud.mjs` exists: it caught it on its first run.

## Not built yet

- **No attendance.** Unpaid leave comes from the vacation register; hours worked do not
  exist, so an hourly employee cannot be paid.
- **No income tax.** Social security is computed (above); income tax is still typed as an
  ordinary deduction.
- **End of service is shown, not provisioned or paid.** Nothing posts the accruing
  liability monthly, nothing records a leaving date or reason, and no final settlement run
  exists. No overtime, no bonuses.
- **Social security is one scheme per studio** plus per-person rates; the UAE's Abu Dhabi
  fund, Saudi SANED splits and Jordan's age-based exemptions are not modelled separately,
  and nothing files the monthly contribution return.
- **The CSV bank file stays plain** (Name, IBAN, Bank, Amount) outside the UAE; Saudi
  Arabia's Mudad and bank-specific formats are not built.
- **A payslip is a table on screen.** There is no printable or emailable slip, and nobody is
  notified when a run is approved.
- **One currency.** Everybody is paid in the studio's own; there is no per-employee
  currency and no FX.
- **`Paid` is a state somebody sets by hand.** Nothing reconciles it against a bank
  statement, and nothing posts the payment itself — the run posts the accrual only, so
  `2200` is never cleared.
