# Leave — requests, approval and balances (tier 6, 11/09/2026)

**HR → Employees → Leave**, and **Studio settings → Employment rules**. Leave was a request
and an approval and nothing else: no entitlement, no carry-over, and nothing subtracted a day
taken from anything, so nobody could be told how much leave they had left.

## Requests and approval (unchanged)

`vacations` (`modules/hr/hr.ts`). Anyone who can open HR asks for their own leave; a manager
(`hr.vacations.approve`) may file it for somebody else, which is approved on the spot.
Pending → Approved, Declined, or Cancelled by the requester; overlapping leave for one
person is refused. The requester is told the outcome. Approved **Unpaid** leave docks pay
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

## Not built yet

- **A balance does not block a request.** Overdrawing is shown, not refused.
- **No public holiday calendar**; no half-day requests; no accrual month by month (the year's
  allowance is available on 1 January).
- **No leave year other than the calendar year**, and no expiry date on carried leave.
- **No country presets yet** — tier 6 slice C fills the rules from the studio's country.
- Sick leave's statutory pay tiers (full, then partial, then unpaid) are not modelled.
