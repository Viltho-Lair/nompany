# The plan's baseline: initial plan against actual

The owner, 03/10/2026, asked how a planner can "differentiate between an initial plan and
actual plan". The project planner now keeps a **baseline**: the plan as it was agreed, frozen.

## Three lines, one of them new

- **The current plan** is what the scheduling engine computes on every render, from durations
  and links. **Task dates are never stored**; they are derived.
- **The actual** is each task's own % complete, rolled up exactly as before.
- **The baseline** is a **snapshot of the current plan's computed dates** at the moment somebody
  sets it, stored in the plan document (`baseline` on `PlanDoc`,
  `src/components/planner/lib/schedule/baseline.ts`). Because dates are derived, a baseline has to
  be a snapshot: re-deriving it later would only re-derive today's plan.

## What it shows

The **Baseline** control sits in the planner toolbar.

- **Before one is set**, it explains what a baseline is and offers **Set baseline**.
- **Afterwards**, the button carries the verdict (ahead of plan / on plan / behind plan). The
  popover shows:
  - **Planned by today**: how much of the baselined work should be done by now. Each task is
    weighted by its baseline length (working hours, the weighting the engine's % complete uses)
    and is linear inside its own span. Milestones and summary rows carry no weight.
  - **Actually done**: the plan's rolled-up % complete.
  - **Schedule index**: actual ÷ planned, the projects' SPI arithmetic applied to a plan. Within
    two percentage points of the plan counts as on plan, so a plan is not called behind or ahead
    every morning. There is no index before anything was planned to start, rather than a division
    by nought.
  - **Finish slip**: how many days the plan's finish has moved since the baseline.
  - **Tasks added since**: counted, because the baseline cannot measure them.
- **On the chart**, a thin grey line under each bar shows where that task sat in the baseline. It
  can be hidden with "Show on chart".
- **In the inspector**, a task shows its baseline dates and its own slip (+N days in red, −N days in
  green).

**Re-baseline** replaces the baseline with today's plan, and **Clear** removes it. Both ask first,
because both change what "late" means for everybody reading the plan. A read-only reader sees the
figures and no buttons. Setting, replacing or clearing a baseline saves like any plan change.

`tests/planner-baseline.mjs` holds the arithmetic: freezing, planned % by a date, verdict and
index, finish slip, added tasks, and that a stored baseline is cleaned rather than trusted.

## Not built yet

- **One baseline per plan.** No history of earlier baselines and no named baselines ("as tendered",
  "as revised"). Re-baselining replaces it.
- **The projects list and earned value do not read it yet.** Earned value (`cost-codes.md`) still
  draws planned value as a straight line between the project's dates. The baseline is the curve
  that line was standing in for, and wiring it in is the next step.
- **Who set it is not recorded.** `setBy` exists on the baseline but the planner does not know the
  reader's CollaboratorID, so it is blank. When it was set is recorded.
- **Opened on screen 03/10/2026, and that found a bug.** Setting a baseline read correctly and was
  never SAVED: the planner's autosave watches a hand-written list of fields and the baseline was not
  on it, so it vanished on reload. Fixed, and `tests/planner-baseline.mjs` now refuses any field
  `planDoc` saves that the autosave does not watch. After the fix: set, saved, kept on reload, the
  verdict shown on the button and a grey line drawn under each task. The inspector row was not
  opened.
- **Deals have no plan at all.** This baseline is the project planner's. A deal's plan is the open
  study in `docs/progress.md`.
