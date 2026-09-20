# A plan's change history

What has been changed in a project plan, when, and by whom — read from a **History**
button in the planner's top bar.

## Why it exists

`savePlan` writes the plan document WHOLE and kept nothing of what it replaced. The
planner's undo lives in the browser (60 steps, `plannerStore`) and dies with the page, so
a plan reorganised overnight left no trace of having been: no version, no author, no
"what did this row say last week".

## Where it lives

| Where | What it does |
|---|---|
| `src/modules/operations/planChanges.ts` | `planChanges`, `mergeChanges`, `appendHistory` — pure, no store, no clock |
| `src/modules/operations/planner.ts` | `savePlan` records; `planHistory` reads and resolves the author's name |
| `src/platform/db/keys.ts` | `PLAN.history(studioId, planId)` |
| `.../operations/planner/[planId]/history/route.ts` | GET, through the planner app's door |
| `.../projects/[projectId]/plans/[planId]/history/route.ts` | GET, through the project's door |
| `src/components/studio2/PlanHistory.jsx` | The panel, its own lazy chunk |

## One entry per editing session, never one per autosave

**The planner autosaves every 600ms** (`StudioPlanner`, debounced). Recorded one for one,
a row typed letter by letter would be a dozen entries and the history would be unreadable
within a minute.

So consecutive saves **by the same person inside ten minutes** are folded into one entry,
and folding keeps the FIRST value seen and the LAST: "Foundations → Substructure", not the
eleven keystrokes between. The rules, each because the alternative reads wrongly:

- a field changed and then changed back leaves **nothing**
- a task added and then edited stays **added** — its edits are part of adding it
- a task added and then removed leaves **nothing**; it never existed for anybody else
- a task edited and then removed reads as **removed**; its edits are moot
- a session that undid itself leaves **no entry at all**

**A different person is never folded into my session**, whatever the interval.

## What is compared, and what is not

The diff runs **on the server**, between the document being saved and the one already
stored — never from anything the browser claims it changed.

**Tasks are matched by id, never by position.** A row dragged up the list moved; it was not
deleted and re-added, and a history saying otherwise would be worse than none.

Thirteen fields are named (`TRACKED`): name, start, duration and its unit, progress,
status, priority, milestone, parent, assignees, dependencies, effort, notes. Plus the
plan's own name and status. **A dependency reads as what it links to** (`t3 FS +2`), not
as its stored object.

**A view change is not a change to the plan.** The planner PUTs the whole document when
somebody zooms or toggles a column; none of that is recorded, and a save that changed
nothing tracked adds no entry.

## What is stored

One capped list per plan under its own key: 200 entries, 200 changes per entry
(`changeCount` still reports the true number, and the panel says "and N more"). Its own
key rather than a field on the plan, because the plan is rewritten whole on every autosave
— history inside it would be rewritten hundreds of times an hour and lost to any save that
raced.

Each entry holds the author's **CollaboratorID** (invariant 6), resolved to a name on read.
Somebody since removed from the studio still did the work, so an unresolved id reads as an
entry with no name rather than vanishing.

**Writing the history is best-effort and last**: a plan that saved must not fail because
the note about it could not be written.

## Rights

The history answers to the same right that opens the plan, at both doors
(`projects.planner.view` through the planner app, the project's own grant through a
project). Who changed a task is part of the plan, not a separate power — and a right
nothing else grants is one nobody thinks to give (invariant 16).

## Not built yet

- **No restore.** The history says what changed; it cannot put a plan back. Restoring
  would need the documents themselves kept, not their differences.
- **The record starts now.** Plans that already exist have no history until their next
  save, and nothing backfills one — there is nothing to compute it from.
- **No filtering or search** by person, date or task, and no paging: the panel shows the
  200 entries the key holds.
- **A ten-minute window is fixed** (`COALESCE_MS`), not a studio setting.
- **Nothing is notified.** A change to a plan somebody else owns reaches them only when
  they open the panel.
- **Templates keep no history.** A WBS template is edited by the same planner and saves
  through `saveTemplate`, which records nothing.
- **A bulk change reads as many lines**, one per task and field: importing a template
  into a plan lists every task it added.
