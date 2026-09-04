# The pipeline — where a deal is, how long it has been there, and why it ended

**The screen:** `/<slug>/crm-sales-pipeline`, behind `crmSales.pipeline.view`.
**The deals on it are sales tickets.** There is no new record — see "What it stores".

## What it is

A **stage** is where a deal has got to. Eight of them, and all eight existed before this
feature did: `TICKET_STATUSES` in `src/modules/sales/tickets.ts` has carried Lead,
Opportunity and Commit since the beginning. What did not exist was anything that treated
them **as a pipeline** — an order, a distinction between live and finished, a rule about
which move is a lie, and any record of how long a deal has been sitting where it is.

Stages fall into **three kinds**, not two:

| Kind | Stages | On the board | In the forecast |
|---|---|---|---|
| open | Lead, Opportunity, Commit | a column | yes |
| paused | On-Hold | a column | **no** |
| closed | Closed Won, Closed Lost, Cancelled by Client, Dropped | summarised below | no |

**On-Hold is why there are three.** A held deal has not been lost and has not been won.
Calling it closed erases it from the pipeline; calling it open leaves it in the forecast at a
probability nobody has revisited since the day it stalled, which is how a forecast quietly
becomes fiction. Its column reports "Not forecast" rather than a number — zero would be a
claim about those deals rather than a refusal to guess at them.

The vocabulary and every rule about it live in `src/modules/sales/pipeline.ts`, which has
**no server import at all**. That is deliberate and asserted: the board validates a move with
the same `stageProblem` the server refuses it with, so the two cannot drift apart.

## What it stores

**No new collection and no new key builder.** The board reads `salesTickets` where they live,
the same arrangement Live view and the contracts register have; `crm-sales-pipeline` owns no
collection, so deleting the section takes no records with it.

Three fields on the ticket carry the pipeline, and **all three were already declared on
`SalesTicketSchema` and written by nothing at all**:

- `closedAt` — when the deal was decided.
- `lostReason` — why, for a losing close. Cleared on a win, so a deal dropped and later won
  cannot carry the old excuse.
- `stageHistory` — `{ status, at, byCollaboratorId }`, appended never rewritten, capped at
  200 like comments are. It is what makes "how long has this sat in Opportunity" answerable;
  a status string alone can never give that.

A field nothing can exercise is the record-level shape of invariant 16. Before this, a deal
closed and the studio could not say when or why.

## What it does

**A stage move is a transition, not an assignment.** `editTicket` used to accept any member
of `TICKET_STATUSES` straight from the payload. Four rules now stand between a request and
the row:

- **A closed deal cannot be reopened** (`already-closed`, HTTP 409). Dragging a Closed Won
  back to Lead does not correct a mistake — it deletes a win from every count already taken
  off it and leaves the ticket in a stage its own `closedAt` contradicts. Same reasoning as
  invariant 10: once the outside world has seen a fact, unseeing it is not an edit.
- **Commit and Closed Won need a quotation** (`no-quotation`). `tickets.ts` has said in prose
  since the beginning that the post-approval statuses are pickable "only after the quotation
  approval is complete"; nothing enforced it. Only those two — requiring a quotation to
  *abandon* a deal would strand every dead lead in the pipeline forever.
- **A losing close must say why** (`reason-required`). Closed Lost, Cancelled by Client and
  Dropped each demand a reason; a win does not, which is the whole asymmetry — the field
  exists to answer "why do we lose".
- **Moving a deal to the stage it is already in** changes nothing and is not an error.

**Every writer goes through one function.** `stagePatch` decides what a move writes, and
`editTicket` is not the only caller: raising the first RFQ moves a Lead to Opportunity, and
Technical turning an RFQ down closes the deal — both from `modules/technical`. If each
appended its own history entry, the one that forgot would leave a hole exactly where the
interesting move was. The chain's own moves are **not** put through `stageProblem`; the chain
doing its job is not a person picking a stage.

