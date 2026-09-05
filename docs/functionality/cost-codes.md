# Cost codes — what a project is allowed to cost, and what it has

**Where:** `/<slug>/projects-list/<id>/costs`, behind `projects.costs.view`.
**The arithmetic:** `src/modules/projects/costing.ts`, pure and shared with the screen.
**The service:** `src/modules/projects/costs.ts`. **The route:**
`/api/studios/<slug>/projects/costs`.

## What it is

**A project has always had exactly one number: `value`, what the studio will be paid.** Nothing
said what any of it was allowed to *cost*, so "are we over on this trade" was a question the
product could not be asked.

The handover made that sharper rather than better. It carries a tender's bill total into a
project as the value, and the bill's own groups — preliminaries, plant, distribution — are
precisely the breakdown there was nowhere to record.

A **cost code** is one line of that breakdown: a reference, a description, and a budget. A bill
names the code its spend belongs to, and the report is what the two come to.

## What it stores

One new collection, `projectCosts`, owned by `projects-list` — it lives with the project it
belongs to, reached from one and from nowhere else, the way a bill is reached from its tender.
One new field on a bill, `costCodeId`.

**One new permission area, `projects.costs`** (view / create / edit / delete). Catalogue 145 →
149. That is the test `tendering.rates` passed rather than the one the bill of quantities
failed: a project's budget is *not* the project's content the way a bill is a tender's. **"May
run this job" and "may see what it is allowed to cost" are genuinely different powers** — a site
engineer opens the project and has no business reading what amounts to the margin. Gate A pins
it: somebody who may view and edit every project in the studio is refused the breakdown, and the
refusal names `projects.costs.view`.

`projects-list` maps to both areas, so somebody holding only the costs right can still reach the
screen it hangs off.

**Coded per bill and per purchase order, not per line**, deliberately and with a cost: a
supplier invoice spanning two trades has to be split into two bills. Per-line coding is the more
correct model and is where this goes — the roll-up would prefer a line's code and fall back to
the document's, so it is an addition rather than a change. What per-document buys is that a
studio can start coding today with one picker instead of one per row.

## What it does

**A cost is incurred when the supplier invoices, not when Finance signs.** Approval authorises
*payment*; a report that waited for it would say a project was under budget for exactly as long
as its paperwork was behind. So `Received`, `Approved`, `Paid` and `Disputed` all count.
**`Draft` and `Cancelled` do not** — neither is money anybody owes.

**Money nobody filed properly is still the project's money.** This is what the whole roll-up
turns on, and it happens two ways:

- a bill on the project naming **no code** — nobody has filed it yet;
- a bill coded to a code somebody has since **deleted**.

Both land in `uncoded`, which is counted in the project's actual and shown on the screen in its
own right. Dropping either would make a job look cheaper than it is, and the second is the
subtler: a total that quietly fell when somebody tidied a list would be a report that punishes
housekeeping.

**Deleting a code deletes nothing that was spent on it.** No cascade: the bills keep their
`costCodeId` and their money returns to `uncoded`, where it stays visible. Clearing the code off
every bill instead would rewrite history to tidy a list.

**`used` is null on a code with no budget, never zero.** Nought spent against nought allowed is
not "0% used" — it is a code nobody has budgeted, and an empty progress bar says the opposite of
that. Such a code is **over** the moment anything is spent on it: the money went somewhere
nobody allowed for.

**`remaining` goes negative rather than clamping**, and `unallocated` — the project's value less
what has been budgeted — goes negative too. More allowed for than the job is worth is a decision
somebody should be looking at, not an error to hide.

### Starting from the bill

**The bill's groups are already a breakdown**, priced by whoever worked out what the job was
worth. Making a studio retype them would be asking for the same list twice, so a handed-over
project is offered them, in the **document's own order** — sorted by `sortOrder` before
grouping, because `boqGroups` takes groups in the order it first meets them and an unsorted read
proposes a budget nobody can check against the document it came from. Gate A caught exactly that.

