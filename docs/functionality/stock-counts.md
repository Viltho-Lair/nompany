# Stock counts

**Where:** Inventory → Stock → **Counts** tab. **Code:** `src/modules/inventory/stockCounts.ts`
(pure, asserted by `tests/stock-count-model.mjs`), `stockCountService.ts`, the route
`/api/studios/<slug>/inventory/counts`, the screen `components/studio2/StockCountsPanel.tsx`.
Built 07/10/2026.

A count is what was found on the shelves, item by item, beside what the books say — and posting
it turns every difference into an ordinary **stock adjustment** (cause `count`, reason
"Count CNT-0001"), so one over the studio's adjustment limit **waits on the Approvals page**
exactly as a hand-typed adjustment does, and one that would take an item below nought is refused
the same way.

## How it works

- **Start a count.** A count (`CNT-0001`, the `stockCount` series in Master data → Numbering)
  opens with a line for every registered item, all blank, and an optional note (which store,
  who is counting).
- **Count.** Type what is on the shelf. **Blank means not counted** and is left alone; **0 means
  the shelf is empty** and writes the whole balance off. Save as you go — a count is walked over
  hours, and two people typing into one count each land their own lines (a function patch).
- **The difference shown is the one posting writes**: the same pure `countDifferences` runs on
  the screen and the server, against the live book figure.
- **The book figure is read when the count is posted,** not when it started — stock keeps moving
  while people walk the racks, and freezing it would post every sale made during the count twice.
- **Post.** Only counted lines that differ are adjusted. Each line records its outcome —
  *Adjusted*, *Waiting for approval* or *Refused* (with the reason) — on the count.
- **Posting is claimed first**: the status goes Counting → Posting in one function patch only one
  writer can win, so a double click cannot adjust a shelf twice. A crash part-way leaves the count
  at *Posting*, shown rather than hidden.
- **Cancel** a count nobody will post; nothing it recorded moved stock.

**No permission key of its own.** Reading answers to `inventory.stock.view`; counting and posting
to `inventory.stock.create` — the right `adjustStock` already asks.

**The Stocktakes register** (the engine type `stocktake`) still exists and still moves nothing:
it records that a count happened. The count that moves stock is this one, and the register's own
definition says so.

## Not built yet

- **No count by bin or by batch.** A count corrects an item's total; a shelf's or a lot's split is
  moved by hand afterwards.
- **No blind count.** The book figure is shown beside every line, so a counter can see what they
  are "meant" to find. A blind mode would hide it until posting.
- **No subset at the start.** A count lists every registered item; counting part of the store is
  leaving the rest blank. There is no "count only this category or this bin".
- **No recount or second counter.** One figure per line, whoever typed it last.
- **No link from an adjustment back to its count** beyond the reason text: the movement's
  `sourceType` stays `adjustment`.
- **No printable count sheet** to take to the racks.
