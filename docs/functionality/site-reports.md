# Daily site reports — what one day on one site actually was

**Where:** `/<slug>/projects-list/<id>/reports`, behind `projects.reports`.
**The record:** `SiteReportSchema` (`src/modules/projects/siteReportSchema.ts`).
**The arithmetic:** `src/modules/projects/siteReportModel.ts`.
**The service:** `siteReports.ts`. **The route:**
`/api/studios/<slug>/projects/reports`.

## What it is for

A daily report is the site's own record of a day: who was there, what plant, the weather,
what got done, what stopped and for how long.

**It is the primary evidence in a delay claim**, and that is the only reason its shape
matters. A contractor arguing for an extension of time is arguing from a contemporaneous
diary. A report written a fortnight later from memory is worth nothing, and a diary with
holes in it is worth less than one that admits them.

## It is not a second timesheet

A **timesheet** is the payroll record: whose hours, at what rate, approved by whom.
A **report** records what a supervisor *observed* — twelve joiners on site, two excavators,
rain from two o'clock. Different facts about the same day, and both true.

**So neither is derived from the other, and both are shown.** Where they disagree the
disagreement is the finding — the same posture `threeWayMatch` takes with an order's running
total against its receipts. Picking one and hiding the other is how a site ends up unable to
explain its own numbers.

**Counted as distinct people, not hours.** A report says twelve joiners were on site; twelve
people booking four hours each is the same twelve people. Comparing headcount to hours would
manufacture a disagreement out of a half day.

**Null rather than nought** when no timesheet covers the day at all — "nobody has submitted
yet" and "nobody worked" are opposite facts and only the second is a finding.

## The rules

**One report per project per day.** A second is an *edit* of the first, not another document:
with two, "what happened on the fourth" has two answers and the diary stops being a diary.

**The day reported on is not the day it was typed.** A report written on Monday for Friday is
ordinary; dating it Monday would put the weather on the wrong day, which is the one thing this
record cannot get wrong — `supplierOnTime` and any delay analysis read that date.

**A submitted report does not edit.** That is the whole of its evidential value: a
contemporaneous record somebody can revise after the argument starts is not contemporaneous.
Submitting is its own act, never a status written through the edit path.

**No delete, at all** — hence `verbs: ["view", "create", "edit"]`. A diary somebody can remove
a day from is worth nothing in the argument it exists for.

**A delay with no description is dropped**, the same rule a back-charge carries: an
unexplained number against somebody's programme is one nobody can answer, and this one may
reach an adjudicator. Idle plant may not exceed the plant on site — it is a subset, not a
separate machine.

## Where the diary is missing

`diaryView` computes the **runs of missing days between reports** and reports them at the top
of the screen. A contemporaneous record with a fortnight absent from the middle stops being
contemporaneous, and the moment that matters is the moment somebody is relying on it — by
which time the days cannot be reconstructed. Showing gaps while they are still recent is the
only useful time to show them.

**Weekends are included in a gap**, deliberately: this model does not know a studio's working
week, and guessing one would invent gaps for a site that works Sundays and hide them for one
that does not.

**Weather hours are kept apart from every other cause**, because that is the figure an
extension of time turns on.

**The diary is only computed for a single project.** A gap across every project at once is
just the days nobody built anything, so the unscoped list returns `diary: null`.

## Who may do what

**`projects.reports`**, view/create/edit. Catalogue 174 → 177.

**Its own area, and the axis is the opposite of `projects.costs`.** That one was split out
because a site engineer opening the job has no business reading what it is allowed to cost.
This is the half a site engineer *does* need, and very likely the only Projects right they
should hold — nobody should have to be granted the project register to write down what
happened today. Gate A pins it from that side: somebody holding only `projects.reports` reads
the diary and writes one, with no `projects.list` at all.

**Creating and submitting are different rights** — `create` writes the day, `edit` closes it —
but that is a permission distinction rather than a two-person rule. Submitting a report is
closing your **own** statement of the day, not approving somebody else's: nothing here is a
signable and invariant 7 has nothing to say about it. On the archetypes **front-line**
(Foreman, Supervisor, Crew Chief) holds `edit` and does both, while **deliverer** (Project
Manager) holds `view` — a manager rewriting a supervisor's diary would be rewriting somebody
else's evidence.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No addendum.** A submitted report cannot be corrected at all — there is no counterpart to
  the goods-receipt correction, so a mistake stands. That is the largest gap and the natural
  next step.
- **Photographs upload but do not display.** They go to the shared private-media route, which
  verifies membership before it writes and again before it serves, and the report holds their
  urls — but the register lists filenames rather than thumbnails, so nobody can look at a
  photograph without opening it. The plumbing is real; the viewing is not.
- **Nothing prompts for a missing day.** Gaps are shown when somebody opens the screen; no
  notification says a site has not reported since Tuesday.
- **No weather source.** The weather is free text somebody types, not a recorded observation
  from anywhere, so it is evidence of what the supervisor said rather than of the weather.
- **Delays do not reach the programme.** Hours lost roll up on this screen and the planner
  does not read them, so a delay recorded here moves no date.
- **No approval and no client visibility.** A submitted report is closed and goes nowhere.
- **The labour check does not name the people.** It counts observed against booked and does
  not say which collaborators were on the timesheet, which is the first thing anybody
  investigating a difference will want.
