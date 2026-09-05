# The bill of quantities, and the rate library

**The bill:** `/<slug>/tendering-register/<tenderId>`, behind `tendering.tenders.view`.
**The library:** `/<slug>/tendering-rates`, behind `tendering.rates.view`.
**The arithmetic:** `src/modules/tendering/boq.ts`, pure and shared with the grid.

## What it is

A **bill of quantities** is the work named item by item, with a quantity and a unit, and a
**rate** the estimator supplies for each. The extension is quantity × rate; the bid is the sum.
Everything difficult about it is in that last sentence — which lines are priced, which are not,
and what the total therefore means.

A **rate library** is what the studio charges for a unit of work, kept between bids so the next
estimate does not re-invent a number somebody already worked out, and does not quietly
disagree with the last one.

Before this, a tender had `estimatedValue` — one number somebody typed — and nothing behind it.

## What it stores

Two new collections and one new permission area.

| Collection | Owned by | Holds |
|---|---|---|
| `boqItems` | `tendering-register` | one tender's priced lines |
| `tenderRates` | `tendering-rates` | the studio's rate library |

**`boqItems` is its own collection, not an array on the tender.** Quotation lines, invoice
lines and sheet rows are all nested arrays today, and the migration design names them *"the
arrays that grow without bound"* — the three it plans to promote to child tables. A bill is the
largest thing of that shape anybody will produce here, so it starts where those are going.

**`sortOrder` is the document's order**, not a sort key the screen picks. A bill is issued in
an order — preliminaries, substructure, frame — and an estimator checks it against the client's
own document line by line. Re-sorting it alphabetically destroys the only thing that makes that
check possible.

**`rate: 0` means unpriced, not free.** Everything below turns on that distinction.

## Who may do what

**The bill answers to `tendering.tenders`, and has no right of its own.** The bill *is* the
tender's content: whoever may read a tender may read what it is made of, and whoever may edit
one may price it. A separate right would be a second answer to "who works on this tender",
free to disagree with the first.

**The library is its own area, `tendering.rates`.** It is the *studio's* reference data rather
than any tender's, read by every estimator and maintained by few — and "may price a bid" and
"may change what the company charges" are genuinely different powers, which is exactly when an
area is worth minting. A reader with the tender right and not the rates right prices the bill
and is offered no library, rather than the library arriving because the same route fetched it.

Removing a *line* answers to `tendering.tenders.edit`, not `.delete`: editing the bill is not
erasing the tender, which has its own rule (refused once the bid is in).

## What it does

**The total always arrives beside the count of what is missing from it.** A bill of forty lines
with thirty-eight rates has a total; it is **not** the bid, and a figure carried into a
submission on that basis is how work is won below cost. `boqTotals` returns `complete`, true
only when every line carries a rate, and the screen says which of the two numbers it is showing
— per group as well as for the whole bill, so an estimator is told *where* to look.

**An empty bill is not a complete one.** A tender with no lines has not been estimated;
reporting it as fully priced would be the same lie the other way up.

**An unpriced line shows a dash, not `0.00`.** Nought is a price and that line has none.

**A rate is applied by copy.** Putting a library rate on a line copies the number and keeps
`rateId` beside it for provenance only. So:

- **editing a library rate reprices nothing** already written — it changes what the next bid
  starts from;
- **deleting a library row breaks no bill** — old lines keep their number and still total
  correctly;
- **typing over a library rate clears `rateId`**, because the number is no longer that row's
  and leaving the pointer would claim a provenance it does not have.

This is the same rule a quotation line already follows: a bill is a document somebody was
given, and re-reading it from today's library would rewrite what was bid last month.

**A code is unique case-insensitively.** The code is how an estimator finds a rate and how a
bill records which one it used; two rows for one code make both ambiguous.

**A line must belong to a tender that exists**, or a crafted request mints orphans no screen
shows and no cascade reaps.

**The grid is bespoke, deliberately.** The program design puts the BOQ grid on the short list
of screens the P4b engine is never to be stretched to cover — it is a spreadsheet somebody
works down for a day, not a record with a form.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **The bill does not update the tender's `estimatedValue`.** `valueFromBoq` exists and is
  tested, and nothing calls it: the register still shows the typed figure while the bill shows
  its own total. Two numbers for one tender is exactly the sort of drift this codebase argues
  against, and closing it is the next thing to do here.
- **No rate build-up.** A rate is a single number — there is no material / labour / plant /
  overhead composition behind it, no wastage or productivity factors, and so no way to see
  *why* a rate is what it is.
- **No cost behind the price.** The bill holds what the studio would charge and not what the
  work would cost, so there is no margin on a line, no margin on the bill, and nothing warns
  about bidding below cost — unlike the pricing slice in CRM & Sales, which does have both.
- **No import.** Tender documents arrive as spreadsheets and every line is typed in by hand.
  This is the largest practical gap: the vendor CSV importer in Inventory is the pattern.
- **No re-ordering in the grid.** `sortOrder` is stored and settable through the API; the
  screen appends and never moves a line.
- **No provisional sums, no prime cost sums, no dayworks, no contingency**, and no percentage
  additions (overhead, profit, preliminaries as a percentage) — every line is quantity × rate.
- **No units vocabulary.** Units are free text, so `m3`, `M3` and `cu.m` are three units.
- **No revisions.** A bill is edited in place: there is no record of what a line was priced at
  before, and no comparison between one revision and the next.
- **Nothing carries the bill onward.** A won tender's bill does not become a quotation, a
  project budget or a `sheet` — that is the handover slice, and it is not built.