The chain's close stores a **token**, `rfq-rejected`, rather than a sentence: a sentence
written by the code would be English sitting in the database for an Arabic studio to read
verbatim. Statuses already translate on display keyed by a stored token, and this takes the
same answer. **A reason a person typed is data and is shown exactly as typed.**

**The write is a function patch** (invariant 8) whenever the stage moves, so the history is
appended to the row as it stands at write time. Two people closing the same deal in the same
second leave two entries rather than one overwriting the other. The *refusal* is judged on
the row as the person saw it; the *append* is a flip.

### The board

Columns in funnel order, each with its count, its total and its weighted total. Within a
column, **oldest first** — a board sorted newest-first buries the deal that has been stuck
for ninety days under the one raised this morning, which is precisely the deal a pipeline
review exists to find. A deal past 30 days in one stage is marked; a deadline in the past is
marked separately.

**Days-in-stage falls back** through `updatedAt` to `createdAt` for a ticket with no history.
Every ticket that exists today was written before `stageHistory` did, and a board that could
only read history would show nothing for every deal a live studio already has, on precisely
the day it is most worth reading. A ticket that has been in Lead since it was raised
genuinely has been, so the fallback is a fact rather than a guess. **No backfill is needed.**

Three figures above the board: open value, weighted value (value × probability, both fields
already on the ticket and nothing multiplied them), and win rate **over decided deals only** —
counting open deals in the denominator would make a studio's win rate fall every time it
raised a lead. A studio with nothing decided gets "—", not "0%", which would be a verdict.

**The read is two round trips, not six.** `listTickets` reads six collections because a
ticket row reports what happened to it downstream; a funnel does not.

### Who may do what

`crmSales.pipeline` carries **view and nothing else**. Moving a deal *is* editing the ticket:
it goes to `PUT /sales/tickets` and answers to `crmSales.tickets.edit`. A `pipeline.edit`
would be a second right over the same act, free to disagree with the first. The route hands
`canMove` to the screen, asked separately, because seeing a forecast and changing what is in
it are different powers — a finance reader may reasonably have the first alone.

**There is no pipeline write endpoint**, deliberately. A second door onto the same record
would be free to disagree about what a stage move may do, and the first thing to go would be
the refusal that a closed deal cannot be reopened.

**The move is a select, not drag-and-drop.** The board is bilingual and scrolls horizontally,
which is where drag implementations go wrong: a drop target computed in physical pixels
mirrors incorrectly under `dir="rtl"`, and it is unusable on a phone and invisible to a
keyboard. A move that can demand a reason reads better as a deliberate choice than a gesture.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No lead capture.** A deal still starts as a ticket somebody types. There is no web form,
  no inbound email parsing, no import, and no deduplication against existing clients.
- **No lost-reason vocabulary.** The reason is free text, so "price" and "too expensive" are
  two different answers and nothing can group them. The studio-settings list that would fix
  that is not built, and until it is, "why do we lose" is answerable one deal at a time
  rather than across the pipeline.
- **Nothing reports on the history.** `stageHistory` is written and shown only as
  days-in-stage. Average time per stage, conversion between stages, and a stage-by-stage
  funnel chart are all derivable from what is stored and none is drawn.
- **Probability is typed, never derived.** It does not move with the stage, and nothing warns
  when a Commit deal still says 10%.
- **No forecast period.** Weighted value is the whole open pipeline, not "this quarter" —
  there is no close-date field distinct from `deadline`, and no grouping by month.
- **No owner on the board.** A deal's `assignedToCollaboratorId` is not read here, so the
  board cannot be filtered or split by salesperson.
- **No stalled-deal notification.** The 30-day mark is drawn on the card and tells nobody.
- **A reason cannot be corrected.** `lostReason` is read only on a stage move, so a typo in
  one is permanent — there is no move left to make that would rewrite it, because the deal is
  closed and a closed deal cannot be reopened. Editing the reason alone is a write nothing
  offers today.
- **`closedAt` is not used for anything else** — not in reporting, not in the engagement
  layer, not on any dashboard.
- **The chain's automated moves are not shown as such.** A history entry made by the system
  carries an empty `byCollaboratorId`, and no screen distinguishes it from a person's move.
