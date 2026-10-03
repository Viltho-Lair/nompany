# KPIs — what a deal's work is judged on

Nothing in the product could say whether a deal's work went well. This is the first
thing that measures.

**Service actions were removed on 03/10/2026** (the owner: they are gone from studios,
tickets and items). A KPI used to name the service action it measured; every
declaration now measures every deal, until KPIs are keyed to the work types
(`work-items.md`), which is the next piece of work.

## What a KPI is

A **declaration** kept in `/super` → ERP settings, and a **copy** of it that each deal
carries from the moment its work starts.

| Field | What it means |
|---|---|
| What | the sentence a person reads on the deal |
| Kind | `milestone` (done or not done) or `quantity` (how many) |
| Counted on | the stage the evidence lives in — a `STAGE_REGISTRY` type |
| Within | days from when the KPI started measuring. Blank = no clock, never late |
| How many | `quantity` only: the target |

**Two kinds, because two are what the records can answer.** A milestone carries **no
percentage** — there is no half-signed contract — and a quantity is the only thing
with one (`count / target`, capped at 1).

**Everything is counted off records the deal already carries.** There is no KPI field
on any record, nothing to key in, and no second definition of a figure the ERP
already holds. If a target cannot be counted from a deal's own records, it is not a
KPI here.

## Five states, and `unknown` is a real answer

`not-started` · `in-progress` · `met` · `missed` · `unknown`

`unknown` is a KPI naming a stage this product no longer has — a declaration edited
after the deal copied it. Reporting that as "not started" would read exactly like a
company behind on its work. Null is never drawn as 0%.

## It measures. It never blocks.

The flow's rule (`progress.ts`: it assists, it never blocks) is inherited whole. A
missed target is amber text and nothing else — no transition is refused, no record
held, no banner arguing with how a company runs its work.

## Where a deal's KPIs come from

`freezeKpis`, at the one place a deal is minted (`applyAsDeal`), beside
`freezeTemplate`:

- every declaration, once each, whichever record opened the deal;
- a second freeze adds only what the deal does not already carry, and what it carries
  keeps its own `startedAt`, so no clock restarts.
- A declaration or a deal's copy stored before 03/10/2026 may still carry `action` (and
  the copy `source`); nothing reads either, and `kpisForDeal` does not copy them on.
  `scripts/migrate/remove-service-actions.mjs` clears them.

**Copied, never looked up.** Editing a declaration re-judges nothing already under
way, and withdrawing one leaves every deal carrying it measuring as before — what
stops is new deals taking it on. Same rule as a BOQ rate, for the same reason.

## Who sees one

A KPI whose records the reader may not open is **absent** — not zeroed, not greyed.
`visibleStageTypes` is the filter, which is two questions at once: may this reader
open the record, and does this studio still run that department. A count is evidence
that records exist, so "0 of 3 site visits" shown to somebody refused site visits
tells them precisely what the refusal was for; and a target on a switched-off
department is a target for work nobody there does.

## Where it appears

On the deal (`/<slug>/engagements/<id>`), above the stage cards and below the next
step: a target is read with the deal's progress, not filed under it. A deal
measuring nothing says so in words, because a deal measuring nothing and a deal
measuring nothing *well* look identical otherwise.

## KPIs on kinds of work — the arithmetic (03/10/2026)

`modules/main/workKpis.ts`, pure, and **not wired to anything yet**: no declaration is stored,
no screen shows one. It is the step before the declaration and the screens, built first so they
have nothing to invent.

- **What a piece of work is, for measuring** (`WorkFacts`), built only from dates its own record
  keeps: a work order's created, started, completed and closed stamps and its step history (the
  FIRST time a step was reached counts); a job's creation, scheduled end and completion (it keeps
  no start, so "in progress" is never invented); a deal's first record of each stage; a receipt's
  time and total.
- **Per item** — one deal, job or work order: `reach` (a step within N days of opening) and
  `onTime` (done by the record's own due date; a deal and a counter sale have none, and are
  refused). **A late step is MISSED even once it happens** — unlike a deal milestone, which asks
  "was it done"; these ask "was it done in time". No due date is `unknown`, never late, and
  cancelled work is not judged.
- **Per period** — the company over `[from, to)`: `count` and `value` of what OPENED in it, and
  `share` (of a per-item KPI) and `avgDays` (a ceiling) of what FINISHED in it. A total short of
  target while the period runs is in progress, not missed. Nothing finished is null, not 0.
- **Refused at the door** (`workKpiProblems`): a step the kind of work does not have, a due-date
  KPI on work with no due date, a share above 1, a share of a missing, period or other-type KPI,
  money on anything but a counter sale.

`tests/work-kpis-model.mjs` holds it.

## Not built yet

- **Stage-to-stage durations** ("commissioned within 14 days of delivery"). The
  engagement view hands over which stages a deal has, not when each arrived, so this
  would mean reading every record of every stage on every deal read. The time
  dimension today is `Within`, measured from when the KPI started.
- **Studio overrides.** Declarations are platform-level only; a studio cannot set its
  own target for an action, nor add one of its own.
- **KPIs anywhere but the deal.** No dashboard widget, no report dataset, no list
  column, nothing in Reports & BI, and no notification when one is missed.
- **Campaigns, projects and quotations do not carry their own.** They are measured
  only through the deal they belong to, so a campaign that precedes a deal is
  measured by nothing.
- **No seeded declarations.** The list starts empty and the owner fills it —
  shipping twenty plausible targets would be twenty numbers this product invented,
  presented to studios as their own.
- **Nothing warns when a declaration is withdrawn or edited** while deals are
  carrying it.
