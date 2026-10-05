# KPIs — what a studio's work is judged on

**Rebuilt 03/10/2026 on the kinds of work** (`work-items.md`). Until then a KPI was declared in
/super against a service action and COPIED onto each deal when it opened. Service actions were
removed that day, and so was the copy. Live held no KPI declarations and no deal carried a copy,
so nothing had to move.

**A DEAL IS NOT MEASURED HERE SINCE 05/10/2026.** Its targets are its flow's own steps, which the
studio sets on Deals → Flows (`flows.md`). The owner: a deal measure declared in /super and
numbered on another screen, over a flow an industry table chose, was *"two different places with
two different people controlling the flow, I should run nompany not the flow."* What follows is
field jobs, work orders and counter sales.

## Three pieces, owned by three people

| Piece | What it is | Who owns it | Where |
|---|---|---|---|
| **Measure** | A KPI with **no number**: "work orders done by their due date". Never a deal. | nompany | /super → ERP settings → KPI measures (`REG.kpiMeasures` over the built-ins in `modules/main/workKpis.ts`) |
| **Target** | The studio's own number for a measure. Blank: not measured. | Each studio | Studio settings → KPI targets (`kpiTargets` on the studio record) |
| **Result** | Met, missed, under way, waiting or unknown — worked out from dates the records already keep. | Nobody types it | The front door's "Work in hand" |

The owner's answers, 03/10/2026: /super keeps the list and each studio sets its numbers; measures
ship **without** numbers, so nompany never invents a target for a company; a changed target
**never re-judges** past work. (A per-deal-flow override followed; it went with the deal measures
on 05/10/2026 — a flow needing different numbers now simply has them on its own steps.)

## Two kinds of question

**One piece of work** — a field job, a work order:

- **Reach a step within N days**, timed from when the work opened or **from another step**.
  Before the starting step happens the result is **waiting**, not late. (A deal's step targets are
  this same question, judged by the same `judgeItem`.)
- **Done by its own due date** — a job's scheduled end, a work order's due date. A counter sale
  has none, and the measure is refused for it.

**A late step is MISSED even once it happens** — the question is "was it done in time".
Cancelled work is not judged. No due date, or a step the record keeps no time for (a job keeps no
start time), is **unknown**, never late.

**The company over a period** — today, this week or this month, on the studio's own clock:

- **How many** and **how much money** (counter sales only) count work that **opened** in the period;
- **share that met a per-item measure** ("90% of work orders on time") and **average days to
  finish** (a ceiling: fewer is better) count work that **finished** in it.

Short of target while the period is still running is **under way**, not missed. A period with
nothing finished has **no figure**, never 0%.

## Built-in measures

| Kind of work | Measures |
|---|---|
| Field job | Finished by its scheduled end · Share on time · Average days to finish |
| Work order | Started within … days · Done by its due date · Share on time · Average days to complete |
| Counter sale | Sales a day · Sales value a day |

The console can reword one or switch it off, and add its own; a built-in is never deleted, because
studios hold targets keyed by its id. **What a measure measures cannot change once it exists** —
only its words and whether it is offered — because targets were set for what it measured.

## Where they show

- **The deal page** shows its flow's step targets the same way (`flows.md`).
- **"Work in hand"** on the front door: each lane's period KPIs for the current period, with the
  figure, the target and the result; and on each listed job or work order, **On target** or
  **Missed** once settled.

## It measures. It never blocks.

A missed target is amber text and nothing else. No transition is refused and no record held.

`tests/work-kpis-model.mjs` holds the arithmetic.

## Not built yet

- **A deal measure or a per-flow number stored before 05/10/2026 is left in place and read by
  nothing** (`mergeMeasures` drops a stored deal measure; `targetIn` ignores `byFlow`).
- **Opened in the sandbox 03/10/2026**, and it found one flaw, fixed: a period was scored at the
  target in force when it BEGAN, so a target set mid-month showed nothing until next month. Seen
  working then: the /super list, a target saved from Studio settings, a share typed as 90
  refused, and the lane lines on the front door. Not seen: a settled On target / Missed mark (the
  sandbox has no work orders or jobs with due dates). The 05/10/2026 removal of deals from this
  screen and from /super has not been opened yet.
- **No period figure for deals.** The deal lane reads the newest 25 deals; the Flows tab counts
  late and in-time deals per step instead (`flows.md`).
- **A period is scored against the target in force now** (a finished one, when it ended); a share uses its item measure's target at that moment, not each item's own.
  For the built-ins (all on-time measures) there is no number to differ.
- **No KPI report in Reports & BI, and no notification when one is missed.**
- **The job and work order screens show no KPI mark yet**; only the front door does.
