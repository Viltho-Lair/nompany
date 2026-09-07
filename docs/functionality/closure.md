# Closing out — the punch list, practical completion, and the support clock

**Where:** `/<slug>/projects-list/<id>/closure`, behind `projects.list`.
**The arithmetic:** `src/modules/projects/closureModel.ts`.
**The service:** `closure.ts`. **The route:**
`/api/studios/<slug>/projects/closure`.

## It adds no permission key

Closure **is** a project's content, the way a variation is a contract's. Recording practical
completion is running the job, so every act here answers to `projects.list` — a second right
over the same act would be free to disagree with the first about who runs a project.
Catalogue stays at 177.

## The punch list is not a new record

`inspections` has carried a `snag` kind since it was written — *"a defect found after the
fact, raised to be fixed"* — which is exactly what a punch list is made of. A second
collection of defects would be **two lists of the same snags**, free to disagree the first
time either was edited. This reads the inspections and stores nothing.

**A snag is open until it passes.** `pending` is the state an inspection is *raised* in and
`fail` is a defect checked and still wrong, so both are outstanding.
**`pass-with-comments` closes it** — the comment is on record and the gate is through, which
is precisely the distinction `INSPECTION_RESULTS` was given two values to draw.

**The list travels, not just the count.** A screen that says "three open" and cannot say which
three sends somebody to another screen, and the whole point of a punch list is the list.

## Closure is not a stage

`PROJECT_STAGES` is a **default** a studio may replace — `listProjects` falls back to it only
when the studio has none — so a rule hung on the word "Completed" would silently stop applying
to any studio that renamed its columns. Closure is its own dates on the project, and they mean
the same thing whatever a studio calls its stages.

| Date | What it is |
|---|---|
| `practicalCompletionAt` | The day the works became usable. **Gates closing.** |
| `handoverAt` | The day it was handed over. **The support clock runs from here.** |
| `finalAccountAt` | When the final account was agreed. Recorded; gates nothing. |
| `closedAt` | Set once, by `closeProject`, and never unset. |

## The support period already existed

`supportPeriodDays` has been on `ProjectSchema` since before this slice — a studio-level
default of 365, editable per project — and **nothing had ever read it**. It was stored, shown
in a form, and computed into no answer at all. The tracker consumes it.

**No `warrantyMonths` was minted beside it.** `ProjectSchema` also carries
`retentionReleaseDate`, whose own comment already calls itself "the defects-liability end".
Two names for one idea disagree the first time either is edited, and there would have been
three.

**It is measured from handover**, because that is what its own comment says it measures. A
defects liability period in a construction contract conventionally runs from **practical
completion** instead, which is a real difference — recorded here rather than fixed by silently
re-basing a number every existing project already stores.

**Null rather than a guessed date.** With no handover there is no end date: the clock has not
started, which is not the same as it having run out, and defaulting to today-plus-a-year would
invent a date nobody agreed. A **deliberate nought** is its own answer — this job carries no
support period — and different from silence.

The warning window is **60 days**, because a support period ending is something somebody has
to act on (a final inspection, a retention release) and a month is not enough notice to arrange
either.

## What stops a project closing

Two blockers, and they are returned **as a list** rather than as a bare refusal: a screen told
"cannot close" without being told why sends somebody hunting through the record.

- `no-practical-completion` — the works are not recorded as complete.
- `open-snags` — **the reason the punch list matters.** A job closed over open defects is a job
  whose remaining work has just been deleted from the only place it was written down.

**Closing is its own act**, never a date written through the edit path — a final state
reachable by a generic write is the shape that let a rejected change order approve itself. And
**a closed project does not reopen**: `closureProblem` refuses every later write once
`closedAt` is set, because closing is a statement about the job's whole life and un-saying it
quietly is how a support period restarts without anybody deciding to restart it.

**Handover cannot predate practical completion.** Handing over works that are not complete is a
different event with a different name, and stored that way round the support clock would sit
behind the handover.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing raises a snag from this screen.** The punch list is read-only here; snags are
  raised and answered in the inspections register, so clearing one means going somewhere else.
- **Closing does nothing else.** It sets a date and a signature and changes no stage, releases
  no retention, notifies nobody and closes no engagement. The word is honest — it records that
  the job is closed — but it is not a workflow.
- **No warranty claim record.** A defect found *during* the support period is an ordinary snag
  with nothing marking it as a warranty call, so "what did this job cost us after handover"
  cannot be asked.
- **Nothing warns before the support period ends.** `expiring` is computed and shown on this
  screen only; no notification and no dashboard tile surfaces it, so somebody has to open the
  project to find out.
- **The retention release date is not joined to this.** `retentionReleaseDate` calls itself the
  defects-liability end and lives on the same record, and the two dates are shown on different
  screens with nothing reconciling them.
- **No final-account arithmetic.** `finalAccountAt` is a date; nothing compares the final
  account to the contract value, the variations or the certified total.
