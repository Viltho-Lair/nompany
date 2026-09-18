# Lifecycle & contracts

Somebody's EMPLOYMENT, as against the person. A sub-section of Human Resources
(`/<slug>/hr-lifecycle`), two collections — `employmentContracts` and
`lifecycleEvents` — and one permission area, `hr.lifecycle`, with `offboard` as an extra.

## What it is

HR could describe a **person** and could not describe their **employment**. There was a
`dateOfJoin` field and nothing else: no contract, no probation, no notice period, no leaving
date and no leaving reason. So `endOfService` — a full statutory award calculator, researched
per country and correct since 11/09/2026 — computed a settlement **nothing in the product
could ever trigger**, and payroll had no way to know that the person it was about to pay left
in March.

A right nothing can exercise is a bug (invariant 16). An arithmetic nothing can reach is the
same bug one layer down.

**Two records and one field**, which is the whole model:

| | What it is | Why |
|---|---|---|
| `employmentContracts` | One version of somebody's terms | Amended by SUPERSEDING, never edited — "what were they on in May" has to keep answering |
| `lifecycleEvents` | One thing that happened, append-only | Every move writes one; the history is what makes a state auditable |
| `employmentStatus` | The LIVE state, on the collaborator row | So payroll, leave and the roll do not each replay the event log |

The field could be derived from the events and deliberately is not. The plan's own rule is
that every transition writes an event *so no downstream subsection has to infer state*;
storing the answer is what keeps the inference out of every reader, and the events are what
make it checkable.

## The six states

`Onboarding → Probation → Active`, with `Suspended`, `Notice` and `Exited` off it.

- **Onboarding** — hired, paperwork running, not yet started.
- **Probation** — started, and either side may end it on the country's short notice.
- **Active** — confirmed.
- **Suspended** — still employed (so not Exited) and not at work (so not Active).
- **Notice** — leaving on a known day, and still owed pay until it.
- **Exited** — gone. The row stays; the employment is over.

**`EMPLOYED` and `AT_WORK` are named once**, in `modules/hr/lifecycle.ts`, because payroll,
leave and the headcount all ask the question and a `status === "Active"` test written inline
in three places gets it wrong in two directions: somebody on notice is still on the payroll,
and somebody being onboarded is already employed.

**An absent status reads as `Active`.** Every collaborator row in every live studio predates
this, and the truth about those people is that they work here — reading an empty field as
Onboarding would tell payroll to skip the whole company.

### The moves are data, not a switch statement

`MOVES` declares each move's `from` states exhaustively, so a state added to the ladder
without deciding what leads out of it fails the model test rather than stranding whoever is
sitting in it. A refusal carries the state it was refused FROM (`illegal-move` + `status`),
so the screen can say "they are already on notice" rather than "that did not work".

**Every move carries its own effective date.** A confirmation happens on the probation end
and an exit on the last working day, and both are routinely recorded days later.

## The contract

**An amendment is a new row**, naming the one it supersedes. `contractAt(contracts, id, day)`
answers what somebody was on at a date: the latest contract whose `startDate` is at or before
it. So an amendment signed in May and effective in June does not change what was in force in
May — which is the entire reason contracts are versioned rather than edited.

**Amending a row that has already been superseded is refused at the write**, so the chain can
never fork. Same rule the tender pack's revisions follow, and the same reason: a fork detected
afterwards has to be guessed at, a fork refused cannot exist.

**A fixed term must carry an end date and an open contract must not.** An end date on an
open-ended contract is a leaving date written in the wrong field; the exit records that, and
two answers to "when does this end" is one too many.

## The country pack

`modules/hr/packs/employment.ts` — probation, notice and which kinds of contract a country
recognises, **effective-dated**, per the owner's decision of 17/09/2026. **The versions
themselves are in the country files** (`rules.employment`, `official-values.md`) since
18/09/2026; this module holds the shape, the fallback and the date lookup.

