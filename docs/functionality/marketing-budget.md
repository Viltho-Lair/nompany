# Budget & spend (Marketing)

Built 2026-09-21, the third part of the owner's Marketing plan to ship. A campaign has carried a
**budget** and three targets since Marketing shipped (2026-09-19) and **nothing was ever measured
against them**: the register said what a studio meant to spend and could not show a penny of what
it did. This puts Finance's own records beside the plan, and then says what the money bought.

Section `marketing-budget`, under Marketing. It owns **no collection** — the costs are bills and
expenses, read where Finance files them. Code: `src/modules/marketing/spend.ts` (the arithmetic,
pure, shared with the screen, `tests/marketing-spend-model.mjs`), `modules/marketing/budget.ts`
(what counts as spend, and the conversion), `components/studio2/StudioMarketingBudget.js` (the
screen), `shared/studio/marketingBudget.ts` (the words, English and Arabic).

## Nothing is spent from Marketing

A cost is **a bill or an expense**, raised in Finance, which now carries the campaign it belongs
to — the exact mirror of the cost code a bill already carries and the milestone an invoice does.
Marketing reads them. A second way to record money out of a Marketing screen would be two ledgers
for one company, free to disagree about what a campaign cost; the same argument keeps releasing
retention in Finance rather than on a project screen.

**Where the field is:** Finance → Payables & Expenses, on the bill form beside the cost code, and
on the expense form beside the project. Both offer the studio's **open** campaigns (a completed or
cancelled campaign is not something to file a new cost against) and both are absent in a studio
that runs no campaigns. Re-filing a cost against another campaign does **not** re-open its
approval: which campaign a cost belongs to is a filing decision, not a change to what is owed.

## What counts as spend

- **A bill naming a campaign**, unless it is a Draft (raised against nobody) or Cancelled
  (withdrawn). **An unapproved bill counts**: approval authorises payment, and a report that
  waited for it would call a campaign under budget for exactly as long as its paperwork was behind.
- **An expense naming a campaign.** An expense has no states — it is money that has already gone.

Both are read only when **Payables & Expenses** is switched on, and the screen says when it is not:
"no spend" and "nothing was read" are different sentences. A bill in another currency converts at
**the rate it was booked at**, and at today's table when it carries none; one that neither can
convert is left out and counted, and the screen says how many.

## The figures

**A sub-campaign spends its parent's money.** A parent's `spent` carries its children's, the same
rule the budget already follows, and a child keeps its own figure so both can be read. Nothing is
counted twice in the studio's total.

**A cancelled campaign's spend still counts.** Money spent before somebody called it off has still
left the company. Its *budget* drops out (nothing more will be spent against it), which is what
`budgetTotal` already did.

**Null rather than zero.** A campaign with no budget has no share used and no warning — a budget of
nought is not "fully spent". A campaign that has spent nothing has no cost per lead, and one that
has brought no leads has none either: 0.00 and "we cannot say yet" look identical on a screen and
mean opposite things.

**Costs that name a campaign the studio has since deleted** are counted in the total and named as
such, never dropped — a report that quietly lost money the moment somebody tidied the register
would punish housekeeping. Same rule, same reason, as a project's `unattributed` invoices.

**Warnings:** a campaign is **over** past its budget, and **nearly spent** from 80% of it. A
warning at 100% is a post-mortem; the point of a threshold is to leave room to decide something.
The list puts the over ones first, then the nearly, then the biggest spenders — a report sorted by
entry date buries the campaign that is 40% over on page two.

**What the spend bought** joins Finance's side to Sales': cost per lead, cost per won deal, return
on spend (won value for each unit spent) and net. Leads and won value are the ones the campaign
register already counts, from the Sales tickets naming the campaign (`docs/functionality/leads.md`).

## Who may do what

`marketing.budget.view`, and **view is the only verb**. Setting a budget is editing the campaign
(`marketing.campaigns.edit`); filing a cost against one is editing that bill
(`finance.payables.edit`). An edit verb here would be a second right over two other rights' acts,
free to disagree with both. What this right decides is who may see what the company spends on its
marketing — the split `tendering.rates` and `projects.costs` already draw.

The **winner-of-work** shape (Marketing Manager and every other marketing title in the role
library) holds it. **Existing roles catch up:** whoever may view the campaigns gains it
(`catchUps.ts`), because the budget is already on the campaign card and this is the same figure
with Finance's side beside it.

**Rollout:** the section plants itself in every studio on the next read; the right catches up on
the next role read. No script, and no migration — a bill filed before today simply names no
campaign, which reads as exactly what it is.

## Not built yet

- **Committed spend.** A purchase order cannot name a campaign, so what has been *ordered* and not
  yet invoiced is invisible here — the half that turns a spend report into a cost report on a
  project (`cost-codes.md`). Orders, their netting against bills and a forecast are the next slice.
- Spend over time: there is no month-by-month curve, so "are we spending faster than planned" has
  no answer yet. A campaign's dates and its budget are both known, so a straight-line plan is
  available the moment somebody wants it.
- Variance **alerts**: the screen shows over and nearly-spent; nobody is notified.
- A campaign's own page — the figures are a row in a table, not a place to stand.
- Spend is not on the Marketing dashboard, which still says its figures are a plan.
- No budget period: a campaign's budget is one number for its whole life, not per month or quarter.
- Ad-platform spend is not imported from anywhere (the owner, 2026-09-19: no delivery and no
  reselling of credits), so what a studio spends on ads reaches this screen only as a supplier bill.
- Sub-campaigns are one level deep, as the register is.
