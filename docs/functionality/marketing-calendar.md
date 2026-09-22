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

## Not built yet

- **Plans and briefs**, the other half of the plan's "Planning & Calendar": a plan per period with
  its own objectives and budget, and a brief per campaign (audience, message, assets). Only the
  calendar half is built.
- Nothing but campaigns is on it. Forms with closing dates, events and content deadlines are all
  invisible here.
- No month or quarter view, and no printing or export.
- The crowding warning counts campaigns, not sends: two campaigns that never message the same
  person on the same day still read as crowded, because nompany does not know who was messaged.
- Nobody is told about a collision; it has to be looked at.
- A campaign's dates cannot be changed from the calendar, by design (above).