**Why this is dated where the pay preset is not.** The pay preset (`rules.payPreset`) holds the PAY half as one
current figure per country with an `asOf` string nothing reads, and that is correct there:
nothing is used until the studio confirms it in Studio settings, so a stale figure is a bad
default rather than a wrong answer. Employment rules are **not** confirmed by hand — a
probation end is computed FROM a contract, months after it was signed, and the answer has to
be the rule in force on the contract's own start date. A single current figure cannot say
that, and the day a country changes its notice period, every historical contract silently
re-dates.

So `employmentPackFor(country, on)` takes the date it is being asked about, and a contract
signed under an older rule keeps answering by it. There is one version per country today;
the shape is what makes the second one a data change rather than a migration.

| | Probation | Notice | Notable |
|---|---|---|---|
| Jordan | 3 months (max 3) | 30 days | Labour Law arts. 23, 35 |
| Saudi Arabia | 3 months (max 180 days, in the contract) | **60 days from the employer, 30 from an employee who resigns** (since 19/02/2025; a flat 60 before) | Labour Law arts. 53, 75 |
| UAE | 6 months | 30 days (max 90), **14 in probation** | Decree-Law 33/2021 arts. 8, 9, 43 |

**The UAE offers no permanent contract**, because art. 8 abolished it — every contract there
is fixed-term. That is the difference that proves the pack is doing something: the refusal is
the country's, not the product's, and an Emirati studio is never offered a kind of contract
its own law does not recognise.

**Notice has a direction.** Saudi Arabia split it on 19/02/2025, and the pack held one
figure — so every Saudi resignation's settlement claimed thirty days of notice the employee
never owed. Found by the 18/09/2026 country research against code shipped the day before.
`noticeDaysFor` is now the one place the question is answered, for the notice move and the
settlement alike: probation's shortened notice first, then the employee-side figure for a
resignation where the country sets one, then the contract's own. The amendment is a **second
dated entry**, not an edit, so notice given before that date keeps the old flat sixty — and the
settlement judges notice by the rule in force when it was GIVEN, not on the last day.

**A country the product has not researched gets the fallback**, never one of the three.
Picking Jordan's rules for Kenya would be a confident wrong answer; the fallback says plainly
that the defaults are the product's and points the studio at its own Employment rules.

## The final settlement

Computed on read, and stored as a **snapshot on the exit event** — the way a payroll run
freezes its lines. The wage, the leave balance and the pack all move afterwards, and "what
were they actually paid on leaving" has to keep answering.

Four sources, **all of which already existed**: the end-of-service rule from the studio's
statutory settings, the wage from the pay record, the unused days from the leave balance, the
notice from the contract. Nothing new is stored to answer this; what was missing was anything
that could ask.

```
  end of service        the statutory award, reduced on resignation where a country reduces it
+ unused annual leave   at a day's pay
± notice not served     PAID to somebody dismissed, OWED BY somebody who walked out
− deductions            typed, because this product models no loans yet
```

**Notice in lieu has a sign, and that is the point.** When the employer ends it without
serving notice, the shortfall is paid to the employee; when the employee resigns and leaves
early, the same shortfall is owed the other way. A settlement that always added it would pay
somebody for the notice they failed to give.

**The DIRECTION is a separate field from the amount** (`noticeOwedBy`), because the two part
company at exactly nought. A screen reading the sign of the amount said "owed to them" on a
resignation wherever the wage was nought — an unpaid volunteer, or a pay record nobody had
entered yet. Found by opening the screen on a studio with no pay records; no test could have
caught it, because the arithmetic was right.

**A day's pay is a thirtieth of the monthly wage** — the divisor all three countries use.
Using the calendar month's own length would pay a February leaver more per day than a March
one on the same salary.

**Null rather than nought, and `complete` travels with the total.** No end-of-service RULE
(Jordan has none — the SSC covers it) is `null`, not a nought that reads as "owed nothing".
An unreadable leave balance is `null`, and `complete: false` says so — the BOQ's rule, for
the BOQ's reason: the sum of a part-known settlement is a number and is not the settlement.

**Retirement and death are not resignations.** Read as one, a thirty-year employee's award is
cut to two thirds for reaching pension age.

## Who may do what

`hr.lifecycle` is **scoped**, so a head of department reaches their own department and
everything under it (`subtreeIds`) and no further.