**Proposed, never imposed, and an action rather than a seed at handover.** The groups are how
the work was *sold*, and a studio budgets by how it expects to *buy*, which is frequently a
different cut of the same job. Writing them automatically would put a breakdown somebody never
chose on every handed-over project and make the first act on the screen a deletion. The screen
says, on the control itself, that the figures are prices and not costs.

**Refused once anything exists.** It proposes a starting point; it is not a merge, and running
it twice on a breakdown somebody has since edited would either duplicate every code or quietly
overwrite their numbers.

### Committed, and the forecast

**Committed is what has been ordered and not yet invoiced** — money the studio has promised a
supplier and has not been asked for. It is the half a spend report cannot see, and until purchase
orders carried a cost code there was no honest way to forecast at all.

**An order stops being a commitment when it is INVOICED, not when it is delivered.** So a
`Received` order whose invoice has not arrived is still committed, and what is left of every
placed order is **netted against what has been billed on it** — counting a fully invoiced order
as still committed would double every cost the moment its goods turned up. `Draft` and
`Cancelled` commit nothing: one was never placed with anybody, the other was withdrawn.

**Over-invoicing an order commits nothing further**, floored at zero. The excess is already in
`actual`, where it belongs; a negative commitment would be a credit nobody has.

**A bill answering an order inherits the order's code** when it carries none of its own. Somebody
codes the purchase order once and every invoice against it follows — both what a person expects,
and what keeps `uncoded` down to what genuinely has not been filed. A bill with a code of its own
keeps it: the invoice is the later and more specific decision.

**An uncoded ORDER is kept apart from an uncoded BILL** (`uncommitted` beside `uncoded`), because
the two are fixed in different places: one is a bill Finance has not filed, the other a purchase
order Procurement has not.

**Forecast is `actual + committed`, or the budget, whichever is larger**, and the asymmetry is
the point. A code that has spent and committed less than its allowance is still expected to spend
it — the work is not done, and reporting the money not yet promised as a saving would show every
project under budget on the day it opened. A code already past its allowance will not come back
down, so there the two sums are the forecast. **It is not a judgement**: nobody has been asked for
an estimate-to-complete, this is what the ledger implies, and a studio that knows better revises
the budget. The screen says the rule, because a forecast equal to the budget on a code nobody has
spent anything on reads as a bug until you know why.

**The project's forecast is the sum of its codes', not a maximum over the totals.** Taking the
maximum at the top would let a code running under its allowance cancel one running over, and the
whole point of a breakdown is that those two do not cancel.

**`over` and `willOverrun` are two different flags**, because they are acted on differently: one
is a number to explain, the other an order somebody could still stop.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No earned value.** EV/PV/AC/SPI/CPI need a schedule and a budget joined together; the budget
  half exists now and the planner holds the other, and nothing joins them. AC is the `actual`
  here, so this is the closest remaining piece.
- **No estimate-to-complete.** Nobody can say "this code will finish at X" — the forecast is
  derived, and the only way to change it is to change the budget.
- **A subcontract is not a commitment.** Only purchase orders are; subcontracts, framework
  agreements and anything else the studio has promised are invisible to the forecast.
- **No coding on anything but a bill.** Expenses, timesheets, stock issues and subcontractor
  certificates all cost a project money and none of them names a code.
- **No studio-wide chart of cost codes.** Every project's breakdown is its own list, so two
  projects cannot be compared by trade and a studio cannot impose a standard set. The rate
  library is the pattern when that is wanted.
- **The budget is not revised.** There is one budget per code and no record of what it was
  before somebody changed it, so "we moved 20,000 from plant to distribution in March" is not
  answerable.
- **Nothing warns.** A code going over tells nobody; the breakdown has to be looked at.
- **No currency of its own.** Budgets are in the studio's currency and a bill in another is
  summed at its stored total, which is the same gap the AP aging report has.
