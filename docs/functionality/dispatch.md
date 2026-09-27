# Dispatch board

One day, every crew, and the jobs nobody is on. A tab on the Schedule
(`/<slug>/field-service-schedule`), and a read of jobs the schedule already stores.

## What it is

**The schedule already draws the jobs**, so this is not a second copy of it. A schedule
answers "when is this job"; a dispatch board answers three questions about the PEOPLE, and
none of them can be read off a calendar without counting by hand.

- **The unassigned pen.** A job with an empty `assignedToCollaboratorIds` is scheduled and
  staffed by nobody. On a calendar it looks identical to a job with a full crew, so the one
  thing a dispatcher must not miss is the one thing the existing screen cannot show them.
- **Clashes.** `assignedToCollaboratorIds` is an array, and nothing has ever checked
  whether the same person appears on two jobs at the same time.
- **Load.** Hours booked per person, so "who can take this" has an answer.

**No permission key, no collection, no write.** It reads `jobs` through `listJobs`, which
asks `fieldService.schedule.view`. Staffing a job is editing the job, and the only door for
that is `PUT /operations/jobs` (`updateJob`) — a second write path out of a board would be two
ways to staff a job, free to disagree about what staffing one means. **No screen calls that
door yet**: nothing opens a job once it is created, so a job's people and times are the ones it
was raised with (see "Not built yet").

### The rules, and why each is that way

**A clash is shown, never refused.** A dispatcher deliberately overlaps a five-minute
handover, so this is something to see rather than a validation to add at the write.

**A job with no end clashes with nothing.** Its duration is unknown, and treating an
unknown as "the rest of the day" would report a clash nobody can act on and nobody can
clear — every open-ended job would clash with everything after it, and the panel would be
noise within a week.

**Touching ends do not clash.** A nine-o'clock job following an eight-to-nine one is a full
morning, not a double booking.

**An overnight job is on both days.** The crew is unavailable on both, and asking only
about `scheduledStart` would show a dispatcher an empty morning that is already spoken for.

**A cancelled job is not on the board at all.** It books nobody and clashes with nothing;
leaving it in would inflate every load figure and manufacture clashes against work that is
not happening.

**Somebody with nothing on is still a lane.** They are the answer to "who can take this",
so a board that listed only busy people would hide the row a dispatcher is looking for.
Lanes sort busiest first, which puts the rows with room at the bottom where they are found
by scrolling to the end rather than hunted for in the middle.

**`freeFor` answers with people, not a boolean**, because "is anyone free" is not the
question a dispatcher asks — "who" is.

### Left behind

**A dispatcher's worst case is not today's gap.** It is the job scheduled for last Tuesday
that nobody was ever put on and nobody has looked at since, which is invisible on every day
view — including this one — because the day it sits on is one nobody opens any more.
`strandedJobs` lists them above the board: still `scheduled`, still unstaffed, and already
in the past. A COMPLETED job is never stranded even with nobody named on it: the work
happened, and chasing it would be chasing a record rather than a job.

### The day

**`day` comes from the caller and today is the STUDIO's**, read once in the route from the
time zone set in Studio settings (`shared/timezone`; no zone set reads UTC). A board whose
default day was the viewer's clock would disagree with the records across a timezone, and one
whose default was the server's UTC date opened a studio east of Greenwich onto yesterday every
morning. The screen adopts the day that comes back on its first load, so the picker and the
board can never be a day apart. `dispatchBoard` takes the day and the zone as arguments, which
is what makes every state assertable without a clock.

**Which day a job is on** (`dayOf`): a time with no zone — what the New job form writes,
"2026-09-27T23:30" — IS the studio's wall clock, so its day is its own date; a time carrying a
zone is an instant, placed on the day the studio's clock showed then. Parsing the zoneless
form on the server's clock is how a late job moved to the next day's board.

## One job system (tier 5, 11/09/2026)

**A job can be raised from the dispatch board.** *New job* opens a form — title, kind, who is on
it, project, location, the day and its start and end times, and the maintenance contract and
installed unit it is about when those registers exist and the reader may open them. No screen
could create a job before: `POST /operations/jobs` existed and was reachable only by hand. The
day is the shared date picker and the times are two clock fields — the rota's shift form's
shape, not the browser's datetime-local — and an end earlier than the start runs past midnight
into the next day, the rota's own rule for an overnight shift.

