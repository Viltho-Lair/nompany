# Expediting — what is late, and who has been chased

**Where:** `/<slug>/procurement-expediting`, behind `procurement.expediting`.
**The arithmetic:** `src/modules/procurement/expediting.ts` — pure, no imports.
**The service:** `chase.ts`. **The route:** `/api/studios/<slug>/procurement/expediting`.
**The record:** none of its own — it reads `materialOrders` and appends to them.

## The gap it closes

A purchase order has carried `expectedAt` since it was built and **nothing has ever compared
it to today.** An order three weeks late looked exactly like one placed this morning: same
row, same status, no signal anywhere. So "what is overdue" was a question a studio answered by
opening every order in turn, and "have we chased them yet" had no answer at all.

## The decision the whole slice turns on

**The original promise must survive the second one.** When a supplier re-promises, overwriting
`expectedAt` erases the fact that they slipped — and that fact is the entire input to supplier
qualification and rating, this section's fifth bullet.

So `expectedAt` is what was promised when the order was **placed** and is never written again.
`promisedAt` carries the current promise. `slippedDays` is the arithmetic between them. A
supplier who has re-promised four times is visible; one whose date was simply overwritten four
times is indistinguishable from one who was always on time.

**Lateness is measured against the promise in force**, not the original — a supplier who
re-promised and then met the new date is not three weeks late. Both numbers are on screen.

## Who may do what

**`procurement.expediting`, with `view` and `edit` and nothing else.** This screen owns no
record: it reads purchase orders, which live in Inventory and are raised there, and appends a
chase to one. There is nothing to create and nothing to delete. Catalogue 164 → 166.

On the **buyer** archetype at `edit`, beside suppliers, requisitions and RFQs.

## What it does

**Only outstanding orders appear.** `Draft` was never placed, `Cancelled` was withdrawn, and
`Received` has arrived — chasing any of the three is chasing nothing, and the service refuses a
chase against them by name rather than silently recording a call that cannot have happened.

**Each order names its supplier.** The list sends a `vendorNames` map read from the register;
until 11/09/2026 every row read "Supplier: " and an internal id.

**Four buckets, and the fourth is the one usually missed.** Late, due soon, on track — and
**undated**, for an order nobody ever promised a date for. That is a different problem from a
promise being kept, and folding it into "on track" would hide it in the healthy column.
`lateDays` is null there rather than a fabricated zero.

**`lateDays` is signed**, so one comparison sorts "three weeks late" above "due tomorrow"
without a second field, and undated sorts last.

**Partly delivered is kept distinct from untouched.** An order 90% delivered and three weeks
late is a conversation about the remainder; one untouched and three weeks late is a
conversation about whether it is coming at all. Sorting both under "overdue" hides which is
which. Over-delivery floors at nothing outstanding — the excess is a stock question, not an
expediting one.

**`unchased` is the number the screen exists to make zero:** late and *never* rung about. Not
"not chased recently" — a studio that has rung once about a three-week delay has done
something, and lumping it with one that has rung about nothing makes the figure unusable.
Everything else on this screen is the supplier's problem; that one is the studio's, which is
why it is a tile rather than a column.

**A chase that says nothing and moves nothing is refused.** Somebody who rang and got no answer
should write that down; a blank row inflates a count the screen asks people to act on.

**A chase with no new date leaves the promise where it was.** "We rang and they did not commit"
must not silently un-date the order.

**Chases append under a function patch** (invariant 8), so two people chasing the same order at
once are both recorded rather than one overwriting the other.

**The last chase is the latest by date, not the last in the array** — a chase typed in out of
order must not make the record look staler than it is.

**Days are counted in UTC.** A studio in Amman and a server elsewhere must agree about whether
something is one day late or two.

**The clock is passed in, never read in the model or the screen**, so the same request cannot
disagree with itself about what is overdue.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing is sent.** A chase is a note that somebody rang; no email or reminder leaves the
  product, and nothing prompts you that an order has gone another week without contact.
- **No supplier rating.** `slippedDays` and the chase counts are the raw material for it and
  nothing aggregates them per supplier yet. That is the section's fifth bullet.
- **`vendorId` shows as an id, not a name.** The expediting view does not resolve the supplier
  register, so a deleted vendor leaves an id that resolves to nothing.
- **No line-level expediting.** Lateness and the outstanding fraction are whole-order; an order
  where one line of six is holding everything up cannot say so.
- **"Due soon" is a query parameter, not a studio setting.** It defaults to seven days and the
  screen does not yet offer a control to change it.
- **No link to the RFQ or requisition behind the order.** The chain exists in the data —
  `requisitionId` is on the order — and this screen does not follow it.
