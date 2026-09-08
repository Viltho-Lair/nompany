# Resource planning — who is committed, across every plan

**Where:** `/<slug>/projects-planner/resources`, behind `projects.planner.view`.

## What it is

Every plan in the studio, read **by person instead of by task**. It answers one
question the product could not ask: *is this person on more than one job at once, and
when.*

**Everything it needs was already stored.** A planner task has carried `assigneeIds`
since the planner was built, each plan carries its `resources` with a `capacity` on
every one, and the schedule engine writes `start` and `end` onto every row. What did
not exist was anything that read **more than one plan**: the planner is per-project by
construction, so "is Sara on three jobs that week" meant opening three schedules and
holding them in your head.

So this is a join, not new data — the same shape as earned value, which joined the
budget, the plan and the actuals rather than storing a fourth thing.

## What it stores

**Nothing.** It reads the planner index once and then each plan document, and derives
the answer. There is no resource-allocation record and no second copy of who is on
what; the assignment lives on the task, where the planner puts it.

## What it does

**A day is the unit**, and that is a limit worth stating plainly. A task records how
long it lasts and who is on it; **nothing anywhere records what fraction of somebody's
day it wants**. So an assignment fills a day, and two assignments on one day is a
clash rather than "80% plus 40%". An arithmetic finer than that would look more precise
than the data underneath it.

**Two rows are not work**, and both would make the report lie:

- **A summary row's span is its children's.** Counting both puts every day in twice and
  reports a person at double their real load — the single easiest way to make this
  whole screen wrong.
- **A milestone is a moment.** Somebody named on one is not occupied by it.

**Capacity is a percent of a full-time equivalent**, so 100 buys one concurrent
assignment and 200 buys two. **An unknown capacity is null, never nought** — "nobody
set one" and "this person cannot work at all" are different facts — and it is read as
one for the clash test, which is the cautious way round: reporting no clash for
somebody nobody sized would hide exactly the person most likely to be over-committed.

**Work with no assignee is reported in its own right**, not dropped. It is the other
half of the question, and silently ignoring it would make a studio with nothing
assigned look perfectly resourced.

**A person on a task but in no resource list still appears**, under their id. Dropping
them would make a plan that assigns somebody undeclared look like a plan with nothing
assigned.

**It mints no permission key.** `projects.planner.view` opens it, because this is the
schedule read a different way round and exposes nothing somebody holding the planner
cannot already read by opening each plan in turn. A right that gates no new information
is not a boundary — it is a second lock on the same door, free to drift out of step
with the first.

**It costs more round trips than anything else in the product**, and that is inherent
rather than careless: a plan's tasks live inside its own document, so N plans is N
reads and there is no join to reach for. The reads run together rather than in series,
and the number of plans is capped at 60 — with `truncated` travelling in the answer so
the screen says the picture is partial. A load report that quietly omitted half a
studio's schedules would be worse than no report, because somebody would plan against
it.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No effort per assignment.** A task cannot say it needs half of somebody; every
  assignment is a whole day. Until that exists, "two jobs in one day" is the only
  clash this can detect and a genuinely half-time pairing is reported as a clash.
- **No levelling, and no suggestion.** It reports a clash and stops — nothing moves a
  task, proposes a date, or tells you who is free instead.
- **It reads plans, not people.** Somebody with no planner task is not on this screen at
  all, however busy they are: timesheets, shifts, leave and site reports are all
  invisible to it, so "free" here means "free of planned tasks", not free.
- **Leave and holidays are not deducted.** A person on approved leave still reads as
  available; HR's vacations and the planner's calendar are not joined.
- **No history.** It answers about the plans as they are now; there is no record of what
  the load looked like last month, so a clash that was resolved leaves no trace.
- **It is not on any dashboard.** Nothing surfaces a clash except opening this screen,
  so somebody has to go and look.
- **`start` and `end` are read off the stored task.** The planner derives them in the
  browser and writes them back on save, so a plan edited and never saved reports its
  last saved dates — the engine is not re-run server-side here.