**What a job names must exist** (`createJob`/`updateJob`): the people on it, its project, its
contract and its installed unit are checked against their registers, and its times must parse
and not end before they start. Each was stored as typed, so a stale picker filed a job against a
deleted project, or staffed it with somebody who had left and so never saw it on any round. The
refusals (`person`, `project`, `contract`, `unit`, `time`, `range`) are worded on the screen.

**A move is judged against the row being written** (`setJobStatus`, invariant 8): the legal-move
check runs again inside the function patch, so a technician tapping Finish while the office
cancels cannot bring a cancelled job back as completed. The same holds for editing a closed job
and for signing one that was cancelled meanwhile.

**My round draws Start, Finish and Take signature only for `fieldService.schedule.edit`** — the
right both writes ask (`fieldView` returns `canEdit`). A viewer sees the round with no buttons.

**A job no longer needs a deal id to be created.** Which deal it executes is decided by the one
insert every door uses (`insertJob`, `modules/operations/jobs.ts`): the deal it was given
(through the alias table), else its **project's** deal, else **a field-service deal of its own**
— Template D, headed by the job, the blueprint's "a warranty call is a job with no sale". A job
still never exists on no deal (Law 7); it is simply never refused for want of one.

**PM plans raise jobs.** The daily run (`modules/operations/planJobs.ts`, called by
`cron/daily-notices` for every studio — no new cron schedule) raises a **scheduled visit** for
every *Active* plan whose *Next due* has arrived, carrying the plan's contract and installed unit
(the PM plan type gained both references, v2), then moves *Next due* on by the frequency
(`nextOccurrence`, calendar months clamped to the month's end). **Idempotent by occurrence**: a
job names its plan and the occurrence date (`planId` + `planOccurrence`), so a second run, or a
crash between raising and moving the date, raises nothing twice. **One occurrence per plan per
run**, so a plan three quarters behind catches up a visit a day rather than three at once. A
plan's first job opens a field-service deal and later ones join it, derived from its earlier
jobs rather than stored on the plan. The run acts with the studio's authority, as an engine rule
does.

**PM plans and maintenance contracts are Maintenance's since 11/09/2026** (`maintenance.md`): an
SLA is a preventive maintenance contract, and its visits are work orders there. **New studios
no longer get** the `planned` and `contract` registers, so this run raises nothing for them. An
existing studio's plans keep raising jobs here until `fold-maintenance-registers.mjs` copies them
into Maintenance and sets them Retired — which is what stops this run for them. Field Service
keeps the crews: Schedule, Tracking, and the installed base.

**Service orders are folded in.** The engine's `job` type ("Service orders") was a second job
system that dispatch never read. **New studios no longer get it**; an existing studio keeps its
type and every record, readable and unchanged. `scripts/migrate/service-orders-to-jobs.mjs`
copies them into `jobs` — dry-run by default, `--apply` to write, `--allow-live` for the live
store — one job each, its state mapped across and every field a job has no column for
(customer, priority, fault, work done, the order's reference) kept in its notes, each heading its
own field-service deal. It is **idempotent** (`migratedFromRecordId`) and **deletes nothing**:
removing the service orders afterwards is a separate step under invariant 17.
`tests/field-jobs-model.mjs` holds the date arithmetic and the mapping.

## Not built yet

- **No way to change a job on screen.** No screen opens a job once it is created, so its
  people, times, title and links stay what it was raised with; `PUT /operations/jobs` exists
  and nothing calls it. Nor can a job be cancelled from a screen. The board shows the gap and
  does not fill it — a job-edit dialog (and then drag and drop) is the next slice, and it is
  what would make this the screen a dispatcher lives in rather than one they check.
- **No drag and drop.**
- **No travel time, no geography.** `location` is a string printed beside a job. Nothing
  knows whether two jobs on one lane are forty kilometres apart, so a lane with room may
  have none in practice.
- **No skills or certifications.** Anybody can be put on anything; `freeFor` answers on
  time alone.
- **No leave or shift awareness.** A person on holiday shows an empty lane and reads as
  available — the rota knows, and this does not ask it.
- **One day at a time.** No week view, and no way to see two days at once when moving a
  job to tomorrow.
