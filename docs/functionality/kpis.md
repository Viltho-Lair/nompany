# KPIs — what a studio's work is judged on

**Rebuilt 03/10/2026 on the kinds of work** (`work-items.md`). Until then a KPI was declared in
/super against a service action and COPIED onto each deal when it opened. Service actions were
removed that day, and so was the copy. Live held no KPI declarations and no deal carried a copy,
so nothing had to move.

## Three pieces, owned by three people

| Piece | What it is | Who owns it | Where |
|---|---|---|---|
| **Measure** | A KPI with **no number**: "work orders done by their due date", "first delivery within … days of the project". | nompany | /super → ERP settings → KPI measures (`REG.kpiMeasures` over the built-ins in `modules/main/workKpis.ts`) |
| **Target** | The studio's own number for a measure, studio-wide, with an optional **override per deal flow**. Blank: not measured. | Each studio | Studio settings → KPI targets (`kpiTargets` on the studio record) |
| **Result** | Met, missed, under way, waiting or unknown — worked out from dates the records already keep. | Nobody types it | The deal page and the front door's "Work in hand" |

The owner's answers, 03/10/2026: /super keeps the list and each studio sets its numbers; measures
ship **without** numbers, so nompany never invents a target for a company; a changed target
**never re-judges** past work; and a studio-wide target can be **overridden per deal flow** (a
fit-out and a supply-only order need different delivery times in one company).

## Two kinds of question

**One piece of work** — a deal, a field job, a work order:

- **Reach a step within N days**, timed from when the work opened or **from another step**
  ("first delivery within 30 days of the project"). Before the starting step happens the result is
  **waiting**, not late.
- **Done by its own due date** — a job's scheduled end, a work order's due date. A deal and a
  counter sale have none, and the measure is refused for them.

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
| Deal | Quoted within … days of the enquiry · Contract within … days of the quotation · First delivery within … days of the project · First invoice within … days of the project · Share of deals quoted in time |
| Field job | Finished by its scheduled end · Share on time · Average days to finish |
| Work order | Started within … days · Done by its due date · Share on time · Average days to complete |
| Counter sale | Sales a day · Sales value a day |

The console can reword one or switch it off, and add its own; a built-in is never deleted, because
studios hold targets keyed by its id. **What a measure measures cannot change once it exists** —
only its words and whether it is offered — because targets were set for what it measured.

## How a deal gets its KPIs — matched on read, nothing stored on the deal

1. **By kind of work** — the studio's deal measures with a target.
2. **By the deal's flow** — a measure applies only if its steps are in the flow the deal walks
   (and the studio runs). A delivery KPI never appears on a deal whose flow has no delivery.
3. **By the target in force when the deal opened** — each target keeps dated versions
   (`nextVersions` appends, never edits), and `targetIn` reads the one in force at the deal's
   opening, the flow's override over the studio-wide number. A deal opened before any target was
   set is not measured.
4. **By the deal's own records** — each stage's first record (read with the stage cards) and the
   deal's opening.

A KPI is **absent** where the reader may not see the records of its step or its starting step —
rights AND the studio's switches, the rule every block on the deal page follows.

## Where they show

- **The deal page**, above the stage cards: each KPI's result, its name with the studio's number in
  it, and days left while it is under way.
- **"Work in hand"** on the front door: each lane's period KPIs for the current period, with the
  figure, the target and the result; and on each listed job or work order, **On target** or
  **Missed** once settled.

## It measures. It never blocks.

A missed target is amber text and nothing else. No transition is refused and no record held.

`tests/work-kpis-model.mjs` holds the arithmetic.

## Not built yet

- **Not opened on screen.** The database proxy was stopped when this landed, so the KPI targets
  panel, the /super measures list, the deal page block and the lane lines were checked by
  type-check, lint and the model tests only.
- **No period KPI on the deal lane.** It reads the newest 25 deals, and a period figure needs every
  deal's stage dates; deal KPIs show on each deal's page.
- **Each delivery is not judged separately.** "First delivery within …" times the first one; every
  delivery on time would need deliveries as their own kind of work.
- **A share uses its item measure's target in force when the period began**, not each item's own.
  For the built-ins (all on-time measures) there is no number to differ.
- **The per-flow override is for deals only** — only deals have flows — and period KPIs use the
  studio-wide number.
- **No KPI report in Reports & BI, and no notification when one is missed.**
- **The job and work order screens show no KPI mark yet**; only the front door does.
