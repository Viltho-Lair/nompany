# The tender register — what the studio is bidding, and what became of each

**The screen:** `/<slug>/tendering-register`, behind `tendering.tenders.view`.
**The rules:** `src/modules/tendering/stages.ts`, pure and shared with the screen.
**First of five.** The BOQ grid, bid documents, bid approval and the handover to Projects are
not built — see "Not built yet".

## What it is

Tendering & Estimating was declared at the fifteen-section restructure and rendered nothing:
it sat in `NO_SCREEN_YET` and held no permission area, because a right nothing can exercise is
a bug (invariant 16). This is its first screen and its first right.

A **tender** is an invitation to bid, recorded from the day the studio hears about it. It is
**not a deal**: a sales ticket is work a client has asked *this studio* for, while a tender is
work being competed for, usually against a fixed date, and most of them end in a decision not
to bid or in somebody else winning. Recording only the ones that turn into deals is how a
studio loses the ability to answer *"what are we bidding, what do we keep losing, and what did
we decide not to touch"*.

**Seven stages**, in three kinds:

| Kind | Stages | Meaning |
|---|---|---|
| open | Identified, Preparing | noticed, being worked on |
| submitted | Submitted | the bid is in, the outcome is not known |
| closed | Won, Lost, No Bid, Withdrawn | decided |

**Submitted is its own kind**, neither open nor decided, because it is the state a register
spends most of its time in and the two rules below both turn on it.

## What it stores

One new collection, `tenders`, owned by the `tendering-register` sub-section — so deleting the
section takes its rows with it (invariant 11). One new permission area, `tendering.tenders`,
with **view / create / edit / delete**.

`ref` comes from the **counter**, not from a count. `nextUniqueRef`'s own note says anything
with a delete path must number this way; otherwise deleting a tender hands the next one a
reference somebody has already quoted (invariant 10).

`issuer` is **free text and `clientId` is optional**, deliberately. The body issuing a tender
is frequently not a client yet — that is the point of bidding — so requiring a client record
first would mean inventing one for every authority whose portal the studio watches. When it
*is* a client, the pointer is there and the name is resolved live off that record, never
copied (Law 4).

`submittedAt`, `decidedAt`, `decisionReason` and `stageHistory` are written by the **stage
transition**, never by the form, so a date cannot disagree with the status it belongs to.

## What it does

**The register is sorted by deadline, not by entry date.** A tender is a date with work
attached; a register ordered by when somebody typed it in answers no question anybody has.
Undated tenders sink to the bottom — one with no closing date is not urgent, it is incomplete.

**Four rules stand between a request and the row:**

- **A tender cannot be won or lost unless it was submitted** (`not-submitted`). "Won" straight
  from "Preparing" reads as a win and means the bid was never sent; a studio would be counting
  victories in contests it did not enter.
- **A decided tender cannot be reopened** (`already-decided`) — the same reasoning a closed
  deal follows.
- **A submitted tender cannot become a No Bid** (`already-submitted`). After the bid has gone
  in the honest exit is Withdrawn, which says something different to whoever reads it later.
- **Losing, declining and withdrawing must say why** (`reason-required`). Winning need not,
  which is the asymmetry that makes the field mean something.

**Deleting is for a mistake, not for a decision.** Before submission a tender is only a note
that something exists, and a duplicate or misread notice should be removable. Once the bid has
gone in, the tender is a record of something the studio *did* — it is in a win rate, may be in
a report, and the other side has it. The service refuses (`already-submitted`) and the screen
hides the button, so the rule is learned without meeting a refusal.

**The clock comes from the server.** The list carries `asOf`, and every "days left" on the
screen is measured from that one instant — the screen never reads its own. Two rows a day
apart cannot then read the same because a render straddled midnight, and `daysToDeadline`
stays a function of its arguments, which is what makes the register assertable at all.

**A missed deadline is not "overdue".** A tender whose date has passed without a bid is *gone*
— it appears in no win rate and cannot be caught up — so it says **Missed**, in red. Calling
it late would suggest otherwise.

**The win rate counts contested tenders only.** A No Bid is a decision the studio made, not a
contest it lost, so counting it in the denominator would punish the register for being honest
about what it declined — and that is the entry it most wants recorded.

**The ladder is deliberately its own, not `modules/sales/pipeline`.** The program design has
P4a's sections hand-built "so P4b's abstraction is extracted from real screens" (D13): two
honest ladders written out are what tell the extraction which parts are genuinely common. They
are also not the same ladder — a deal is chased and may stall anywhere; a tender turns on
submission, which the pipeline has no concept of. Where they *do* agree is asserted in
`tests/tender-stages.mjs`, so the extraction has evidence rather than a guess.

## Rolling it out to a studio that already exists

**Run `scripts/migrate/plant-sections.mjs` BEFORE anybody uses the register, not after.**

`tendering-register` is a new sub-section. Sections are per-studio rows planted when a studio
is created, and `listSections` no longer reconciles on read — so a studio that existed before
this slice has the `tendering` root and no register beneath it. The script is the only thing
that puts it there (dry-run by default; `--apply` to write; idempotent).

**Why the order matters, and it is not obvious.** A sub-section FALLS BACK TO THE ROOT when it
is absent, which is what makes every module context safe — so the register keeps working
before the section is planted, and writes its tenders under the `tendering` root instead.
Planting afterwards moves `registerSection` to the new child, and those earlier rows are left
under the parent where nothing reads them. They are not deleted and not corrupted; they are
invisible.

Seen in the sandbox: three tenders created before planting, zero visible after. Their
references were NOT reissued to the next three (TND-0004 followed TND-0003), because the
counter only moves forward — invariant 10 doing its job on the one thing that would have made
the mess worse.

## Not built yet

Stated in words, because a silent gap reads as a finished feature. **Four of Tendering's five
subsections do not exist**, and the register is deliberately standalone until they do.

- **No BOQ grid and no rate library.** There is an `estimatedValue` somebody types and no
  estimate behind it: no bill of quantities, no line items, no rates, no build-up from cost.
  This is the section's largest missing piece.
- **No bid documents and no clarifications.** Nowhere to keep the tender documents, the
  addenda, or the questions and answers exchanged before submission.
- **No bid review or approval.** P2's approval engine exists and is wired to bills only; a bid
  going out at a price nobody senior signed is the gap.
- **No handover to Projects.** A won tender does not become a deal, a project or a budget
  baseline `sheet`. Today somebody re-enters it in CRM & Sales by hand, and nothing links the
  two records.
- **A tender is not an engagement.** It has no entry in the stage registry, so it does not
  appear on the engagements view and nothing cascades from it.
- **No documents, no comments, no notifications.** A deadline approaching tells nobody; the
  register has to be looked at.
- **No bid bond, no tender fee, no earnest money** — the money a tender requires up front is
  not modelled.
- **The owner is stored and never shown.** `assignedToCollaboratorId` is written by the API and
  the screen neither displays nor sets it.
- **No dashboard.** The four figures on the register are all there is; nothing trends, and
  nothing groups by issuer or by why bids are lost.