| | |
|---|---|
| `view` / `create` / `edit` | Read the employment, sign a contract, amend it, record a transfer or a promotion |
| `offboard` | Give notice, and end an employment |
| *no `delete`* | A contract is amended by superseding; an event is append-only. Deleting either destroys the history the versioning exists for |

**Ending somebody's job is its own power.** Recording a promotion and terminating an
employment are not the same act, which one area with one verb ladder could not express.

**And the settlement is a third question again.** An end-of-service award is a multiple of a
monthly wage — shown the award, a reader has been shown the wage. So computing or storing the
money needs `hr.employees.salary` (or payroll's own right); an offboarder without it records
the exit, the service years and the leave days with **no amounts at all**, and the screen says
why.

**`offboard` is seeded to nobody but the owner**, deliberately: seeding it would hand every
Operations Director in every new studio the power to end jobs in their department on the day
the studio is created. `tests/roles-model.mjs` counts it among the extras a studio grants by
hand.

## What reads it

**Payroll** (`payroll.md`) decides who is in a run from `employedBetween` rather than from the
pay record, pro-rates a part month across the whole slip, and freezes the list of who was left
out and why onto the run.

**Leave** (`leave.md`) stops an allowance accruing at the exit date, pro-rating the leaving
year the way the joining year was always pro-rated, and refuses leave that runs past somebody's
last day.

**The headcount** counts the employed, which it could not do before: every row counted, so a
studio's headcount only ever went up. Who has left is returned beside it rather than silently
dropped — a total that falls with no explanation is the kind of number people stop trusting.

**One function answers for all three.** Asked separately, they would part company the first
time any of them was touched, which is how a leaver ends up paid in full by one screen and
struck off by another.

## The rollout

**Existing studios get the sub-section on their next read** (`plantMissingSections`) and the
right on their next role read (`modules/people/catchUps.ts`, `hr-lifecycle-2026-09-17`):
whoever already holds `hr.employees` gains `hr.lifecycle` at the same verbs. `offboard` is
not handed out. No script, and none exists to run.

**Nobody's rows moved.** Attendance, pay records, payroll runs and leave are still filed
under the sections they were written to (`hr-employees` and the HR root) — see the note in
`keys.ts`. What moved is which nav entry each screen hangs off.

## Not built yet

- **No document is generated.** The plan's contract, offer letter, confirmation letter,
  warning letter and final-settlement statement are all documentation-system work; this
  stores the terms and computes the figures, and prints nothing.
- **No approval on any of it.** A contract is signed by whoever holds `create`, an exit
  booked by whoever holds `offboard`. There is no chain, no second signature and no
  invariant-7 separation on a settlement — unlike a bill, a bid or a requisition.
- **No clearance checklist**, so nothing across IT, Fleet or Assets is collected before
  somebody leaves, and no onboarding tasks are fanned out when they arrive.
- **No recruitment**, so nobody is converted from a candidate — a person still arrives by
  joining the studio and being approved.
- **A contract cannot agree a longer employee notice than the statute's.** A contract holds
  one notice figure, the employer's; a resigning Saudi employee is held to the statutory
  thirty days whatever the contract says. Giving the contract two figures is a shape change.
- **The settlement reads no loans**, because the product models none; `deductions` is typed.
- **Encashment is the ANNUAL balance at 1/30 of the monthly wage.** A studio counting leave in
  working days will want a different divisor, and no leave type is flagged encashable.
- **The settlement is not PAID by anything.** It is computed and snapshotted on the exit; no
  bill, no payroll run and no journal comes out of it, so somebody raises the payment by hand.
- **No suspension effect.** `Suspended` records the fact and stops nothing — not pay, not
  leave accrual, not attendance.
- **Three countries.** Everywhere else gets the fallback pack, and there is no loader, no
  upload and no per-entity attachment: a new country is a file in this repo.
- **One employment per person.** A rehire reuses the same collaborator row and clears the
  leaving fields; the history is in the events, but there is no second `Employment` record,
  so "their first spell here" cannot be queried as a thing of its own.
