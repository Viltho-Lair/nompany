# Leave — requests, approval and balances (tier 6, 11/09/2026)

**HR → Employees → Leave**, and **Studio settings → Employment rules**. Leave was a request
and an approval and nothing else: no entitlement, no carry-over, and nothing subtracted a day
taken from anything, so nobody could be told how much leave they had left.

## Requests and approval

`vacations` (`modules/hr/hr.ts`). Anyone who can open HR asks for their own leave; a manager
(whoever may manage HR) may file it for somebody else, which is approved on the spot.
**Asking is an approval (19/09/2026):** a request files a **Leave request** on the Approvals
page, and the yes or no is given there — Pending → Approved or Declined, in the approver's
name. The people who answer are Approvals settings'; until a studio saves the type, whoever held
the old `hr.vacations.approve` (now gone) plus the owner and Admins. The requester may cancel
their own while it waits, and a late yes then changes nothing. Overlapping leave for one
person is refused. The requester is told the outcome by the Approvals page. A request pending
from before is given its approval the first time Leave is read. Approved **Unpaid** leave docks pay
(`payroll.md`).

## The rules

`employmentRules` on the studio record, edited in Studio settings
(`administration.settings.edit`), pure model in `modules/hr/leaveBalance.ts`:

- **Per leave type**: days a year, an optional longer-service figure (*after N years, M
  days*), and a carry-over cap. **A type with no days keeps no balance** — unpaid leave is a
  type most studios never want counted down.
- **Working days or calendar days**: when on, a request counts only the days the studio's
  working hours mark open; with no hours set it still counts calendar days rather than none.
  **Public holidays are not known to the product and count.** A request falling only on
  closed days is refused (`no-working-days`).
- Refused on save with the type and field named: a rule for a type the studio does not
  admit, "after N years" with no new figure or the reverse, anything that is not a number.

## A person's allowance

`leaveAllowances` on the collaborator row, edited in the employee editor
(`hr.employees.edit`). A number replaces the rule's days for that person — a contract that
gives more than the law. Blank uses the rule. Only ruled types are kept.

## The balance

`leaveBalances`, served on the HR read for every person the reader may see (the same scope as
the leave list), for the current year:

- **Allowance**: the rule's days, or the longer-service figure from the first year that
  STARTS with the service completed (somebody reaching five years in June gets it next
  January — the conservative reading). **The joining year is pro-rated** by the months left,
  counting the month joined, in half days.
- **Carried over**: worked forward from the year of joining (at most ten years back): each
  year's unused leave, capped, never negative — an overdrawn year is not a debt.
- **Taken** is approved leave; **pending** is shown apart. A request inside the year counts
  the days stored on it (what the person was shown); one across New Year is split and each
  half recounted.
- The request form shows what the request would leave, in amber when it overdraws.

## An allowance stops when the employment does

**Both ends of an employment pro-rate the year**, by the months it covered and counting the
month at each end. The joining year always did; the LEAVING year did not, because until the
lifecycle shipped there was no leaving date to read — so somebody who left in March accrued a
full year's allowance, and another every January afterwards, for ever, on somebody who had
gone. That fed straight into the final settlement's encashment.

**The exit date only**, never the notice period: notice is a plan, and it no more stops an
accrual than it stops a payslip.

**Leave cannot run past somebody's last day**, and a leaver with no recorded last day cannot
be booked leave at all — the refusal says which, because "they left" and "they left on the
15th" send the person asking to two different places. Somebody who has been hired and has not
started yet CAN book ahead: that is an ordinary thing to do, and it is a narrower test than
payroll's on purpose.

## Not built yet

- **A balance does not block a request.** Overdrawing is shown, not refused.
- **No public holiday calendar**; no half-day requests; no accrual month by month (the year's
  allowance is available on 1 January).
- **No leave year other than the calendar year**, and no expiry date on carried leave.
- Country presets (Jordan, Saudi Arabia, the UAE) fill the annual-leave rule and the
  working-day counting from the studio's country — `payroll.md`; other countries enter theirs.
- Sick leave's statutory pay tiers (full, then partial, then unpaid) are not modelled.
