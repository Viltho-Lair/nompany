# Planning & calendar (Marketing)

Built 2026-09-22, the fifth part of the owner's Marketing plan. The register sorts campaigns by
status and date, which answers "what is on" — and never "what is on **at once**". A studio with
four email campaigns overlapping in one week sees four reasonable rows; the collision exists only
in the inbox of whoever receives all four.

Section `marketing-planning`. It **owns no collection**: every bar is a campaign, read where the
register keeps it. Code: `src/modules/marketing/calendar.ts` (the arithmetic, pure, shared with
the screen, `tests/marketing-calendar-model.mjs`), `modules/marketing/planning.ts` (the read),
`components/studio2/StudioMarketingCalendar.js`, `shared/studio/marketingCalendar.ts`.

## What it shows

**Whole weeks, always starting on a Monday**, so a bar never begins between two labels. Twelve
weeks by default, from a week *before* today — a calendar that opened on the current Monday would
hide the campaign that started last Thursday and is still running, which is the thing somebody
opens it to see. Four weeks to six months, and it steps four weeks at a time.

**A bar per campaign**, coloured by status rather than channel (a campaign may have several
channels, and what a person scans for is whether a thing is live). A campaign that began before
the window is **cut**, not dropped; one that runs past the end is cut at the end; one with a start
and no end runs to the edge and is marked **no end date** rather than given an invented one. A
one-day campaign still draws a visible bar.

**Cancelled campaigns are not on it.** They are not running, and the register holds the record.

**Campaigns with no start date are named underneath**, not silently omitted: a studio with nine
undated campaigns has a planning problem, and a calendar that hid them would hide exactly that.

**Above the chart, what needs a person this week:** what starts, what ends, and **more than one at
once** — a channel carrying two or more campaigns in the same week. That last is a *warning, not
an error*: two at once is sometimes the plan, and a calendar that refused it would be wrong more
often than right. It is there because nowhere else shows it.

**Each week's column says how many campaigns are running in it**, so the load is legible without
reading every bar.

## It changes nothing

There is no POST, no PUT and no DELETE. A campaign's dates are edited in the register, one click
from every bar. A draggable calendar would be a second writer of the same field, free to disagree
with the first — the same rule that keeps spend in Finance and consent append-only.

## Who may do what

`marketing.planning.view`, **view alone**, on the pipeline's argument: moving a campaign in time
is editing that campaign and answers to `marketing.campaigns.edit`. What this right decides is who
may see the whole schedule at once. The winner-of-work shape holds it, and **whoever may view the
campaigns catches up to it** — the calendar shows them and nothing else.

## The plan for a period

A second tab on the same screen, and the first thing this section STORES
(`marketingPlans`). A plan is a name, a period, what the period is for, an
envelope and two targets: it is the unit above the campaign, which until now was
the largest thing Marketing had.

**The period is whole, and it is resolved on the server.** Choose Month, Quarter,
Half year or Year and give any day inside it; the plan is stored with concrete
dates covering the whole of it, so two plans called Q1 cannot disagree about when
Q1 starts. **Custom** takes the two dates as typed, for the season that is not a
calendar period.

**A campaign NAMES its plan; nothing is inferred from dates.** A campaign running
from the 20th of March to the 10th of April falls inside two quarters, so a plan
that claimed every campaign in its window would count that budget twice and
neither quarter's total would be the truth. The link is set on the CAMPAIGN
(`marketing.campaigns.edit`) — in the register's form, or with one click from the
plan — because filing work under a period is a decision about the work.

**What the explicit link costs is paid back in the open.** Every plan lists the
live campaigns running inside its dates that belong to NO plan, by name, with a
button to file each one. A plan reading "60,000 handed out" beside four campaigns
nobody filed is a figure that is true and misleading at once. Cancelled campaigns
are left out — they are not running, and nagging about filing them would be work
for nothing.

**The four figures, and what each one is.** *Budget* is the envelope. *Handed to
campaigns* is what its campaigns are allowed between them, with a sub-campaign
counted INSIDE its parent and never twice. *Not yet allocated* is the difference.
*Spent* is Finance's own figure — the bills and expenses naming those campaigns,
read through Budget & spend's own reader rather than a second copy of the currency
handling — and *Remaining* is the budget less that. **No budget is its own
sentence**, never a row of noughts: a plan nobody has budgeted and a plan budgeted
at nothing are different answers, so every figure derived from one is null.

**Deleting is refused while a campaign names it.** The link is validated when it
is written, so a plan removed out from under its campaigns would leave them
pointing at nothing, and no reader could tell that from a typo. Unfiling the
campaigns is a decision somebody makes on purpose.

**Rights.** `marketing.planning` gained create/edit/delete when the section
stopped owning nothing; the calendar half is still view alone. Whoever may
create, edit or delete a CAMPAIGN catches up to the same verb here, verb for
verb — the plan is the envelope above the work they already run — and a role that
may only read campaigns gains nothing. The plan's owner is told by notification.

## Not built yet

- **On the plan:** no ladder and no approval — a plan is written, not signed off, and its period
  either has passed or has not. No rollover of what a period did not spend, no comparison of one
  period with the last, and no plan for a channel or a market inside a period. Its two targets
  (leads, revenue) are STORED and nothing measures against them yet; the campaigns' own results
  are on the register and the dashboard.
- **Plans do not appear on the calendar.** A quarter is not drawn as a band behind the weeks it
  covers, which is the obvious next thing and was left out deliberately: the bars are campaigns,
  and a second kind of bar needs its own answer about what a plan looks like when it overlaps
  another.
- Nothing but campaigns is on it. Forms with closing dates, events and content deadlines are all
  invisible here.
- No month or quarter view, and no printing or export.
- The crowding warning counts campaigns, not sends: two campaigns that never message the same
  person on the same day still read as crowded, because nompany does not know who was messaged.
- Nobody is told about a collision; it has to be looked at.
- A campaign's dates cannot be changed from the calendar, by design (above).
